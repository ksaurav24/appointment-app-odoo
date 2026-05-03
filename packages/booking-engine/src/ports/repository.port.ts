import type {
  ActiveHold,
  AppointmentTypeEntityLink,
  AppointmentTypePolicy,
  BookablePerson,
  BookableResource,
  ExistingAppointment,
  PaymentRecord,
  ScheduleDefinition,
} from '../domain/models.ts';
import type { EntityId, SnapshotRange } from '../domain/value-objects.ts';

export interface RepositoryAvailabilityQuery extends SnapshotRange {
  appointmentTypeId: EntityId;
}

export interface BookingEngineRepositoryPort {
  getAppointmentTypePolicy(
    appointmentTypeId: EntityId,
  ): Promise<AppointmentTypePolicy | null>;
  getScheduleDefinition(
    appointmentTypeId: EntityId,
  ): Promise<ScheduleDefinition | null>;
  listEntityLinks(
    appointmentTypeId: EntityId,
  ): Promise<AppointmentTypeEntityLink[]>;
  listPersons?(personIds: readonly EntityId[]): Promise<BookablePerson[]>;
  listResources(resourceIds: readonly EntityId[]): Promise<BookableResource[]>;
  listAppointments(query: RepositoryAvailabilityQuery): Promise<ExistingAppointment[]>;
  listActiveHolds(query: RepositoryAvailabilityQuery): Promise<ActiveHold[]>;
  listPaymentsForAppointments?(
    appointmentIds: readonly EntityId[],
  ): Promise<PaymentRecord[]>;
}
