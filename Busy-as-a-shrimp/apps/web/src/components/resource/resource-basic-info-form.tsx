"use client";

import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import type { UseFormReturn } from "react-hook-form";

import {
  type ResourceFormValues,
  type ResourceTypeOption
} from "@/components/resource/resource-form.config";
import { cn } from "@/lib/utils";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ResourceBasicInfoFormProps = {
  form: UseFormReturn<ResourceFormValues>;
  resourceTypeOptions: ResourceTypeOption[];
};

type ImageProcessStatus = "compressing" | "scanning" | "ready";

type UploadListItem = {
  id: string;
  fileName: string;
  fileSizeLabel: string;
  status: ImageProcessStatus;
  hash: string;
};

const inputClassName =
  "h-11 rounded-xl border border-transparent bg-zinc-50/50 text-zinc-900 placeholder:text-zinc-400 transition-all duration-200 hover:bg-zinc-100/70 focus-visible:border-zinc-300 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-zinc-100";

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function buildMockHash(file: File): string {
  const base = `${file.name}-${file.size}-${file.lastModified}`;
  let hash = 0;

  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }

  return `mock_${hash.toString(16).padStart(8, "0")}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function mockImageProcess(
  file: File,
  onStatusChange: (status: ImageProcessStatus) => void
): Promise<{ hash: string }> {
  // Placeholder for future integration with browser-image-compression.
  onStatusChange("compressing");
  await sleep(1000);

  onStatusChange("scanning");
  await sleep(1000);

  return {
    hash: buildMockHash(file)
  };
}

export function ResourceBasicInfoForm({ form, resourceTypeOptions }: ResourceBasicInfoFormProps) {
  const [uploadItems, setUploadItems] = useState<UploadListItem[]>([]);

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    for (const file of files) {
      const itemId = `${file.name}-${file.lastModified}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
      const baseItem: UploadListItem = {
        id: itemId,
        fileName: file.name,
        fileSizeLabel: formatFileSize(file.size),
        status: "compressing",
        hash: ""
      };

      setUploadItems((prev) => [baseItem, ...prev]);

      const result = await mockImageProcess(file, (status) => {
        setUploadItems((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, status } : item))
        );
      });

      setUploadItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: "ready",
                hash: result.hash
              }
            : item
        )
      );
    }

    event.target.value = "";
  }

  return (
    <section className="space-y-5 rounded-2xl bg-white/65 p-6 ring-1 ring-zinc-100">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">资源基础信息</h2>
        <p className="text-xs text-zinc-500">填写核心字段：技能、地点、账号、时间。</p>
      </header>

      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="resourceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold tracking-tight text-zinc-900">
                  资源类型
                </FormLabel>
                <FormDescription className="text-xs text-zinc-500">
                  选择最符合当前资源形态的类型。
                </FormDescription>
                <FormControl>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {resourceTypeOptions.length > 0 ? (
                      resourceTypeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => field.onChange(option.value)}
                          className={cn(
                            "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all duration-200",
                            field.value === option.value
                              ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                              : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
                          )}
                        >
                          {option.label}
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-zinc-500">资源类型字典尚未加载。</p>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="skill"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold tracking-tight text-zinc-900">
                  核心技能 (skill)
                </FormLabel>
                <FormControl>
                  <Input placeholder="例：探店脚本策划" className={inputClassName} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold tracking-tight text-zinc-900">
                  地点 (location)
                </FormLabel>
                <FormControl>
                  <Input placeholder="例：上海徐汇" className={inputClassName} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="account"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold tracking-tight text-zinc-900">
                  账号 (account)
                </FormLabel>
                <FormControl>
                  <Input placeholder="例：平台内账号ID" className={inputClassName} {...field} />
                </FormControl>
                <FormDescription className="text-xs text-zinc-500">
                  禁止填写手机号、微信、QQ、邮箱。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold tracking-tight text-zinc-900">
                  时间 (time)
                </FormLabel>
                <FormControl>
                  <Input placeholder="例：周末晚间" className={inputClassName} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="priceMin"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold tracking-tight text-zinc-900">
                  预算最小值
                </FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    placeholder="500"
                    className={inputClassName}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priceMax"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold tracking-tight text-zinc-900">
                  预算最大值
                </FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    placeholder="3000"
                    className={inputClassName}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold tracking-tight text-zinc-900">
                补充说明（可选）
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="例：倾向本地生活赛道合作，需支持周末出镜。"
                  maxLength={200}
                  className="min-h-[112px] rounded-xl border border-transparent bg-zinc-50/50 text-zinc-900 placeholder:text-zinc-400 transition-all duration-200 hover:bg-zinc-100/70 focus-visible:border-zinc-300 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-zinc-100"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs text-zinc-500">
                补充说明会参与合规校验，请勿填写私联信息。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold tracking-tight text-zinc-900">
              资源凭证 / 图片上传
            </p>
            <p className="text-xs text-zinc-500">
              选择图片后将自动执行压缩和哈希安全校验（Mock）。
            </p>
          </div>

          <label className="inline-flex cursor-pointer items-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-[1px] hover:bg-zinc-800">
            选择图片
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                void handleImageUpload(event);
              }}
            />
          </label>

          {uploadItems.length > 0 ? (
            <ul className="space-y-2">
              {uploadItems.map((item) => {
                const progressWidth =
                  item.status === "compressing"
                    ? "w-[45%]"
                    : item.status === "scanning"
                      ? "w-[82%]"
                      : "w-full";
                const statusText =
                  item.status === "compressing"
                    ? "正在压缩 (Compressing)"
                    : item.status === "scanning"
                      ? "安全哈希校验 (Scanning)"
                      : "✅ 就绪 (Ready)";

                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-zinc-200 bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-800">
                          {item.fileName}
                        </p>
                        <p className="text-xs text-zinc-500">{item.fileSizeLabel}</p>
                      </div>
                      <div className="shrink-0">
                        {item.status === "ready" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {statusText}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                            {item.status === "compressing" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ShieldCheck className="h-3.5 w-3.5" />
                            )}
                            {statusText}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={`h-full rounded-full bg-zinc-800 transition-all duration-500 ${progressWidth}`}
                      />
                    </div>

                    {item.status === "ready" ? (
                      <p className="mt-2 font-mono text-[11px] text-zinc-500">Hash: {item.hash}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
