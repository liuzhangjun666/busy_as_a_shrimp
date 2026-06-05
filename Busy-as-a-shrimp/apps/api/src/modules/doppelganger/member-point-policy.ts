import { MemberLevel } from "@prisma/client";

export const MEMBERSHIP_MONTHLY_POINT_GIFT: Record<MemberLevel, number> = {
  free: 0,
  monthly: 180,
  yearly: 480,
  lifetime: 1200
};

export const MOMO_COMMAND_POINT_COST: Record<string, number> = {
  "/scan_campus": 20,
  "/scan_city": 20,
  "/match_task": 18,
  "/check_hp": 6,
  "/view_logs": 4,
  "/match_overview": 8,
  "/resource_overview": 8,
  "/campus_snapshot": 10,
  "/brief_digest": 12
};

export function getMembershipMonthlyPointGift(level: MemberLevel): number {
  return MEMBERSHIP_MONTHLY_POINT_GIFT[level] ?? 0;
}

export function getMomoCommandPointCost(command: string): number {
  return MOMO_COMMAND_POINT_COST[command] ?? 0;
}
