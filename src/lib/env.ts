import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  APP_NAME: z.string().min(1).default("ITMS Support App"),
  APP_ENV: z.string().min(1).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  AUTH_SESSION_SECRET: z.string().min(16, "AUTH_SESSION_SECRET must be at least 16 characters"),
  AUTH_COOKIE_NAME: z.string().min(1).default("itms_support_session"),

  SERVICENOW_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  SERVICENOW_BASE_URL: z.string().optional(),
  SERVICENOW_USERNAME: z.string().optional(),
  SERVICENOW_PASSWORD: z.string().optional(),
  SERVICENOW_INCIDENT_TABLE: z.string().min(1).default("incident"),

  SMTP_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  SMS_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  SMS_PROVIDER: z.string().optional(),
  SMS_API_KEY: z.string().optional(),
});

const parsedEnv = serverEnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables");
  console.error(parsedEnv.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsedEnv.data;

export const appConfig = {
  name: env.APP_NAME,
  env: env.APP_ENV,
  url: env.APP_URL,
} as const;

export const authConfig = {
  sessionSecret: env.AUTH_SESSION_SECRET,
  cookieName: env.AUTH_COOKIE_NAME,
} as const;

export const serviceNowConfig = {
  enabled: env.SERVICENOW_ENABLED,
  baseUrl: env.SERVICENOW_BASE_URL ?? "",
  username: env.SERVICENOW_USERNAME ?? "",
  password: env.SERVICENOW_PASSWORD ?? "",
  incidentTable: env.SERVICENOW_INCIDENT_TABLE,
} as const;

export const smtpConfig = {
  enabled: env.SMTP_ENABLED,
  host: env.SMTP_HOST ?? "",
  port: env.SMTP_PORT ? Number(env.SMTP_PORT) : 0,
  user: env.SMTP_USER ?? "",
  pass: env.SMTP_PASS ?? "",
  from: env.SMTP_FROM ?? "",
} as const;

export const smsConfig = {
  enabled: env.SMS_ENABLED,
  provider: env.SMS_PROVIDER ?? "",
  apiKey: env.SMS_API_KEY ?? "",
} as const;