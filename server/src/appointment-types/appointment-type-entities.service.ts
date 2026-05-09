import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PrismaTx = Prisma.TransactionClient;

@Injectable()
export class AppointmentTypeEntitiesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify the supplied entity ids all belong to the organization, are
   * active, and match the requested entity type. Throws BadRequest with a
   * specific message if any check fails.
   */
  async verifyEntitiesForOrganization(
    organizationId: string,
    entityType: EntityType,
    entityIds: string[],
    tx?: PrismaTx,
  ): Promise<void> {
    if (entityIds.length === 0) return;
    const client = tx ?? this.prisma;
    const unique = Array.from(new Set(entityIds));

    if (entityType === EntityType.PERSON) {
      const persons = await client.bookablePerson.findMany({
        where: { id: { in: unique }, organizationId, isActive: true },
        select: { id: true },
      });
      const found = new Set(persons.map((p) => p.id));
      const missing = unique.filter((id) => !found.has(id));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Bookable persons not found, inactive, or in another organization: ${missing.join(', ')}`,
        );
      }
    } else {
      const resources = await client.bookableResource.findMany({
        where: { id: { in: unique }, organizationId, isActive: true },
        select: { id: true },
      });
      const found = new Set(resources.map((r) => r.id));
      const missing = unique.filter((id) => !found.has(id));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Bookable resources not found, inactive, or in another organization: ${missing.join(', ')}`,
        );
      }
    }
  }

  /**
   * Replace the entity assignments for an appointment type. Wraps the delete
   * + bulk insert in the supplied transaction (or starts a new one).
   */
  async replaceEntities(
    appointmentTypeId: string,
    entityType: EntityType,
    entityIds: string[],
    tx: PrismaTx,
  ): Promise<void> {
    await tx.appointmentTypeEntity.deleteMany({
      where: { appointmentTypeId },
    });
    if (entityIds.length === 0) return;
    await tx.appointmentTypeEntity.createMany({
      data: entityIds.map((id) =>
        entityType === EntityType.PERSON
          ? { appointmentTypeId, bookablePersonId: id }
          : { appointmentTypeId, bookableResourceId: id },
      ),
    });
  }
}
