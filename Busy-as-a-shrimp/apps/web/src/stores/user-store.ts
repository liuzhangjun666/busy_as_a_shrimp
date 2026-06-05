"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type UserRole = "service" | "resource" | "both";
type MemberLevel = "FREE" | "PRO" | "YEARLY" | "LIFETIME";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_COOKIE_KEY = "airp_token";

interface UserStoreState {
  token: string;
  userId: number | null;
  phone: string;
  avatar: string | null;
  role: UserRole;
  memberLevel: MemberLevel;
  isRealNameVerified: boolean;
  pointsBalance: number;
  memberMonthlyPointsGift: number;
  currentMonthGrantedPoints: number;
  isMomoUnlocked: boolean;
  tokenExpiresAt: number;
}

interface UserStoreActions {
  setLogin: (payload: {
    token: string;
    userId: number;
    phone: string;
      role?: UserRole;
      memberLevel?: string;
      isRealNameVerified?: boolean;
      pointsBalance?: number;
      memberMonthlyPointsGift?: number;
      currentMonthGrantedPoints?: number;
      isMomoUnlocked?: boolean;
    }) => void;
  setAvatar: (avatar: string | null) => void;
  setRole: (role: UserRole) => void;
  setMemberLevel: (level: MemberLevel) => void;
  setRealNameVerified: (verified: boolean) => void;
  setPointsSummary: (payload: {
    pointsBalance: number;
    memberMonthlyPointsGift?: number;
    currentMonthGrantedPoints?: number;
    isMomoUnlocked?: boolean;
  }) => void;
  logout: () => void;
  getValidToken: () => string;
}

type UserStore = UserStoreState & UserStoreActions;

const memoryStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined
};

function normalizeStoreMemberLevel(level?: string): MemberLevel {
  if (level === "monthly" || level === "PRO") {
    return "PRO";
  }
  if (level === "yearly" || level === "YEARLY") {
    return "YEARLY";
  }
  if (level === "lifetime" || level === "LIFETIME") {
    return "LIFETIME";
  }
  return "FREE";
}

function writeTokenCookie(token: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearTokenCookie() {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${TOKEN_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      token: "",
      userId: null,
      phone: "",
      avatar: null,
      role: "both",
      memberLevel: "FREE",
      isRealNameVerified: false,
      pointsBalance: 0,
      memberMonthlyPointsGift: 0,
      currentMonthGrantedPoints: 0,
      isMomoUnlocked: false,
      tokenExpiresAt: 0,
      setLogin(payload) {
        const tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
        writeTokenCookie(payload.token, Math.floor(TOKEN_TTL_MS / 1000));
        set({
          token: payload.token,
          userId: payload.userId,
          phone: payload.phone,
          avatar: null,
          role: payload.role ?? "both",
          memberLevel: normalizeStoreMemberLevel(payload.memberLevel),
          isRealNameVerified: payload.isRealNameVerified ?? false,
          pointsBalance: payload.pointsBalance ?? 0,
          memberMonthlyPointsGift: payload.memberMonthlyPointsGift ?? 0,
          currentMonthGrantedPoints: payload.currentMonthGrantedPoints ?? 0,
          isMomoUnlocked: payload.isMomoUnlocked ?? false,
          tokenExpiresAt
        });
      },
      setAvatar(avatar) {
        set({ avatar });
      },
      setRole(role) {
        set({ role });
      },
      setMemberLevel(memberLevel) {
        set({ memberLevel });
      },
      setRealNameVerified(verified) {
        set({ isRealNameVerified: verified });
      },
      setPointsSummary(payload) {
        set((state) => ({
          pointsBalance: payload.pointsBalance,
          memberMonthlyPointsGift:
            payload.memberMonthlyPointsGift ?? state.memberMonthlyPointsGift,
          currentMonthGrantedPoints:
            payload.currentMonthGrantedPoints ?? state.currentMonthGrantedPoints,
          isMomoUnlocked: payload.isMomoUnlocked ?? state.isMomoUnlocked
        }));
      },
      logout() {
        clearTokenCookie();
        set({
          token: "",
          userId: null,
          phone: "",
          avatar: null,
          role: "both",
          memberLevel: "FREE",
          isRealNameVerified: false,
          pointsBalance: 0,
          memberMonthlyPointsGift: 0,
          currentMonthGrantedPoints: 0,
          isMomoUnlocked: false,
          tokenExpiresAt: 0
        });
      },
      getValidToken() {
        const state = get();
        if (!state.token) {
          return "";
        }
        if (Date.now() >= state.tokenExpiresAt) {
          clearTokenCookie();
          set({
            token: "",
            phone: "",
            avatar: null,
            role: "both",
            memberLevel: "FREE",
            isRealNameVerified: false,
            pointsBalance: 0,
            memberMonthlyPointsGift: 0,
            currentMonthGrantedPoints: 0,
            isMomoUnlocked: false,
            tokenExpiresAt: 0
          });
          return "";
        }
        return state.token;
      }
    }),
    {
      name: "airp-user-store",
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? memoryStorage : window.localStorage
      ),
      partialize: (state) => ({
        token: state.token,
        userId: state.userId,
        phone: state.phone,
        avatar: state.avatar,
        role: state.role,
        memberLevel: state.memberLevel,
        isRealNameVerified: state.isRealNameVerified,
        pointsBalance: state.pointsBalance,
        memberMonthlyPointsGift: state.memberMonthlyPointsGift,
        currentMonthGrantedPoints: state.currentMonthGrantedPoints,
        isMomoUnlocked: state.isMomoUnlocked,
        tokenExpiresAt: state.tokenExpiresAt
      })
    }
  )
);

export type { UserRole, MemberLevel };
