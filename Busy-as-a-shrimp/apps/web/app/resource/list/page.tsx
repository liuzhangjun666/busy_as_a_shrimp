"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RotateCcw, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDictQuery } from "@/hooks/use-dict-query";
import { getResourceApi } from "../../../src/api";
import { getErrorMessage } from "../../../src/utils/error-message";
import {
  buildDictLabelMap,
  formatResourceTagLabel,
  formatUploaderLabel,
  resolveResourceTypeLabel,
  type ResourceUploader
} from "../../../src/utils/resource-display";
import { useUserStore } from "../../../src/stores/user-store";

const FALLBACK_CITIES = [
  "北京",
  "上海",
  "广州",
  "深圳",
  "杭州",
  "成都",
  "武汉",
  "南京",
  "西安",
  "重庆",
  "天津",
  "苏州",
  "宁波",
  "厦门",
  "福州",
  "郑州",
  "长沙",
  "青岛",
  "济南"
];
const FALLBACK_SKILLS = [
  "短视频",
  "短视频脚本",
  "短视频拍摄",
  "视频剪辑",
  "直播",
  "直播运营",
  "账号代运营",
  "文案策划",
  "活动执行",
  "企业自播",
  "IP孵化",
  "私域运营",
  "AI剪辑",
  "平面设计",
  "达人对接",
  "品牌策划"
];
const FALLBACK_WISHES = ["寻找合伙人", "资源互换", "异业合作", "流量共享", "项目外包", "招募主播"];
const FALLBACK_NEEDS = ["长期", "短期", "周末", "兼职", "单次结", "远程"];
const QUICK_FILTER_LIMIT = 10;
const SEARCHED_FILTER_LIMIT = 18;
const FILTER_PILL_BASE = "rounded-full px-4 py-1.5 text-sm transition-all";
const FILTER_PILL_INACTIVE =
  "cursor-pointer border border-transparent bg-slate-100/70 text-slate-600 hover:bg-slate-200 hover:text-slate-900";
const FILTER_PILL_ACTIVE = "border-slate-900 bg-slate-900 text-white shadow-md font-medium";
const LOCATION_TAG_PREFIXES = new Set(["region", "core_location", "activation_resource"]);

type DictFilterItem = {
  code: string;
  label: string;
  value: string;
  remark?: string;
};

type FilterOption = {
  value: string;
  label: string;
  keywords: string[];
};

interface ResourceItem {
  resourceId: number;
  userId: number;
  resourceType: string;
  tags: string[];
  areaCode: string | null;
  status: string;
  uploader: ResourceUploader;
}

function normalizeTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeTextList(item));
  }

  if (typeof value === "string") {
    const text = value.trim();
    return text ? [text] : [];
  }

  if (typeof value === "number") {
    return [String(value)];
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => normalizeTextList(item));
  }

  return [];
}

function normalizeResourceList(value: unknown): ResourceItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    const row = item as Record<string, unknown>;
    const parsedId = Number(row.resourceId);

    return {
      resourceId: Number.isFinite(parsedId) ? parsedId : index + 1,
      userId: Number(row.userId) || 0,
      resourceType: typeof row.resourceType === "string" ? row.resourceType : "unknown",
      tags: normalizeTextList(row.tags),
      areaCode:
        typeof row.areaCode === "string" && row.areaCode.trim() ? row.areaCode.trim() : null,
      status: typeof row.status === "string" ? row.status.toLowerCase() : "unknown",
      uploader: normalizeUploader(row.uploader ?? row.user)
    };
  });
}

function normalizeUploader(value: unknown): ResourceUploader {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  return {
    userId:
      typeof row.userId === "string" || typeof row.userId === "number" ? row.userId : undefined,
    nickname: typeof row.nickname === "string" ? row.nickname : null,
    maskedPhone: typeof row.maskedPhone === "string" ? row.maskedPhone : null
  };
}

function normalizeFilterText(value: string) {
  return value.trim().toLowerCase();
}

function matchesFilter(tokens: string[], activeValue: string | null) {
  if (!activeValue) {
    return true;
  }

  const needle = normalizeFilterText(activeValue);
  if (!needle || needle === "全国") {
    return true;
  }

  return tokens.some((token) => normalizeFilterText(token).includes(needle));
}

function matchesKeyword(tokens: string[], keyword: string) {
  const needle = normalizeFilterText(keyword);
  if (!needle) {
    return true;
  }

  return tokens.some((token) => normalizeFilterText(token).includes(needle));
}

function getRawTagSegments(tag: string) {
  return tag
    .split(":")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function getTagPrefix(tag: string) {
  const [prefix] = tag.split(":");
  return prefix?.trim().toLowerCase() ?? "";
}

function toFilterOptions(
  items: Array<DictFilterItem> | undefined,
  fallbackValues: string[]
): FilterOption[] {
  const dictOptions =
    items?.map((item) => {
      const value = (item.value || item.label || item.code).trim();
      const label = (item.label || item.value || item.code).trim();
      return {
        value,
        label,
        keywords: [item.code, item.label, item.value, item.remark ?? ""].filter(Boolean)
      };
    }) ?? [];
  const fallbackOptions = fallbackValues.map((value) => ({
    value,
    label: value,
    keywords: [value]
  }));
  const source = [...dictOptions, ...fallbackOptions];

  const uniqueOptions = new Map<string, FilterOption>();
  for (const option of source) {
    const value = option.value.trim();
    if (!value) {
      continue;
    }

    const key = normalizeFilterText(value);
    const existing = uniqueOptions.get(key);
    if (existing) {
      existing.keywords = Array.from(new Set([...existing.keywords, ...option.keywords]));
    } else {
      uniqueOptions.set(key, {
        ...option,
        value,
        label: option.label || value
      });
    }
  }

  return Array.from(uniqueOptions.values());
}

function filterOptionMatchesQuery(option: FilterOption, query: string) {
  const needle = normalizeFilterText(query);
  if (!needle) {
    return true;
  }

  return [option.value, option.label, ...option.keywords].some((token) =>
    normalizeFilterText(token).includes(needle)
  );
}

function getVisibleFilterOptions(
  options: FilterOption[],
  query: string,
  activeValue: string | null
) {
  const hasQuery = query.trim().length > 0;
  const limit = hasQuery ? SEARCHED_FILTER_LIMIT : QUICK_FILTER_LIMIT;
  const matchedOptions = options.filter((option) => filterOptionMatchesQuery(option, query));
  const sourceOptions = hasQuery && matchedOptions.length === 0 ? options : matchedOptions;
  const visibleOptions = sourceOptions.slice(0, limit);

  if (activeValue && !visibleOptions.some((option) => option.value === activeValue)) {
    const activeOption = options.find((option) => option.value === activeValue);
    if (activeOption) {
      return [activeOption, ...visibleOptions].slice(0, limit);
    }
  }

  return visibleOptions;
}

function findFilterOptionMatch(options: FilterOption[], query: string) {
  const needle = normalizeFilterText(query);
  if (!needle) {
    return null;
  }

  return (
    options.find((option) =>
      [option.value, option.label, ...option.keywords].some(
        (token) => normalizeFilterText(token) === needle
      )
    ) ??
    options.find((option) => filterOptionMatchesQuery(option, query)) ??
    null
  );
}

function FilterRow({
  label,
  options,
  query,
  activeValue,
  onChange,
  onSelect
}: {
  label: string;
  options: FilterOption[];
  query: string;
  activeValue: string | null;
  onChange: (value: string | null) => void;
  onSelect?: () => void;
}) {
  const visibleOptions = useMemo(
    () => getVisibleFilterOptions(options, query, activeValue),
    [activeValue, options, query]
  );

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-6">
      <span className="mt-2 w-20 shrink-0 text-sm font-semibold text-slate-400">{label}</span>
      <div className="flex-1 space-y-2.5">
        <div className="flex flex-wrap gap-2 md:gap-3">
          {visibleOptions.map((option) => {
            const isActive = activeValue === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  onChange(isActive ? null : option.value);
                  onSelect?.();
                }}
                className={`${FILTER_PILL_BASE} ${
                  isActive ? FILTER_PILL_ACTIVE : FILTER_PILL_INACTIVE
                }`}
              >
                {option.label}
              </button>
            );
          })}
          {visibleOptions.length === 0 ? (
            <span className="rounded-full border border-dashed border-slate-200 px-4 py-1.5 text-sm text-slate-400">
              暂无可选项
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ResourceListPage() {
  const queryClient = useQueryClient();
  const currentUserId = useUserStore((state) => state.userId);

  const resourceListQuery = useQuery({
    queryKey: ["resource", "list"],
    queryFn: () => getResourceApi().list(),
    select: normalizeResourceList,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const resourceTagsQuery = useQuery({
    queryKey: ["resource", "tags"],
    queryFn: () => getResourceApi().tags(),
    select: normalizeTextList,
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000
  });

  const resourceTypeDictQuery = useDictQuery("RESOURCE_TYPE");
  const cityNodeDictQuery = useDictQuery("RESOURCE_CITY_NODES");
  const skillDictQuery = useDictQuery("RESOURCE_SKILL_TAGS");
  const regionDictQuery = useDictQuery("RESOURCE_REGION_CODES");
  const wishGoalDictQuery = useDictQuery("RESOURCE_WISH_TAGS");
  const needGoalDictQuery = useDictQuery("RESOURCE_NEED_TAGS");
  const customGoalDictQuery = useDictQuery("RESOURCE_CUSTOM_TAGS");

  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [activeWish, setActiveWish] = useState<string | null>(null);
  const [activeNeed, setActiveNeed] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState("");
  const [notice, setNotice] = useState("");

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { resourceId: number; status: "active" | "inactive" }) =>
      getResourceApi().updateStatus(payload.resourceId, payload.status),
    onSuccess: async (result) => {
      const label = result.status === "active" ? "已上架" : "已下架";
      setNotice(`资源 #${result.resourceId} ${label}`);
      await queryClient.invalidateQueries({ queryKey: ["resource", "list"] });
    },
    onError: (error) => {
      setNotice(`操作失败：${getErrorMessage(error)}`);
    }
  });

  const handleReset = () => {
    setActiveCity(null);
    setActiveSkill(null);
    setActiveWish(null);
    setActiveNeed(null);
    setFilterSearch("");
  };

  const loading = resourceListQuery.isPending || resourceTagsQuery.isPending;
  const error = resourceListQuery.error
    ? getErrorMessage(resourceListQuery.error)
    : resourceTagsQuery.error
      ? getErrorMessage(resourceTagsQuery.error)
      : "";
  const items = resourceListQuery.data ?? [];
  const _tags = resourceTagsQuery.data ?? [];
  const cityFilterOptions = useMemo(
    () => toFilterOptions(cityNodeDictQuery.data?.items, FALLBACK_CITIES),
    [cityNodeDictQuery.data?.items]
  );
  const skillFilterOptions = useMemo(
    () => toFilterOptions(skillDictQuery.data?.items, FALLBACK_SKILLS),
    [skillDictQuery.data?.items]
  );
  const wishFilterOptions = useMemo(
    () => toFilterOptions(wishGoalDictQuery.data?.items, FALLBACK_WISHES),
    [wishGoalDictQuery.data?.items]
  );
  const needFilterOptions = useMemo(
    () => toFilterOptions(needGoalDictQuery.data?.items, FALLBACK_NEEDS),
    [needGoalDictQuery.data?.items]
  );
  const handleFilterSearchEnter = () => {
    const cityMatch = findFilterOptionMatch(cityFilterOptions, filterSearch);
    if (cityMatch) {
      setActiveCity(cityMatch.value);
      return;
    }

    const skillMatch = findFilterOptionMatch(skillFilterOptions, filterSearch);
    if (skillMatch) {
      setActiveSkill(skillMatch.value);
      return;
    }

    const wishMatch = findFilterOptionMatch(wishFilterOptions, filterSearch);
    if (wishMatch) {
      setActiveWish(wishMatch.value);
      return;
    }

    const needMatch = findFilterOptionMatch(needFilterOptions, filterSearch);
    if (needMatch) {
      setActiveNeed(needMatch.value);
    }
  };
  const resourceTypeLabelMap = useMemo(
    () => buildDictLabelMap(resourceTypeDictQuery.data?.items),
    [resourceTypeDictQuery.data?.items]
  );
  const skillLabelMap = useMemo(
    () => buildDictLabelMap(skillDictQuery.data?.items),
    [skillDictQuery.data?.items]
  );
  const regionLabelMap = useMemo(
    () => buildDictLabelMap(regionDictQuery.data?.items),
    [regionDictQuery.data?.items]
  );
  const customLabelMap = useMemo(
    () => buildDictLabelMap(customGoalDictQuery.data?.items),
    [customGoalDictQuery.data?.items]
  );
  const goalLabelMap = useMemo(() => {
    const merged = new Map<string, string>();
    const register = (items: Array<{ code: string; label: string }> | undefined) => {
      for (const item of items ?? []) {
        merged.set(item.code.toLowerCase(), item.label);
      }
    };

    register(wishGoalDictQuery.data?.items);
    register(needGoalDictQuery.data?.items);
    register(customGoalDictQuery.data?.items);
    return merged;
  }, [
    wishGoalDictQuery.data?.items,
    needGoalDictQuery.data?.items,
    customGoalDictQuery.data?.items
  ]);

  const renderResourceType = (value: string) => {
    return resolveResourceTypeLabel(value, resourceTypeLabelMap);
  };

  const renderStatusLabel = (value: string) => {
    const normalized = value.toLowerCase();
    if (normalized === "pending") return "审核中";
    if (normalized === "active") return "已上架";
    if (normalized === "inactive") return "已下架";
    if (normalized === "rejected") return "已驳回";
    return value;
  };

  const getStatusBadgeClass = (value: string) => {
    const normalized = value.toLowerCase();
    if (normalized === "active") {
      return "bg-emerald-50 text-emerald-600 border-emerald-100";
    }
    if (normalized === "inactive") {
      return "bg-slate-100 text-slate-600 border-slate-200";
    }
    if (normalized === "pending") {
      return "bg-amber-50 text-amber-700 border-amber-100";
    }
    if (normalized === "rejected") {
      return "bg-rose-50 text-rose-600 border-rose-100";
    }
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const renderTagLabel = useCallback(
    (tag: string) => {
      return (
        formatResourceTagLabel(tag, {
          resourceType: resourceTypeLabelMap,
          skill: skillLabelMap,
          goal: goalLabelMap,
          custom: customLabelMap,
          region: regionLabelMap
        }) ?? "-"
      );
    },
    [customLabelMap, goalLabelMap, regionLabelMap, resourceTypeLabelMap, skillLabelMap]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const resourceTypeLabel = renderResourceType(item.resourceType);
      const statusLabel = renderStatusLabel(item.status);
      const uploaderLabel = formatUploaderLabel(item.uploader, item.userId);
      const tagTokens = item.tags.flatMap((tag) => [
        tag,
        renderTagLabel(tag),
        ...getRawTagSegments(tag)
      ]);
      const cityTokens = item.tags.flatMap((tag) => {
        const prefix = getTagPrefix(tag);
        if (prefix && !LOCATION_TAG_PREFIXES.has(prefix)) {
          return [];
        }

        return [tag, renderTagLabel(tag), ...getRawTagSegments(tag)];
      });

      if (item.areaCode) {
        cityTokens.push(item.areaCode, regionLabelMap.get(item.areaCode.toLowerCase()) ?? "");
      }

      const keywordTokens = [
        `资源 #${item.resourceId}`,
        String(item.resourceId),
        String(item.userId),
        item.resourceType,
        resourceTypeLabel,
        item.status,
        statusLabel,
        uploaderLabel,
        item.uploader?.nickname ?? "",
        item.uploader?.maskedPhone ?? "",
        item.areaCode ?? "",
        item.areaCode ? (regionLabelMap.get(item.areaCode.toLowerCase()) ?? "") : "",
        ...tagTokens,
        ...cityTokens
      ];

      return (
        matchesKeyword(keywordTokens, filterSearch) &&
        matchesFilter(cityTokens, activeCity) &&
        matchesFilter(tagTokens, activeSkill) &&
        matchesFilter(tagTokens, activeWish) &&
        matchesFilter(tagTokens, activeNeed)
      );
    });
  }, [
    activeCity,
    activeNeed,
    activeSkill,
    activeWish,
    filterSearch,
    items,
    regionLabelMap,
    renderTagLabel
  ]);
  const hasSearchKeyword = filterSearch.trim().length > 0;
  const hasActiveFilters = Boolean(
    activeCity || activeSkill || activeWish || activeNeed || hasSearchKeyword
  );

  return (
    <motion.main
      className="relative isolate mx-auto max-w-6xl space-y-8 bg-slate-50 px-4 py-10 before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] before:[background-size:16px_16px] before:opacity-50 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">资源列表</h1>
            <span className="text-sm font-normal text-slate-400">/ 资源矩阵</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>重置</span>
            </button>
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
              <span className="text-sm text-slate-500">资源总数</span>
              <span className="text-lg font-bold text-slate-900">{filteredItems.length}</span>
            </div>
          </div>
        </div>

        <label className="relative mt-6 block max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={filterSearch}
            onChange={(event) => setFilterSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleFilterSearchEnter();
              }
            }}
            placeholder="搜索城市、技能、心愿或需求"
            aria-label="搜索筛选项"
            className="h-10 w-full rounded-full border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
          />
        </label>

        {/* Dimension Rows */}
        <div className="mt-6 space-y-4">
          <FilterRow
            label="城市节点"
            options={cityFilterOptions}
            query={filterSearch}
            activeValue={activeCity}
            onChange={setActiveCity}
            onSelect={() => setFilterSearch("")}
          />

          <FilterRow
            label="核心技能"
            options={skillFilterOptions}
            query={filterSearch}
            activeValue={activeSkill}
            onChange={setActiveSkill}
            onSelect={() => setFilterSearch("")}
          />

          <FilterRow
            label="目标心愿"
            options={wishFilterOptions}
            query={filterSearch}
            activeValue={activeWish}
            onChange={setActiveWish}
            onSelect={() => setFilterSearch("")}
          />

          <FilterRow
            label="业务需求"
            options={needFilterOptions}
            query={filterSearch}
            activeValue={activeNeed}
            onChange={setActiveNeed}
            onSelect={() => setFilterSearch("")}
          />
        </div>
      </header>

      {notice ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          {notice}
        </section>
      ) : null}

      {loading ? (
        <>
          <p className="animate-pulse text-sm font-medium text-slate-500">加载中...</p>
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="h-5 w-24 animate-pulse rounded-md bg-slate-200" />
                <div className="mt-4 h-4 w-16 animate-pulse rounded-md bg-slate-200" />
                <div className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </section>
        </>
      ) : null}
      {error ? (
        <section className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-rose-700">资源加载失败</h3>
          <p className="mt-2 text-sm text-rose-600">{error}</p>
        </section>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm">
          <h3 className="text-2xl font-semibold tracking-tight text-slate-900">暂无资源</h3>
          <p className="mt-2 text-sm text-slate-500">当前没有可展示的资源记录。</p>
          <Link
            href="/resource/new"
            className="mt-6 inline-flex rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
          >
            去发布资源
          </Link>
        </section>
      ) : null}

      {!loading && !error && items.length > 0 && filteredItems.length === 0 ? (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm">
          <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
            {hasSearchKeyword ? "暂时还没有该资源" : "暂无匹配资源"}
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            {hasSearchKeyword
              ? "没有检索到相关资源，可以换个关键词或重置筛选。"
              : "当前筛选条件下没有可展示的资源记录。"}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleReset}
              className="mt-6 inline-flex rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              重置筛选
            </button>
          ) : null}
        </section>
      ) : null}

      {!loading && !error && filteredItems.length > 0 ? (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const allTagLabels = item.tags
              .map((tag) => renderTagLabel(tag))
              .filter((label) => label && label !== "-");
            const wishTagLabels = allTagLabels
              .filter((label) => label.startsWith("愿望："))
              .map((label) => label.replace(/^愿望：/, ""));
            const uploaderLabel = formatUploaderLabel(item.uploader, item.userId);
            const isCurrentUserResource = item.userId === currentUserId;

            return (
              <motion.article
                key={item.resourceId}
                className={`rounded-[1.5rem] border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                  isCurrentUserResource
                    ? "border-cyan-300 bg-gradient-to-br from-cyan-50 via-white to-sky-50 shadow-[0_18px_40px_rgba(6,182,212,0.16)] ring-2 ring-cyan-100"
                    : "border-slate-200"
                }`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {isCurrentUserResource ? (
                  <div className="mb-4 inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold tracking-[0.18em] text-cyan-700 shadow-sm">
                    我的资源
                  </div>
                ) : null}
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">资源 #{item.resourceId}</h3>
                  <div className="flex items-center gap-2">
                    {isCurrentUserResource ? (
                      <span className="rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-bold text-cyan-700">
                        当前账号发布
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusBadgeClass(
                        item.status
                      )}`}
                    >
                      {renderStatusLabel(item.status)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 w-12 shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      类型
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                      {renderResourceType(item.resourceType)}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 w-12 shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      标签
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {allTagLabels.length > 0 ? (
                        allTagLabels.map((label) => (
                          <span
                            key={`${item.resourceId}-${label}`}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 shadow-sm"
                          >
                            {label}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm font-medium text-slate-700">-</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 w-12 shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      愿望
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {wishTagLabels.length > 0 ? (
                        wishTagLabels.map((label) => (
                          <span
                            key={`${item.resourceId}-wish-${label}`}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 shadow-sm"
                          >
                            {label}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm font-medium text-slate-700">-</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  {isCurrentUserResource &&
                    (item.status === "active" || item.status === "inactive") && (
                      <button
                        type="button"
                        disabled={updateStatusMutation.isPending}
                        onClick={() =>
                          updateStatusMutation.mutate({
                            resourceId: item.resourceId,
                            status: item.status === "active" ? "inactive" : "active"
                          })
                        }
                        className={`rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all disabled:opacity-60 ${
                          item.status === "active"
                            ? "hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            : "hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {item.status === "active" ? "下架" : "上架"}
                      </button>
                    )}
                  {isCurrentUserResource && item.status === "pending" ? (
                    <span className="text-xs text-amber-600">审核中，暂不可上下架</span>
                  ) : null}
                  <span
                    className={`ml-auto text-xs ${
                      isCurrentUserResource ? "font-semibold text-cyan-700" : "text-slate-400"
                    }`}
                  >
                    {isCurrentUserResource ? "我的资源" : `上传者：${uploaderLabel}`}
                  </span>
                </div>
              </motion.article>
            );
          })}
        </section>
      ) : null}
    </motion.main>
  );
}
