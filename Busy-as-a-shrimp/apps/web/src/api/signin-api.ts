import type { HttpClientLike } from "./http";

export interface SignInResult {
  points: number;
  streakDays: number;
  nextBigReward: number;
}

export interface SignInStatus {
  signedToday: boolean;
  streakDays: number;
}

export function createSignInApi(client: Pick<HttpClientLike, "get" | "post">) {
  return {
    signIn(): Promise<SignInResult> {
      return client.post<SignInResult>("/signin");
    },
    getStatus(): Promise<SignInStatus> {
      return client.get<SignInStatus>("/signin/status");
    }
  };
}
