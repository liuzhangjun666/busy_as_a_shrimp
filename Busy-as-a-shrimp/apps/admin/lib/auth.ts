export interface AdminSessionProfile {
  adminId: number;
  username: string;
  role: "super_admin";
}

const TOKEN_KEY = "airp_admin_token";
const PROFILE_KEY = "airp_admin_profile";

function canUseWindow(): boolean {
  return typeof window !== "undefined";
}

export function getAdminToken(): string | null {
  if (!canUseWindow()) {
    return null;
  }
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAdminProfile(): AdminSessionProfile | null {
  if (!canUseWindow()) {
    return null;
  }
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(PROFILE_KEY);
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AdminSessionProfile;
  } catch {
    return null;
  }
}

export function saveAdminSession(token: string, profile: AdminSessionProfile): void {
  if (!canUseWindow()) {
    return;
  }
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage failures and let auth gate fall back to URL/token flow.
  }
}

export function clearAdminSession(): void {
  if (!canUseWindow()) {
    return;
  }
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
