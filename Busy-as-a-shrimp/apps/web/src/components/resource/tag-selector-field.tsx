"use client";

import { Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { TagOption } from "@/components/resource/resource-form.config";
import { Input } from "@/components/ui/input";

function normalizeTag(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

type TagSelectorFieldProps = {
  label: string;
  description?: string;
  placeholder?: string;
  options: TagOption[];
  commonValues?: string[];
  value: string[];
  onChange: (next: string[]) => void;
  allowCustom?: boolean;
};

export function TagSelectorField({
  label,
  description,
  placeholder,
  options,
  commonValues,
  value,
  onChange,
  allowCustom = true
}: TagSelectorFieldProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const selectedSet = useMemo(() => new Set(value), [value]);
  const optionMap = useMemo(() => {
    const map = new Map<string, TagOption>();
    for (const option of options) {
      map.set(option.value, option);
    }
    return map;
  }, [options]);

  const commonOptions = useMemo(() => {
    if (!commonValues || commonValues.length === 0) {
      return [] as TagOption[];
    }
    return commonValues
      .map((item) => optionMap.get(item) ?? { value: item, label: item })
      .filter((item, index, arr) => arr.findIndex((v) => v.value === item.value) === index);
  }, [commonValues, optionMap]);

  const normalizedSearch = normalizeTag(searchTerm).toLowerCase();

  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) {
      return options.filter((option) => !selectedSet.has(option.value)).slice(0, 12);
    }

    return options
      .filter((option) => {
        if (selectedSet.has(option.value)) {
          return false;
        }
        return (
          option.label.toLowerCase().includes(normalizedSearch) ||
          option.value.toLowerCase().includes(normalizedSearch)
        );
      })
      .slice(0, 12);
  }, [normalizedSearch, options, selectedSet]);

  const canCreateCustom = useMemo(() => {
    if (!allowCustom) {
      return false;
    }
    const next = normalizeTag(searchTerm);
    if (!next) {
      return false;
    }
    return !value.some((tag) => tag.toLowerCase() === next.toLowerCase());
  }, [allowCustom, searchTerm, value]);

  function toggleTag(tag: string) {
    if (selectedSet.has(tag)) {
      onChange(value.filter((item) => item !== tag));
      return;
    }
    onChange([...value, tag]);
  }

  function addCustomTag() {
    const next = normalizeTag(searchTerm);
    if (!next) {
      return;
    }

    if (value.some((tag) => tag.toLowerCase() === next.toLowerCase())) {
      setSearchTerm("");
      return;
    }

    onChange([...value, next]);
    setSearchTerm("");
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white/65 p-5 ring-1 ring-zinc-100">
      <div className="space-y-1">
        <p className="text-sm font-semibold tracking-tight text-zinc-900">{label}</p>
        {description ? <p className="text-xs text-zinc-500">{description}</p> : null}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2.5">
          {value.length === 0 ? (
            <span className="text-xs text-zinc-500">尚未选择标签</span>
          ) : (
            value.map((tag) => {
              const displayLabel = optionMap.get(tag)?.label ?? tag;
              return (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white shadow-sm"
                >
                  {displayLabel}
                  <button
                    type="button"
                    aria-label={`删除标签 ${displayLabel}`}
                    onClick={() => toggleTag(tag)}
                    className="rounded-full p-0.5 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={placeholder ?? "搜索并添加标签"}
              className="h-11 rounded-xl border border-transparent bg-zinc-50/50 py-3 pl-10 text-zinc-900 placeholder:text-zinc-400 transition-all duration-200 hover:bg-zinc-100/70 focus-visible:border-zinc-300 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-zinc-100"
            />
          </div>
          {allowCustom ? (
            <button
              type="button"
              onClick={addCustomTag}
              disabled={!canCreateCustom}
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-600 transition-all duration-200 hover:-translate-y-[1px] hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              添加自定义
            </button>
          ) : null}
        </div>
      </div>

      {commonOptions.length > 0 ? (
        <div className="space-y-2">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
            推荐标签
          </p>
          <div className="flex flex-wrap gap-2.5">
            {commonOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleTag(option.value)}
                className={
                  selectedSet.has(option.value)
                    ? "inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white shadow-sm"
                    : "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-600 transition-all duration-200 hover:-translate-y-[1px] hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm"
                }
              >
                {!selectedSet.has(option.value) ? <Plus className="h-3 w-3 text-zinc-400" /> : null}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">搜索结果</p>
        {filteredOptions.length === 0 ? (
          <p className="text-xs text-zinc-500">未找到更多可选标签，尝试输入自定义标签。</p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleTag(option.value)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-600 transition-all duration-200 hover:-translate-y-[1px] hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm"
              >
                <Plus className="h-3 w-3 text-zinc-400" />
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
