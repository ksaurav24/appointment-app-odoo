export interface MutexLease {
  key: string;
  release(): Promise<void>;
}

export interface MutexPort {
  acquire(key: string): Promise<MutexLease>;
}
