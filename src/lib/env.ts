import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  APP_NAME: z.string().min(1).default("ITMS Support App"),
  APP_ENV: z.string().min(1).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  AUTH_SESSION_SECRET: z
    .string()
    .min(16, "AUTH_SESSION_SECRET must be at least 16 characters"),
  AUTH_COOKIE_NAME: z.string().min(1).default("atms_session"),

  SERVICENOW_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  SERVICENOW_BASE_URL: z.string().optional(),
  SERVICENOW_USERNAME: z.string().optional(),
  SERVICENOW_PASSWORD: z.string().optional(),
  SERVICENOW_INCIDENT_TABLE: z.string().min(1).default("incident"),

  KAWARI_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  KAWARI_BASE_URL: z.string().optional(),
  KAWARI_AUTH_MODE: z.enum(["basic", "login", "token"]).default("login"),
  KAWARI_USERNAME: z.string().optional(),
  KAWARI_PASSWORD: z.string().optional(),
  KAWARI_ACCESS_TOKEN: z.string().optional(),
  KAWARI_TIMEOUT_MS: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) {
        return 15000;
      }

      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 15000;
    }),
  KAWARI_LOGIN_PATH: z.string().min(1).default("/login"),
  KAWARI_LOGIN_USERNAME_FIELD: z.string().min(1).default("email"),
  KAWARI_LOGIN_PASSWORD_FIELD: z.string().min(1).default("password"),
  KAWARI_TOKEN_FIELD: z.string().min(1).default("user.access_token"),
  KAWARI_HEALTH_PATH: z.string().min(1).default("/projects"),
  KAWARI_PROJECTS_PATH: z.string().min(1).default("/projects"),
  KAWARI_CLIENTS_PATH: z.string().min(1).default("/clients"),

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

export const kawariConfig = {
  enabled: env.KAWARI_ENABLED,
  baseUrl: env.KAWARI_BASE_URL ?? "",
  authMode: env.KAWARI_AUTH_MODE,
  username: env.KAWARI_USERNAME ?? "",
  password: env.KAWARI_PASSWORD ?? "",
  accessToken: env.KAWARI_ACCESS_TOKEN ?? "",
  timeoutMs: env.KAWARI_TIMEOUT_MS,
  loginPath: env.KAWARI_LOGIN_PATH,
  loginUsernameField: env.KAWARI_LOGIN_USERNAME_FIELD,
  loginPasswordField: env.KAWARI_LOGIN_PASSWORD_FIELD,
  tokenField: env.KAWARI_TOKEN_FIELD,
  healthPath: env.KAWARI_HEALTH_PATH,
  projectsPath: env.KAWARI_PROJECTS_PATH,
  clientsPath: env.KAWARI_CLIENTS_PATH,
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