"use client";

import {
  ArrowUpRight,
  CalendarDays,
  Flame,
  LockKeyhole,
  MapPin,
  Search,
  Sparkles
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getCampusOpportunities, getPublicCampusOpportunities } from "@/api";
import type { DictItem } from "@/api/dict-api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { useDictQuery } from "@/hooks/use-dict-query";
import { cn } from "@/lib/utils";
import { useAuthStatus } from "@/stores/use-auth-status";

export interface CampusOpportunity {
  companyName: string;
  industry: string;
  companyIndustry?: string;
  logoGradient: string;
  recruitmentType: string;
  location: string;
  startDate: string;
  endDate: string;
  noWrittenTest: boolean;
  position: string;
  announcementUrl: string;
  applyUrl: string;
  sourceType?: string;
}

export interface CampusFilters {
  locations: string[];
  industries: string[];
}

export interface CampusFilterOptions {
  locations: string[];
  industries: string[];
}

export const EMPTY_CAMPUS_FILTERS: CampusFilters = {
  locations: [],
  industries: []
};

export const LOCKED_ROW_START_INDEX = 5;
const DEFAULT_LOGO_GRADIENT = "from-slate-500 to-slate-600";
const LOGO_GRADIENT_CLASS_MAP: Record<string, string> = {
  "from-slate-500 to-slate-600": "from-slate-500 to-slate-600",
  "from-slate-500 to-zinc-500": "from-slate-500 to-zinc-500",
  "from-blue-500 to-indigo-500": "from-blue-500 to-indigo-500",
  "from-emerald-500 to-teal-500": "from-emerald-500 to-teal-500",
  "from-cyan-500 to-sky-500": "from-cyan-500 to-sky-500",
  "from-violet-500 to-fuchsia-500": "from-violet-500 to-fuchsia-500",
  "from-rose-500 to-pink-500": "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500": "from-amber-500 to-orange-500",
  "from-lime-500 to-emerald-500": "from-lime-500 to-emerald-500",
  "from-orange-500 to-amber-400": "from-orange-500 to-amber-400",
  "from-blue-500 to-cyan-500": "from-blue-500 to-cyan-500",
  "from-indigo-500 to-violet-500": "from-indigo-500 to-violet-500"
};
const POLL_INTERVAL_MS = 10_000;
const POLL_PAGE_SIZE = 50;
const CAMPUS_LOCATION_DICT_TYPE = "CAMPUS_FILTER_LOCATIONS";
const CAMPUS_INDUSTRY_DICT_TYPE = "CAMPUS_FILTER_INDUSTRIES";
const FALLBACK_CAMPUS_LOCATIONS = [
  "北京",
  "上海",
  "广州",
  "深圳",
  "杭州",
  "南京",
  "成都",
  "武汉",
  "西安",
  "全国"
];
const FALLBACK_CAMPUS_INDUSTRIES = [
  "互联网",
  "人工智能",
  "消费电子",
  "新能源汽车",
  "金融科技",
  "游戏",
  "半导体",
  "零售电商",
  "云计算",
  "教育"
];

export function isOpportunityLocked(index: number, isLocked: boolean) {
  return isLocked && index >= LOCKED_ROW_START_INDEX;
}

export function filterCampusOpportunities(
  searchQuery: string,
  opportunities: CampusOpportunity[] = []
) {
  const query = searchQuery.trim().toLowerCase();
  if (!query) {
    return opportunities;
  }

  return opportunities.filter((item) =>
    [item.companyName, item.companyIndustry ?? item.industry, item.position, item.location].some(
      (value) => value.toLowerCase().includes(query)
    )
  );
}

function applyCampusFilters(
  opportunities: CampusOpportunity[],
  filters: CampusFilters
): CampusOpportunity[] {
  const hasLocationFilter = filters.locations.length > 0;
  const hasIndustryFilter = filters.industries.length > 0;

  if (!hasLocationFilter && !hasIndustryFilter) {
    return opportunities;
  }

  return opportunities.filter((item) => {
    const locationMatched = hasLocationFilter ? filters.locations.includes(item.location) : true;
    const industryValue = item.companyIndustry ?? item.industry;
    const industryMatched = hasIndustryFilter ? filters.industries.includes(industryValue) : true;

    return locationMatched && industryMatched;
  });
}

function getDictItemValues(items: DictItem[] = []): string[] {
  return items.map((item) => item.value?.trim()).filter((value): value is string => Boolean(value));
}

function mergeFilterOptionValues(dictValues: string[], dynamicValues: string[]): string[] {
  const set = new Set<string>();
  const merged: string[] = [];

  for (const value of dictValues) {
    if (!set.has(value)) {
      set.add(value);
      merged.push(value);
    }
  }

  const extras = dynamicValues
    .filter((value) => !set.has(value))
    .sort((a, b) => a.localeCompare(b, "zh-CN"));

  return [...merged, ...extras];
}

function deriveCampusFilterOptions(
  opportunities: CampusOpportunity[],
  locationDictValues: string[],
  industryDictValues: string[]
): CampusFilterOptions {
  const baseLocations =
    locationDictValues.length > 0 ? locationDictValues : FALLBACK_CAMPUS_LOCATIONS;
  const baseIndustries =
    industryDictValues.length > 0 ? industryDictValues : FALLBACK_CAMPUS_INDUSTRIES;
  const dynamicLocations = Array.from(new Set(opportunities.map((item) => item.location)));
  const dynamicIndustries = Array.from(
    new Set(opportunities.map((item) => item.companyIndustry ?? item.industry))
  );
  const locations = mergeFilterOptionValues(baseLocations, dynamicLocations);
  const industries = mergeFilterOptionValues(baseIndustries, dynamicIndustries);

  return { locations, industries };
}

function normalizeLogoGradient(value?: string): string {
  const cleaned = value?.trim();
  if (!cleaned) {
    return DEFAULT_LOGO_GRADIENT;
  }
  return LOGO_GRADIENT_CLASS_MAP[cleaned] ?? DEFAULT_LOGO_GRADIENT;
}

function normalizeCampusLocation(value?: string): string {
  const cleaned = value?.trim();
  if (!cleaned) {
    return "全国";
  }
  if (/^[?？�\-—_*. ]+$/.test(cleaned)) {
    return "全国";
  }
  return cleaned;
}

function normalizeOpportunity(item: CampusOpportunity): CampusOpportunity {
  return {
    ...item,
    companyName: item.companyName?.trim() || "未知公司",
    industry: item.industry?.trim() || "未知行业",
    companyIndustry: item.companyIndustry?.trim() || item.industry?.trim() || "未知行业",
    logoGradient: normalizeLogoGradient(item.logoGradient),
    recruitmentType: item.recruitmentType?.trim() || "校园招聘",
    location: normalizeCampusLocation(item.location),
    startDate: item.startDate?.trim() || "-",
    endDate: item.endDate?.trim() || "-",
    position: item.position?.trim() || "待补充岗位",
    announcementUrl: item.announcementUrl?.trim() || "#",
    applyUrl: item.applyUrl?.trim() || "#",
    noWrittenTest: Boolean(item.noWrittenTest)
  };
}

function getRecruitmentTypeClasses(recruitmentType: CampusOpportunity["recruitmentType"]) {
  if (recruitmentType.includes("实习")) {
    return "inline-flex h-5 items-center whitespace-nowrap rounded-sm border border-blue-100 bg-blue-50 px-1.5 text-[10px] leading-none text-blue-600";
  }

  if (recruitmentType.includes("秋招")) {
    return "inline-flex h-5 items-center whitespace-nowrap rounded-sm border border-rose-100 bg-rose-50 px-1.5 text-[10px] leading-none text-rose-600";
  }

  if (recruitmentType.includes("春招")) {
    return "inline-flex h-5 items-center whitespace-nowrap rounded-sm border border-amber-100 bg-amber-50 px-1.5 text-[10px] leading-none text-amber-600";
  }

  return "inline-flex h-5 items-center whitespace-nowrap rounded-sm border border-slate-100 bg-slate-50 px-1.5 text-[10px] leading-none text-slate-600";
}

function getNoWrittenBadgeClasses(noWrittenTest: boolean) {
  if (noWrittenTest) {
    return "inline-flex h-5 items-center whitespace-nowrap rounded-sm border border-emerald-100 bg-emerald-50 px-1.5 text-[10px] leading-none text-emerald-600";
  }

  return "inline-flex h-5 items-center whitespace-nowrap rounded-sm border border-slate-100 bg-slate-50 px-1.5 text-[10px] leading-none text-slate-500";
}

function CompanyCell({ opportunity }: { opportunity: CampusOpportunity }) {
  const name = opportunity.companyName.trim();
  const initial = Array.from(name)[0] ?? "招";

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br shadow-sm",
          opportunity.logoGradient
        )}
      >
        <span className="text-[10px] font-bold text-white">{initial}</span>
      </div>
      <span className="text-sm font-medium text-slate-800">{name || "未知公司"}</span>
    </div>
  );
}

function ActionLinks({ applyUrl, locked }: { applyUrl: string; locked?: boolean }) {
  if (locked) {
    return <span className="whitespace-nowrap text-xs text-slate-300">已锁定</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={applyUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-blue-600 opacity-90 transition-all hover:opacity-100"
      >
        投递
        <ArrowUpRight className="h-3 w-3" />
      </a>
    </div>
  );
}

interface CampusRecruitmentSectionProps {
  isLocked: boolean;
  isUnlocking?: boolean;
  onUnlock?: () => void;
  onLoginForUnlock?: () => void;
  refreshToken?: number;
  onDataRefreshed?: (payload: { refreshedAt: Date; mode: "initial" | "poll" | "manual" }) => void;
  onExportDataChange?: (rows: CampusOpportunity[]) => void;
  filters?: CampusFilters;
  onFilterOptionsChange?: (options: CampusFilterOptions) => void;
}

export function CampusRecruitmentSection({
  isLocked,
  isUnlocking = false,
  onUnlock,
  onLoginForUnlock,
  refreshToken = 0,
  onDataRefreshed,
  onExportDataChange,
  filters = EMPTY_CAMPUS_FILTERS,
  onFilterOptionsChange
}: CampusRecruitmentSectionProps) {
  const { hydrated, isLoggedIn } = useAuthStatus();
  const campusLocationDictQuery = useDictQuery(CAMPUS_LOCATION_DICT_TYPE, { enabled: hydrated });
  const campusIndustryDictQuery = useDictQuery(CAMPUS_INDUSTRY_DICT_TYPE, { enabled: hydrated });
  const [searchQuery, setSearchQuery] = useState("");
  const [opportunities, setOpportunities] = useState<CampusOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const lastManualRefreshTokenRef = useRef(refreshToken);

  const fetchOpportunities = useCallback(
    async (
      options: {
        silent?: boolean;
        mountedRef?: { current: boolean };
        mode?: "initial" | "poll" | "manual";
      } = {}
    ) => {
      const { silent = false, mountedRef, mode = "manual" } = options;
      if (!silent && mountedRef?.current !== false) {
        setIsLoading(true);
      }

      try {
        const response = isLoggedIn
          ? await getCampusOpportunities({
              page: 1,
              size: POLL_PAGE_SIZE,
              sourceType: "campus_recruitment"
            })
          : await getPublicCampusOpportunities({
              limit: POLL_PAGE_SIZE
            });
        if (mountedRef && !mountedRef.current) {
          return;
        }
        const safeList = (response.list ?? []).map((item) =>
          normalizeOpportunity(item as CampusOpportunity)
        );
        setOpportunities(safeList);
        onDataRefreshed?.({
          refreshedAt: new Date(),
          mode
        });
      } catch (error) {
        console.error("[campus-recruitment] fetch opportunities failed", error);
      } finally {
        if (!silent && mountedRef?.current !== false) {
          setIsLoading(false);
        }
      }
    },
    [isLoggedIn, onDataRefreshed]
  );

  useEffect(() => {
    const mountedRef = { current: true };
    if (!hydrated) {
      return () => {
        mountedRef.current = false;
      };
    }

    void fetchOpportunities({ mountedRef, mode: "initial" });

    const timer = window.setInterval(() => {
      void fetchOpportunities({ silent: true, mountedRef, mode: "poll" });
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [fetchOpportunities, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (refreshToken === lastManualRefreshTokenRef.current) {
      return;
    }
    lastManualRefreshTokenRef.current = refreshToken;
    void fetchOpportunities({ mode: "manual" });
  }, [fetchOpportunities, hydrated, refreshToken]);

  const locationDictValues = useMemo(
    () => getDictItemValues(campusLocationDictQuery.data?.items),
    [campusLocationDictQuery.data?.items]
  );
  const industryDictValues = useMemo(
    () => getDictItemValues(campusIndustryDictQuery.data?.items),
    [campusIndustryDictQuery.data?.items]
  );
  const filterOptions = useMemo(
    () => deriveCampusFilterOptions(opportunities, locationDictValues, industryDictValues),
    [industryDictValues, locationDictValues, opportunities]
  );

  const filteredByFacets = useMemo(
    () => applyCampusFilters(opportunities, filters),
    [opportunities, filters]
  );
  const filteredOpportunities = useMemo(
    () => filterCampusOpportunities(searchQuery, filteredByFacets),
    [searchQuery, filteredByFacets]
  );

  const noWrittenTestCount = filteredOpportunities.filter((item) => item.noWrittenTest).length;
  const exportableOpportunities = useMemo(
    () => filteredOpportunities.filter((_, index) => !isOpportunityLocked(index, isLocked)),
    [filteredOpportunities, isLocked]
  );
  const hasBlurredRows =
    !isLoading && isLocked && filteredOpportunities.length > LOCKED_ROW_START_INDEX;

  useEffect(() => {
    onExportDataChange?.(exportableOpportunities);
  }, [exportableOpportunities, onExportDataChange]);

  useEffect(() => {
    onFilterOptionsChange?.(filterOptions);
  }, [filterOptions, onFilterOptionsChange]);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-100 bg-slate-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <Card className="relative border-0 bg-transparent shadow-none">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                校招情报矩阵
              </CardTitle>
              <CardDescription className="text-xs leading-5 text-slate-500">
                高密度数据列表视图，支持实时筛选与分层解锁。
              </CardDescription>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
              <div className="relative min-w-[220px] flex-1 md:min-w-[280px] xl:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索公司、岗位或城市..."
                  className="h-9 rounded-lg border-slate-200 bg-white pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500/30"
                />
              </div>
              <div className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600">
                已汇总&nbsp;
                <span className="font-semibold text-slate-900">{filteredOpportunities.length}</span>
              </div>
              <div className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600">
                免笔试&nbsp;
                <span className="font-semibold text-emerald-600">{noWrittenTestCount}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-white">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      公司
                    </TableHead>
                    <TableHead className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      岗位
                    </TableHead>
                    <TableHead className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      地点
                    </TableHead>
                    <TableHead className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      时间
                    </TableHead>
                    <TableHead className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      招聘类型
                    </TableHead>
                    <TableHead className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      免笔试
                    </TableHead>
                    <TableHead className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      操作
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr]:border-b [&_tr]:border-dashed [&_tr]:border-slate-300/80 [&_tr:last-child]:border-0">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <TableRow key={`campus-skeleton-${index}`} className="hover:bg-transparent">
                        <TableCell className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <Skeleton className="h-6 w-6 rounded-md" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Skeleton className="h-4 w-44" />
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Skeleton className="h-5 w-14 rounded-sm" />
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Skeleton className="h-5 w-14 rounded-sm" />
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredOpportunities.length > 0 ? (
                    filteredOpportunities.map((opportunity, index) => {
                      const locked = isOpportunityLocked(index, isLocked);

                      return (
                        <TableRow
                          key={`${opportunity.companyName}-${opportunity.position}-${opportunity.endDate}-${index}`}
                          className={cn(
                            "group border-b border-dashed border-slate-300/80 transition-colors hover:bg-slate-50/50 last:border-0",
                            locked && "blur-md opacity-40 select-none pointer-events-none"
                          )}
                        >
                          <TableCell className="px-3 py-2.5">
                            <CompanyCell opportunity={opportunity} />
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-slate-700">
                            {opportunity.position}
                          </TableCell>
                          <TableCell className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {opportunity.location}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-xs font-mono text-slate-500 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 flex-nowrap">
                              <CalendarDays className="h-3 w-3 text-slate-400 shrink-0" />
                              {opportunity.startDate} - {opportunity.endDate}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-2.5">
                            <Badge
                              className={getRecruitmentTypeClasses(opportunity.recruitmentType)}
                            >
                              {opportunity.recruitmentType}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-3 py-2.5">
                            <Badge className={getNoWrittenBadgeClasses(opportunity.noWrittenTest)}>
                              {opportunity.noWrittenTest ? "免笔试🔥" : "常规流程"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-3 py-2.5">
                            <ActionLinks applyUrl={opportunity.applyUrl} locked={locked} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={7}
                        className="space-y-3 px-3 py-12 text-center text-sm text-slate-500"
                      >
                        <p>{isLoggedIn ? "未找到相关岗位" : "暂无公开校招数据"}</p>
                        {!isLoggedIn ? (
                          <button
                            type="button"
                            onClick={onLoginForUnlock}
                            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                          >
                            登录并解锁校招完整版（9.9）
                          </button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {hasBlurredRows ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-[52%] items-end">
                <div className="w-full border-t border-slate-100 bg-white/80 p-6 backdrop-blur-2xl shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.1)]">
                  <div className="mx-auto max-w-3xl text-center">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      <LockKeyhole className="h-3.5 w-3.5" />
                      The Vault Paywall
                    </div>
                    <p className="text-base font-semibold leading-7 text-slate-800 md:text-lg">
                      已免费开放前 5 条，支付 9.9 元即可解锁全部校招信息（持续更新）。
                    </p>
                    <button
                      type="button"
                      onClick={onUnlock}
                      disabled={isUnlocking}
                      className="pointer-events-auto group mx-auto mt-4 inline-flex h-12 items-center gap-3 rounded-2xl border border-slate-900 bg-slate-900 px-4 pr-3 text-sm font-semibold text-white shadow-[0_12px_28px_-14px_rgba(15,23,42,0.85)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_18px_34px_-16px_rgba(15,23,42,0.9)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/25 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none"
                    >
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-slate-900 shadow-sm">
                        {isUnlocking ? (
                          <Sparkles className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Flame className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span className="tracking-tight">
                        {isUnlocking ? "解锁中..." : "立即解锁全部校招信息"}
                      </span>
                      <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold text-amber-100 ring-1 ring-white/20">
                        ¥9.9
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
