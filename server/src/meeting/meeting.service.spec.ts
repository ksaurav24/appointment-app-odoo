import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MeetingService } from './meeting.service';
import { MeetingTokenService } from './meeting-token.service';

const APPT_ID = 42n;
const APPT_PUBLIC_ID = 'appt_public_abc123';
const ORGANISER_ID = 'organiser-uuid';
const CONFIRMATION_CODE = 'ABC-XYZ-123';

const NOW = new Date('2026-05-05T12:00:00.000Z');

function makeAppointment(overrides: Record<string, unknown> = {}) {
  // Default placement: NOW sits 5 min into a 30-min appointment, so the join
  // window (-10 / +30) is comfortably open from every direction.
  return {
    id: APPT_ID,
    publicId: APPT_PUBLIC_ID,
    confirmationCode: CONFIRMATION_CODE,
    status: AppointmentStatus.CONFIRMED,
    startTime: new Date(NOW.getTime() - 5 * 60_000),
    endTime: new Date(NOW.getTime() + 25 * 60_000),
    appointmentType: { isOnline: true },
    organization: { organiserId: ORGANISER_ID },
    ...overrides,
  };
}

function makePrisma(appointment: unknown): {
  service: PrismaService;
  findUnique: jest.Mock;
} {
  const findUnique = jest.fn().mockResolvedValue(appointment);
  const service = {
    appointment: { findUnique },
  } as unknown as PrismaService;
  return { service, findUnique };
}

function makeConfig(env: Record<string, unknown> = {}): ConfigService {
  const merged = {
    MEETING_JWT_SECRET: 'test-secret-1234567890abcdef',
    MEETING_JOIN_BEFORE_MINS: 10,
    MEETING_JOIN_AFTER_MINS: 30,
    APP_BASE_URL: 'https://example.test',
    ...env,
  } as Record<string, unknown>;
  return {
    get: jest.fn((key: string) => merged[key]),
  } as unknown as ConfigService;
}

interface MockTokenService {
  service: MeetingTokenService;
  sign: jest.Mock;
  verify: jest.Mock;
}

function makeTokenService(): MockTokenService {
  const sign = jest.fn().mockReturnValue({
    token: 'signed.token.value',
    expiresAt: new Date(NOW.getTime() + 5 * 60_000),
  });
  const verify = jest.fn();
  const service = { sign, verify } as unknown as MeetingTokenService;
  return { service, sign, verify };
}

function makeService(opts: {
  appointment?: unknown;
  config?: Record<string, unknown>;
}) {
  const prisma = makePrisma(
    opts.appointment === undefined ? makeAppointment() : opts.appointment,
  );
  const config = makeConfig(opts.config);
  const token = makeTokenService();
  const svc = new MeetingService(prisma.service, token.service, config);
  return { svc, prisma, config, token };
}

describe('MeetingService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('assertJoinable', () => {
    it('throws NotFoundException when appointment is missing', async () => {
      const { svc, prisma } = makeService({ appointment: null });
      await expect(
        svc.assertJoinable(APPT_PUBLIC_ID, {
          role: 'HOST',
          userId: ORGANISER_ID,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { publicId: APPT_PUBLIC_ID } }),
      );
    });

    it('throws ForbiddenException when appointment type is not online', async () => {
      const { svc } = makeService({
        appointment: makeAppointment({ appointmentType: { isOnline: false } }),
      });
      await expect(
        svc.assertJoinable(APPT_PUBLIC_ID, {
          role: 'HOST',
          userId: ORGANISER_ID,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it.each([
      AppointmentStatus.CANCELLED,
      AppointmentStatus.COMPLETED,
      AppointmentStatus.NO_SHOW,
    ])('throws ForbiddenException when status is %s', async (status) => {
      const { svc } = makeService({
        appointment: makeAppointment({ status }),
      });
      await expect(
        svc.assertJoinable(APPT_PUBLIC_ID, {
          role: 'HOST',
          userId: ORGANISER_ID,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException when called too early', async () => {
      // Appointment starts in 30 min, join window opens 10 min before — so 30
      // minutes ahead of NOW is outside the join window (need <= 10 min away).
      const { svc } = makeService({
        appointment: makeAppointment({
          startTime: new Date(NOW.getTime() + 60 * 60_000),
          endTime: new Date(NOW.getTime() + 90 * 60_000),
        }),
      });
      await expect(
        svc.assertJoinable(APPT_PUBLIC_ID, {
          role: 'HOST',
          userId: ORGANISER_ID,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException when called after the close window', async () => {
      const { svc } = makeService({
        appointment: makeAppointment({
          startTime: new Date(NOW.getTime() - 90 * 60_000),
          endTime: new Date(NOW.getTime() - 60 * 60_000),
        }),
      });
      await expect(
        svc.assertJoinable(APPT_PUBLIC_ID, {
          role: 'HOST',
          userId: ORGANISER_ID,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException for HOST with wrong user id', async () => {
      const { svc } = makeService({});
      await expect(
        svc.assertJoinable(APPT_PUBLIC_ID, {
          role: 'HOST',
          userId: 'someone-else',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException for GUEST with wrong confirmation code', async () => {
      const { svc } = makeService({});
      await expect(
        svc.assertJoinable(APPT_PUBLIC_ID, {
          role: 'GUEST',
          confirmationCode: 'WRONG-LEN-CODE-X',
        }),
      ).rejects.toMatchObject({
        message: 'Invalid appointment or confirmation code',
      });
    });

    // GUEST failure paths must all surface the same opaque error to prevent
    // unauthenticated enumeration of appointment existence / status / window.
    describe('GUEST opaque failure responses', () => {
      const GUEST_MSG = 'Invalid appointment or confirmation code';
      const guest = {
        role: 'GUEST' as const,
        confirmationCode: CONFIRMATION_CODE,
      };

      it('collapses missing appointment to the generic message', async () => {
        const { svc } = makeService({ appointment: null });
        await expect(svc.assertJoinable(APPT_PUBLIC_ID, guest)).rejects.toEqual(
          expect.objectContaining({ message: GUEST_MSG }),
        );
        await expect(
          svc.assertJoinable(APPT_PUBLIC_ID, guest),
        ).rejects.toBeInstanceOf(ForbiddenException);
      });

      it('collapses non-online appointment type to the generic message', async () => {
        const { svc } = makeService({
          appointment: makeAppointment({
            appointmentType: { isOnline: false },
          }),
        });
        await expect(svc.assertJoinable(APPT_PUBLIC_ID, guest)).rejects.toEqual(
          expect.objectContaining({ message: GUEST_MSG }),
        );
      });

      it.each([
        AppointmentStatus.CANCELLED,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
      ])(
        'collapses non-joinable status %s to the generic message',
        async (status) => {
          const { svc } = makeService({
            appointment: makeAppointment({ status }),
          });
          await expect(
            svc.assertJoinable(APPT_PUBLIC_ID, guest),
          ).rejects.toEqual(expect.objectContaining({ message: GUEST_MSG }));
        },
      );

      it('collapses outside-window (early) to the generic message', async () => {
        const { svc } = makeService({
          appointment: makeAppointment({
            startTime: new Date(NOW.getTime() + 60 * 60_000),
            endTime: new Date(NOW.getTime() + 90 * 60_000),
          }),
        });
        await expect(svc.assertJoinable(APPT_PUBLIC_ID, guest)).rejects.toEqual(
          expect.objectContaining({ message: GUEST_MSG }),
        );
      });

      it('collapses outside-window (late) to the generic message', async () => {
        const { svc } = makeService({
          appointment: makeAppointment({
            startTime: new Date(NOW.getTime() - 90 * 60_000),
            endTime: new Date(NOW.getTime() - 60 * 60_000),
          }),
        });
        await expect(svc.assertJoinable(APPT_PUBLIC_ID, guest)).rejects.toEqual(
          expect.objectContaining({ message: GUEST_MSG }),
        );
      });
    });

    describe('confirmation-code constant-time compare', () => {
      it('rejects same-length but different content without throwing TypeError', async () => {
        const { svc } = makeService({});
        const wrongSameLen = CONFIRMATION_CODE.split('').reverse().join('');
        expect(wrongSameLen.length).toBe(CONFIRMATION_CODE.length);
        await expect(
          svc.assertJoinable(APPT_PUBLIC_ID, {
            role: 'GUEST',
            confirmationCode: wrongSameLen,
          }),
        ).rejects.toBeInstanceOf(ForbiddenException);
      });

      it('rejects different-length input without throwing TypeError', async () => {
        const { svc } = makeService({});
        await expect(
          svc.assertJoinable(APPT_PUBLIC_ID, {
            role: 'GUEST',
            confirmationCode: 'short',
          }),
        ).rejects.toBeInstanceOf(ForbiddenException);
        await expect(
          svc.assertJoinable(APPT_PUBLIC_ID, {
            role: 'GUEST',
            confirmationCode: CONFIRMATION_CODE + 'extra-suffix',
          }),
        ).rejects.toBeInstanceOf(ForbiddenException);
      });
    });

    it('returns the appointment for a HOST happy path', async () => {
      const { svc } = makeService({});
      const result = await svc.assertJoinable(APPT_PUBLIC_ID, {
        role: 'HOST',
        userId: ORGANISER_ID,
      });
      expect(result.id).toBe(APPT_ID);
    });

    it('returns the appointment for a GUEST happy path', async () => {
      const { svc } = makeService({});
      const result = await svc.assertJoinable(APPT_PUBLIC_ID, {
        role: 'GUEST',
        confirmationCode: CONFIRMATION_CODE,
      });
      expect(result.id).toBe(APPT_ID);
    });
  });

  describe('issueToken', () => {
    it('returns a HOST token response with stringified appointment id', async () => {
      const { svc, token } = makeService({});
      const result = await svc.issueToken(APPT_PUBLIC_ID, {
        role: 'HOST',
        userId: ORGANISER_ID,
      });
      expect(result.role).toBe('HOST');
      expect(result.appointmentId).toBe(APPT_PUBLIC_ID);
      expect(result.token).toBe('signed.token.value');
      expect(result.iceServers.length).toBeGreaterThan(0);
      expect(token.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          appointmentId: APPT_PUBLIC_ID,
          role: 'HOST',
          userId: ORGANISER_ID,
        }),
      );
    });

    it('returns a GUEST token response when confirmation code matches', async () => {
      const { svc, token } = makeService({});
      const result = await svc.issueToken(APPT_PUBLIC_ID, {
        role: 'GUEST',
        confirmationCode: CONFIRMATION_CODE,
      });
      expect(result.role).toBe('GUEST');
      expect(token.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          appointmentId: APPT_PUBLIC_ID,
          role: 'GUEST',
          confirmationCode: CONFIRMATION_CODE,
        }),
      );
    });
  });

  describe('getIceServers', () => {
    it('returns only the public STUN server when TURN is not configured', () => {
      const { svc } = makeService({});
      const ice = svc.getIceServers();
      expect(ice).toEqual([{ urls: 'stun:stun.l.google.com:19302' }]);
    });

    it('appends a TURN entry when TURN_URL is set', () => {
      const { svc } = makeService({
        config: {
          TURN_URL: 'turn:turn.example.com:3478',
          TURN_USERNAME: 'turn-user',
          TURN_CREDENTIAL: 'turn-pass',
        },
      });
      const ice = svc.getIceServers();
      expect(ice).toHaveLength(2);
      expect(ice[1]).toEqual({
        urls: 'turn:turn.example.com:3478',
        username: 'turn-user',
        credential: 'turn-pass',
      });
    });

    it('omits username/credential on the TURN entry when not provided', () => {
      const { svc } = makeService({
        config: { TURN_URL: 'turn:turn.example.com:3478' },
      });
      const ice = svc.getIceServers();
      expect(ice).toHaveLength(2);
      expect(ice[1]).toEqual({ urls: 'turn:turn.example.com:3478' });
    });
  });
});
