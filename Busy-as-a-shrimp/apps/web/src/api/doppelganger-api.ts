import type { HttpClientLike } from "./http";

export interface PointLedgerTransaction {
  transactionId: number;
  amount: number;
  type: string;
  createdAt: string;
  direction: "income" | "expense";
  title: string;
  description: string;
}

export interface PointLedgerSummary {
  balance: number;
  memberMonthlyPointsGift: number;
  currentMonthGrantedPoints: number;
  isMomoUnlocked: boolean;
  transactions: PointLedgerTransaction[];
}

export function createDoppelgangerApi(client: Pick<HttpClientLike, "get">) {
  return {
    getMyPointLedger(): Promise<PointLedgerSummary> {
      return client.get<PointLedgerSummary>("/doppelganger/me");
    }
  };
}
