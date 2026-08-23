import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_PORT: z.coerce.number().int().positive().max(65_535).default(3001),
  API_BODY_LIMIT: z
    .string()
    .regex(/^\d+(kb|mb)$/i)
    .default('1mb'),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (value) =>
        value.startsWith('postgresql://') || value.startsWith('postgres://'),
      'DATABASE_URL must be a PostgreSQL connection URL',
    ),
  JWT_ACCESS_SECRET: z.string().min(32).max(512),
  JWT_ACCESS_TTL: z.coerce.number().int().min(60).max(3_600).default(900),
  AUTH_REFRESH_TTL: z.coerce
    .number()
    .int()
    .min(3_600)
    .max(31_536_000)
    .default(2_592_000),
  DEFAULT_CURRENCY: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .default('TRY'),
  INVITATION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url()).min(1)),
  S3_ENDPOINT: z.url().default('http://localhost:9000'),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_BUCKET: z.string().min(1).default('defterdar-receipts'),
  S3_ACCESS_KEY_ID: z.string().min(1).default('minioadmin'),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default('minioadmin'),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  ATTACHMENT_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024)
    .default(10 * 1024 * 1024),
  ATTACHMENT_URL_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(3600)
    .default(900),
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  values: Record<string, unknown>,
): Environment {
  const result = environmentSchema.safeParse(values);

  if (!result.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(result.error)}`);
  }

  return result.data;
}
