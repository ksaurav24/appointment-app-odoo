import type { Request } from 'express';

export interface RequestMeta {
  deviceInfo?: string;
  ipAddress?: string;
}

export function readCookie(req: Request, name: string): string | undefined {
  const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
  return cookies[name];
}

export function requestMeta(req: Request): RequestMeta {
  return {
    deviceInfo: req.headers['user-agent']?.toString().slice(0, 200),
    ipAddress: req.ip,
  };
}
