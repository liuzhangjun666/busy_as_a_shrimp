type AppEnv = "local" | "dev" | "staging" | "prod";

export interface ClientEnv {
  apiBaseUrl: string;
  appEnv: AppEnv;
}

function parseAppEnv(value?: string, nodeEnv?: string): AppEnv {
  const raw = value ?? (nodeEnv === "production" ? "prod" : "local");
  if (raw === "local" || raw === "dev" || raw === "staging" || raw === "prod") {
    return raw;
  }
  throw new Error(`Invalid NEXT_PUBLIC_APP_ENV: ${raw}`);
}

export function loadClientEnv(): ClientEnv {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
  }

  return {
    apiBaseUrl,
    appEnv: parseAppEnv(process.env.NEXT_PUBLIC_APP_ENV, process.env.NODE_ENV)
  };
}
