import type { BookingEngineRepositoryPort } from './repository.port.ts';

export interface TransactionContext {
  repository: BookingEngineRepositoryPort;
}

export interface TransactionPort {
  withTransaction<T>(
    work: (context: TransactionContext) => Promise<T>,
  ): Promise<T>;
}
