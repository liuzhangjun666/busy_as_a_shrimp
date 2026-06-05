type AppEnv = "local" | "dev" | "staging" | "prod";

export interface ClientEnv {
  apiBaseUrl: string;
  appEnv: AppEnv;
}

function parseAppEnv(value?: string): AppEnv {
  const raw = value ?? "local";
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
    appEnv: parseAppEnv(process.env.NEXT_PUBLIC_APP_ENV)
  };
}
