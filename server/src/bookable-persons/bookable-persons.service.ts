import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookablePerson } from '@prisma/client';
import { OrganizationsService } from '../organizations/organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookablePersonDto } from './dto/create-bookable-person.dto';
import { UpdateBookablePersonDto } from './dto/update-bookable-person.dto';

@Injectable()
export class BookablePersonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
  ) {}

  async create(
    organiserId: string,
    input: CreateBookablePersonDto,
  ): Promise<BookablePerson> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    return this.prisma.bookablePerson.create({
      data: {
        organizationId: org.id,
        name: input.name.trim(),
        contactEmail: input.contactEmail.toLowerCase(),
        phone: input.phone,
        designation: input.designation,
        isActive: input.isActive ?? true,
      },
    });
  }

  async list(
    organiserId: string,
    includeInactive = false,
  ): Promise<BookablePerson[]> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    return this.prisma.bookablePerson.findMany({
      where: {
        organizationId: org.id,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForOrganiser(
    organiserId: string,
    id: string,
  ): Promise<BookablePerson> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    const person = await this.prisma.bookablePerson.findFirst({
      where: { id, organizationId: org.id },
    });
    if (!person) throw new NotFoundException('Bookable person not found');
    return person;
  }

  async update(
    organiserId: string,
    id: string,
    input: UpdateBookablePersonDto,
  ): Promise<BookablePerson> {
    await this.findOneForOrganiser(organiserId, id);
    return this.prisma.bookablePerson.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        contactEmail: input.contactEmail?.toLowerCase(),
        phone: input.phone,
        designation: input.designation,
        isActive: input.isActive,
      },
    });
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
}
