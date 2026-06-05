"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { CampusFilterOptions, CampusFilters } from "@/components/campus-recruitment-section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CampusFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: CampusFilters;
  options: CampusFilterOptions;
  onApply: (nextFilters: CampusFilters) => void;
  className?: string;
}

function toggleFilterValue(values: string[], value: string): string[] {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }
  return [...values, value];
}

function areFiltersEqual(a: CampusFilters, b: CampusFilters): boolean {
  if (a.locations.length !== b.locations.length || a.industries.length !== b.industries.length) {
    return false;
  }
  const leftLocations = [...a.locations].sort();
  const rightLocations = [...b.locations].sort();
  const leftIndustries = [...a.industries].sort();
  const rightIndustries = [...b.industries].sort();

  return (
    leftLocations.every((item, index) => item === rightLocations[index]) &&
    leftIndustries.every((item, index) => item === rightIndustries[index])
  );
}

function FilterSection({
  title,
  items,
  selectedValues,
  onToggle
}: {
  title: string;
  items: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        <span className="text-xs text-slate-400">已选 {selectedValues.length}</span>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const selected = selectedValues.includes(item);

            return (
              <button
                key={item}
                type="button"
                onClick={() => onToggle(item)}
                className={cn(
                  "inline-flex h-8 items-center rounded-md border px-2.5 text-xs transition-colors",
                  selected
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
                )}
              >
                {item}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-400">暂无可用选项</p>
      )}
    </div>
  );
}

export function CampusFilterSheet({
  open,
  onOpenChange,
  filters,
  options,
  onApply,
  className
}: CampusFilterSheetProps) {
  const [draftFilters, setDraftFilters] = useState<CampusFilters>(filters);

  useEffect(() => {
    if (open) {
      setDraftFilters(filters);
    }
  }, [filters, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onOpenChange, open]);

  const isDirty = useMemo(() => !areFiltersEqual(draftFilters, filters), [draftFilters, filters]);

  const resetDraft = () => {
    setDraftFilters({
      locations: [],
      industries: []
    });
  };

  const handleApply = () => {
    onApply(draftFilters);
    onOpenChange(false);
  };

  return (
    <div
      className={cn("pointer-events-none absolute inset-y-0 right-0 z-40", className)}
      aria-hidden={!open}
      data-open={open}
    >
      <aside
        className={cn(
          "pointer-events-auto flex h-full w-screen flex-col border-l border-slate-200 bg-white/95 shadow-[-24px_0_40px_-24px_rgba(15,23,42,0.22)] backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-[360px]",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-slate-500" />
              <h3 className="text-base font-semibold text-slate-900">筛选条件</h3>
            </div>
            <button
              type="button"
              aria-label="关闭筛选面板"
              onClick={() => onOpenChange(false)}
              className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            按地区与行业筛选当前校招岗位列表。
          </p>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <FilterSection
            title="地区"
            items={options.locations}
            selectedValues={draftFilters.locations}
            onToggle={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                locations: toggleFilterValue(prev.locations, value)
              }))
            }
          />
          <FilterSection
            title="行业"
            items={options.industries}
            selectedValues={draftFilters.industries}
            onToggle={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                industries: toggleFilterValue(prev.industries, value)
              }))
            }
          />
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button type="button" variant="outline" onClick={resetDraft}>
            重置
          </Button>
          <Button type="button" onClick={handleApply} disabled={!isDirty}>
            应用筛选
          </Button>
        </footer>
      </aside>
    </div>
  );
}
