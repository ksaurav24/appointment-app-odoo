import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export enum MailTransport {
  Console = 'console',
  Gmail = 'gmail',
  Json = 'json',
}

export class EnvVars {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 8000;

  @IsString()
  APP_BASE_URL!: string;

  @IsString()
  CORS_ORIGINS!: string;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  JWT_ACCESS_TTL: string = '15m';

  @IsInt()
  @Min(1)
  JWT_REFRESH_TTL_DAYS: number = 30;

  @IsString()
  COOKIE_DOMAIN: string = 'localhost';

  @IsInt()
  @Min(4)
  @Max(15)
  BCRYPT_COST: number = 12;

  @IsEnum(MailTransport)
  MAIL_TRANSPORT: MailTransport = MailTransport.Console;

  @IsString()
  MAIL_FROM!: string;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  @IsString()
  ADMIN_BOOTSTRAP_EMAIL!: string;

  @IsString()
  ADMIN_BOOTSTRAP_PASSWORD!: string;

  @IsString()
  ADMIN_BOOTSTRAP_NAME: string = 'Administrator';
}

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const validated = plainToInstance(EnvVars, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors
      .map(
        (e) =>
          `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      .join('; ');
    throw new Error(`Invalid environment configuration: ${messages}`);
  }
  if (validated.MAIL_TRANSPORT === MailTransport.Gmail) {
    if (!validated.SMTP_USER || !validated.SMTP_PASS) {
      throw new Error(
        'MAIL_TRANSPORT=gmail requires SMTP_USER and SMTP_PASS to be set',
      );
    }
  }
  return validated;
}
