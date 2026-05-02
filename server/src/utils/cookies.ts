import type { CookieOptions } from 'express';

export const ACCESS_COOKIE_NAME = 'access_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';

const REFRESH_PATH = '/auth';

export interface CookieEnv {
  nodeEnv: string;
  cookieDomain: string;
  accessTtlMs: number;
  refreshTtlMs: number;
}

const isProd = (env: CookieEnv): boolean => env.nodeEnv === 'production';

export function accessCookieOptions(env: CookieEnv): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd(env),
    sameSite: 'lax',
    domain: env.cookieDomain,
    path: '/',
    maxAge: env.accessTtlMs,
  };
}

export function refreshCookieOptions(env: CookieEnv): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd(env),
    sameSite: 'strict',
    domain: env.cookieDomain,
    path: REFRESH_PATH,
    maxAge: env.refreshTtlMs,
  };
}

export function clearCookieOptions(
  env: CookieEnv,
  variant: 'access' | 'refresh',
): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd(env),
    sameSite: variant === 'refresh' ? 'strict' : 'lax',
    domain: env.cookieDomain,
    path: variant === 'refresh' ? REFRESH_PATH : '/',
  };
}
