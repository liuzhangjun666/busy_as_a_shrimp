import type { ResourceType } from "@airp/api-types";
import { z } from "zod";

export type TagOption = {
  value: string;
  label: string;
};

export type ResourceTypeOption = { value: ResourceType; label: string };

const resourceFormSchemaBase = z.object({
  resourceType: z.enum(["skill", "location", "account", "time"]),
  skill: z.string().min(1, "请填写核心技能"),
  location: z.string().min(1, "请填写地点信息"),
  account: z.string().min(1, "请填写平台内账号标识"),
  time: z.string().min(1, "请填写可合作时间"),
  selectedSkills: z.array(z.string()).min(1, "至少选择 1 个技能标签"),
  selectedRegions: z.array(z.string()).min(1, "至少选择 1 个地区标签"),
  customTags: z.array(z.string()).max(20, "自定义标签最多 20 个"),
  notes: z.string().max(200, "补充说明最多 200 字"),
  priceMin: z.string().regex(/^\d+$/, "预算最小值需为非负整数"),
  priceMax: z.string().regex(/^\d+$/, "预算最大值需为非负整数")
});

export const resourceFormSchema = resourceFormSchemaBase.superRefine((value, ctx) => {
  const min = Number(value.priceMin);
  const max = Number(value.priceMax);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["priceMax"],
      message: "预算最大值需大于等于最小值"
    });
  }
});

export type ResourceFormValues = z.infer<typeof resourceFormSchema>;

export const resourceFormDefaultValues: ResourceFormValues = {
  resourceType: "skill",
  skill: "",
  location: "",
  account: "",
  time: "",
  selectedSkills: [],
  selectedRegions: [],
  customTags: [],
  notes: "",
  priceMin: "500",
  priceMax: "3000"
};

export function buildUploadTags(
  values: ResourceFormValues,
  options?: {
    resolveRegionLabel?: (code: string) => string;
  }
): string[] {
  const tags = new Set<string>();
  const resolveRegionLabel = options?.resolveRegionLabel ?? ((code: string) => code);

  for (const skill of values.selectedSkills) {
    tags.add(`skill:${skill}`);
  }

  for (const regionCode of values.selectedRegions) {
    tags.add(`region:${resolveRegionLabel(regionCode)}`);
  }

  tags.add(`core_skill:${values.skill}`);
  tags.add(`core_location:${values.location}`);
  tags.add(`core_account:${values.account}`);
  tags.add(`core_time:${values.time}`);

  for (const customTag of values.customTags) {
    tags.add(customTag);
  }

  return Array.from(tags);
}
