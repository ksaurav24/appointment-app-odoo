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

export interface AuditRequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

/** Same shape as `requestMeta`, but with field names matching the AuditLog model. */
export function auditRequestMeta(req: Request): AuditRequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']?.toString().slice(0, 200),
  };
}
