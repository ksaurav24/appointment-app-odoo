import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookablePerson, EntityType, Prisma } from '@prisma/client';
import { OrganizationsService } from '../organizations/organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBookablePersonDto,
  StaffAvailabilityOverrideDto,
  StaffDateExceptionDto,
  StaffWeeklyRuleDto,
} from './dto/create-bookable-person.dto';
import { ListBookablePersonsQuery } from './dto/list-bookable-persons.query';
import { UpdateBookablePersonDto } from './dto/update-bookable-person.dto';

type PrismaTx = Prisma.TransactionClient;

type BookablePersonWithIncludes = Prisma.BookablePersonGetPayload<{
  include: {
    appointmentTypeEntities: {
      select: { appointmentType: { select: { id: true; name: true } } };
    };
  };
}>;

export interface StaffWeeklyRule extends StaffWeeklyRuleDto {}

export interface StaffDateException extends StaffDateExceptionDto {}

export interface StaffAvailabilityOverride extends StaffAvailabilityOverrideDto {}

export type BookablePersonWithAssignments = Omit<
  BookablePerson,
  'availabilityOverrides'
> & {
  assignedAppointmentTypes: { id: string; name: string }[];
  availabilityOverrides: StaffAvailabilityOverride[];
};

@Injectable()
export class BookablePersonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
  ) {}

  async create(
    organiserId: string,
    input: CreateBookablePersonDto,
  ): Promise<BookablePersonWithAssignments> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    const appointmentTypeIdsInput = input.appointmentTypeIds ?? [];
    const appointmentTypeIds = await this.ensureValidAppointmentTypes(
      org.id,
      appointmentTypeIdsInput,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const person = await tx.bookablePerson.create({
        data: {
          organizationId: org.id,
          name: input.name.trim(),
          contactEmail: input.contactEmail.toLowerCase(),
          phone: input.phone.trim(),
          designation: input.designation.trim(),
          isActive: input.isActive ?? true,
          availabilityOverrides: this.toAvailabilityOverridesJson(
            input.availabilityOverrides ?? [],
          ),
        },
      });

      if (appointmentTypeIds.length > 0) {
        await tx.appointmentTypeEntity.createMany({
          data: appointmentTypeIds.map((appointmentTypeId) => ({
            appointmentTypeId,
            bookablePersonId: person.id,
          })),
        });
      }
      return person;
    });

    return this.findOneForOrganiser(organiserId, created.id);
  }

  async list(
    organiserId: string,
    query: ListBookablePersonsQuery,
  ): Promise<BookablePersonWithAssignments[]> {
    const org = await this.organizations.requireForOrganiser(organiserId);

    const q = query.q?.trim();
    const designation = query.designation?.trim();

    const rows = await this.prisma.bookablePerson.findMany({
      where: {
        organizationId: org.id,
        ...(query.includeInactive ? {} : { isActive: true }),
        ...(designation
          ? {
              designation: {
                equals: designation,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(query.appointmentTypeId
          ? {
              appointmentTypeEntities: {
                some: { appointmentTypeId: query.appointmentTypeId },
              },
            }
          : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { designation: { contains: q, mode: 'insensitive' } },
                { contactEmail: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        appointmentTypeEntities: {
          select: {
            appointmentType: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toPersonResponse(row));
  }

  async findOneForOrganiser(
    organiserId: string,
    id: string,
  ): Promise<BookablePersonWithAssignments> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    const person = await this.prisma.bookablePerson.findFirst({
      where: { id, organizationId: org.id },
      include: {
        appointmentTypeEntities: {
          select: {
            appointmentType: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
    if (!person) throw new NotFoundException('Bookable person not found');
    return this.toPersonResponse(person);
  }

  async update(
    organiserId: string,
    id: string,
    input: UpdateBookablePersonDto,
  ): Promise<BookablePersonWithAssignments> {
    const existing = await this.findOneForOrganiser(organiserId, id);
    const org = await this.organizations.requireForOrganiser(organiserId);

    await this.prisma.$transaction(async (tx) => {
      await tx.bookablePerson.update({
        where: { id },
        data: {
          name: input.name?.trim(),
          contactEmail: input.contactEmail?.toLowerCase(),
          phone: input.phone?.trim(),
          designation: input.designation?.trim(),
          isActive: input.isActive,
          ...(input.availabilityOverrides
            ? {
                availabilityOverrides: this.toAvailabilityOverridesJson(
                  input.availabilityOverrides,
                ),
              }
            : {}),
        },
      });

      if (input.appointmentTypeIds) {
        const appointmentTypeIds = await this.ensureValidAppointmentTypes(
          org.id,
          input.appointmentTypeIds,
          tx,
        );

        await tx.appointmentTypeEntity.deleteMany({
          where: { bookablePersonId: id },
        });
        await tx.appointmentTypeEntity.createMany({
          data: appointmentTypeIds.map((appointmentTypeId) => ({
            appointmentTypeId,
            bookablePersonId: id,
          })),
        });
      }
    });

    return this.findOneForOrganiser(organiserId, existing.id);
  }

  /**
   * Soft-delete by default. Hard-delete only when no appointments and no
   * appointment_type_entities reference this person — otherwise we'd violate
   * referential integrity for booking history.
   */
  async remove(
    organiserId: string,
    id: string,
  ): Promise<{ deleted: 'soft' | 'hard' }> {
    const person = await this.findOneForOrganiser(organiserId, id);

    const [appointmentCount, entityLinkCount] = await Promise.all([
      this.prisma.appointment.count({ where: { bookablePersonId: id } }),
      this.prisma.appointmentTypeEntity.count({
        where: { bookablePersonId: id },
      }),
    ]);

    if (appointmentCount > 0 || entityLinkCount > 0) {
      if (!person.isActive) {
        throw new ConflictException(
          'Bookable person is already inactive and cannot be hard-deleted while booking history exists',
        );
      }
      await this.prisma.bookablePerson.update({
        where: { id },
        data: { isActive: false },
      });
      return { deleted: 'soft' };
    }

    await this.prisma.bookablePerson.delete({ where: { id } });
    return { deleted: 'hard' };
  }

  private async ensureValidAppointmentTypes(
    organizationId: string,
    appointmentTypeIds: string[],
    tx?: PrismaTx,
  ): Promise<string[]> {
    const unique = Array.from(new Set(appointmentTypeIds));
    if (unique.length === 0) return [];

    const client = tx ?? this.prisma;
    const rows = await client.appointmentType.findMany({
      where: {
        id: { in: unique },
        organizationId,
        entityType: EntityType.PERSON,
      },
      select: { id: true },
    });
    const found = new Set(rows.map((r) => r.id));
    const missing = unique.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Invalid person appointment types for this organization: ${missing.join(', ')}`,
      );
    }
    return unique;
  }

  private toPersonResponse(
    row: BookablePersonWithIncludes,
  ): BookablePersonWithAssignments {
    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      contactEmail: row.contactEmail,
      phone: row.phone,
      designation: row.designation,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      assignedAppointmentTypes: row.appointmentTypeEntities
        .map((entity) => entity.appointmentType)
        .filter((x): x is { id: string; name: string } => x != null),
      availabilityOverrides: this.parseOverrides(row.availabilityOverrides),
    };
  }

  private parseOverrides(
    value: Prisma.JsonValue | null,
  ): StaffAvailabilityOverride[] {
    if (!Array.isArray(value)) return [];
    const overrides: StaffAvailabilityOverride[] = [];

    for (const item of value) {
      if (item == null || typeof item !== 'object' || Array.isArray(item)) {
        continue;
      }
      const entry = item as Record<string, Prisma.JsonValue>;
      if (typeof entry.appointmentTypeId !== 'string') continue;

      const weeklyRulesRaw = Array.isArray(entry.weeklyRules)
        ? entry.weeklyRules
        : [];
      const weeklyRules: StaffWeeklyRule[] = [];
      for (const ruleItem of weeklyRulesRaw) {
        if (
          ruleItem == null ||
          typeof ruleItem !== 'object' ||
          Array.isArray(ruleItem)
        ) {
          continue;
        }
        const rule = ruleItem as Record<string, Prisma.JsonValue>;
        if (
          typeof rule.dayOfWeek !== 'number' ||
          typeof rule.startTime !== 'string' ||
          typeof rule.endTime !== 'string'
        ) {
          continue;
        }
        weeklyRules.push({
          dayOfWeek: rule.dayOfWeek,
          startTime: rule.startTime,
          endTime: rule.endTime,
        });
      }
      if (weeklyRules.length === 0) continue;

      const dateExceptionsRaw = Array.isArray(entry.dateExceptions)
        ? entry.dateExceptions
        : [];
      const dateExceptions: StaffDateException[] = [];
      for (const exItem of dateExceptionsRaw) {
        if (exItem == null || typeof exItem !== 'object' || Array.isArray(exItem)) {
          continue;
        }
        const exception = exItem as Record<string, Prisma.JsonValue>;
        if (typeof exception.date !== 'string') continue;
        const output: StaffDateException = { date: exception.date };
        if (typeof exception.reason === 'string') {
          output.reason = exception.reason;
        }
        dateExceptions.push(output);
      }

      const override: StaffAvailabilityOverride = {
        appointmentTypeId: entry.appointmentTypeId,
        weeklyRules,
      };
      if (typeof entry.timezone === 'string') {
        override.timezone = entry.timezone;
      }
      if (dateExceptions.length > 0) {
        override.dateExceptions = dateExceptions;
      }
      overrides.push(override);
    }

    return overrides;
  }

  private toAvailabilityOverridesJson(
    value: StaffAvailabilityOverrideDto[],
  ): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
