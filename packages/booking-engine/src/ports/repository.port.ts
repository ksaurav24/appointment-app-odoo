import type {
  ActiveHold,
  AppointmentTypeEntityLink,
  AppointmentTypePolicy,
  BookableResource,
  ExistingAppointment,
  ScheduleDefinition,
} from '../domain/models.ts';
import type { SnapshotRange } from '../domain/value-objects.ts';

export interface RepositoryAvailabilityQuery extends SnapshotRange {
  appointmentTypeId: string;
}

export interface BookingEngineRepositoryPort {
  getAppointmentTypePolicy(
    appointmentTypeId: string,
  ): Promise<AppointmentTypePolicy | null>;
  getScheduleDefinition(
    appointmentTypeId: string,
  ): Promise<ScheduleDefinition | null>;
  listEntityLinks(appointmentTypeId: string): Promise<AppointmentTypeEntityLink[]>;
  listResources(resourceIds: readonly string[]): Promise<BookableResource[]>;
  listAppointments(query: RepositoryAvailabilityQuery): Promise<ExistingAppointment[]>;
  listActiveHolds(query: RepositoryAvailabilityQuery): Promise<ActiveHold[]>;
}
