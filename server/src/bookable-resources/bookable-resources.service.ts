import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookableResource } from '@prisma/client';
import { OrganizationsService } from '../organizations/organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookableResourceDto } from './dto/create-bookable-resource.dto';
import { UpdateBookableResourceDto } from './dto/update-bookable-resource.dto';

@Injectable()
export class BookableResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
  ) {}

  async create(
    organiserId: string,
    input: CreateBookableResourceDto,
  ): Promise<BookableResource> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    return this.prisma.bookableResource.create({
      data: {
        organizationId: org.id,
        name: input.name.trim(),
        resourceType: input.resourceType,
        description: input.description,
        capacity: input.capacity ?? 1,
        location: input.location,
        isActive: input.isActive ?? true,
      },
    });
  }

  async list(
    organiserId: string,
    includeInactive = false,
  ): Promise<BookableResource[]> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    return this.prisma.bookableResource.findMany({
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
  ): Promise<BookableResource> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    const resource = await this.prisma.bookableResource.findFirst({
      where: { id, organizationId: org.id },
    });
    if (!resource) throw new NotFoundException('Bookable resource not found');
    return resource;
  }

  async update(
    organiserId: string,
    id: string,
    input: UpdateBookableResourceDto,
  ): Promise<BookableResource> {
    await this.findOneForOrganiser(organiserId, id);
    return this.prisma.bookableResource.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        resourceType: input.resourceType,
        description: input.description,
        capacity: input.capacity,
        location: input.location,
        isActive: input.isActive,
      },
    });
  }

  async remove(
    organiserId: string,
    id: string,
  ): Promise<{ deleted: 'soft' | 'hard' }> {
    const resource = await this.findOneForOrganiser(organiserId, id);

    const [appointmentCount, entityLinkCount] = await Promise.all([
      this.prisma.appointment.count({ where: { bookableResourceId: id } }),
      this.prisma.appointmentTypeEntity.count({
        where: { bookableResourceId: id },
      }),
    ]);

    if (appointmentCount > 0 || entityLinkCount > 0) {
      if (!resource.isActive) {
        throw new ConflictException(
          'Bookable resource is already inactive and cannot be hard-deleted while booking history exists',
        );
      }
      await this.prisma.bookableResource.update({
        where: { id },
        data: { isActive: false },
      });
      return { deleted: 'soft' };
    }

    await this.prisma.bookableResource.delete({ where: { id } });
    return { deleted: 'hard' };
  }
}
