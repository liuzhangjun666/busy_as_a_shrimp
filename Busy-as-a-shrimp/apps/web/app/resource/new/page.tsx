"use client";

import type { FieldPath } from "react-hook-form";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import type { ResourceType } from "@airp/api-types";
import { getResourceApi } from "@/api";
import {
  ComplianceCheckWrapper,
  getComplianceViolationMessage
} from "@/components/resource/compliance-check-wrapper";
import { ResourceBasicInfoForm } from "@/components/resource/resource-basic-info-form";
import {
  buildUploadTags,
  resourceFormDefaultValues,
  resourceFormSchema,
  type ResourceFormValues,
  type ResourceTypeOption,
  type TagOption
} from "@/components/resource/resource-form.config";
import { TagSelectorField } from "@/components/resource/tag-selector-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useDictQuery } from "@/hooks/use-dict-query";
import { toast } from "@/hooks/use-toast";
import { useAuthStatus } from "@/stores/use-auth-status";
import { getErrorMessage } from "@/utils/error-message";

const RESOURCE_TYPE_VALUES: ResourceType[] = ["skill", "location", "account", "time"];

function normalizeResourceType(value: string): ResourceType | null {
  const normalized = value.trim().toLowerCase();
  return RESOURCE_TYPE_VALUES.includes(normalized as ResourceType)
    ? (normalized as ResourceType)
    : null;
}

function isResourceType(value: string): value is ResourceType {
  return normalizeResourceType(value) !== null;
}

function toResourceTypeOptions(
  source: Array<{ code: string; label: string; value: string }>
): ResourceTypeOption[] {
  return source
    .filter((item) => isResourceType(item.code))
    .map((item) => ({
      value: normalizeResourceType(item.code) as ResourceType,
      label: item.value || item.label
    }));
}

function toSkillTagOptions(source: Array<{ label: string; value: string }>): TagOption[] {
  return source.map((item) => ({
    value: item.value || item.label,
    label: item.label || item.value
  }));
}

function toRegionTagOptions(
  source: Array<{ code: string; label: string; value: string }>
): TagOption[] {
  return source.map((item) => ({
    value: item.code,
    label: item.value || item.label || item.code
  }));
}

function toCustomTagOptions(source: Array<{ label: string; value: string }>): TagOption[] {
  return source.map((item) => ({
    value: item.value || item.label,
    label: item.label || item.value
  }));
}

export default function ResourceNewPage() {
  const { hydrated, isLoggedIn } = useAuthStatus();
  const [submitting, setSubmitting] = useState(false);
  const [complianceWarning, setComplianceWarning] = useState("");

  const form = useForm<ResourceFormValues>({
    defaultValues: resourceFormDefaultValues
  });

  const resourceTypeDictQuery = useDictQuery("RESOURCE_TYPE", {
    enabled: hydrated && isLoggedIn
  });
  const skillTagDictQuery = useDictQuery("RESOURCE_SKILL_TAGS", {
    enabled: hydrated && isLoggedIn
  });
  const regionTagDictQuery = useDictQuery("RESOURCE_REGION_CODES", {
    enabled: hydrated && isLoggedIn
  });
  const customTagDictQuery = useDictQuery("RESOURCE_CUSTOM_TAGS", {
    enabled: hydrated && isLoggedIn
  });

  const resourceTypeOptions = useMemo(
    () => toResourceTypeOptions(resourceTypeDictQuery.data?.items ?? []),
    [resourceTypeDictQuery.data?.items]
  );
  const skillOptions = useMemo(
    () => toSkillTagOptions(skillTagDictQuery.data?.items ?? []),
    [skillTagDictQuery.data?.items]
  );
  const regionOptions = useMemo(
    () => toRegionTagOptions(regionTagDictQuery.data?.items ?? []),
    [regionTagDictQuery.data?.items]
  );
  const commonCustomTagOptions = useMemo(
    () => toCustomTagOptions(customTagDictQuery.data?.items ?? []),
    [customTagDictQuery.data?.items]
  );

  const COMMON_SKILL_TAGS = useMemo(
    () => skillOptions.slice(0, 5).map((item) => item.value),
    [skillOptions]
  );
  const COMMON_REGION_TAGS = useMemo(
    () => regionOptions.slice(0, 4).map((item) => item.value),
    [regionOptions]
  );
  const COMMON_CUSTOM_TAGS = useMemo(
    () => commonCustomTagOptions.map((item) => item.value),
    [commonCustomTagOptions]
  );
  const regionLabelMap = useMemo(
    () => new Map(regionOptions.map((item) => [item.value, item.label])),
    [regionOptions]
  );

  const dictLoading =
    resourceTypeDictQuery.isPending ||
    skillTagDictQuery.isPending ||
    regionTagDictQuery.isPending ||
    customTagDictQuery.isPending;

  const dictError =
    resourceTypeDictQuery.error ??
    skillTagDictQuery.error ??
    regionTagDictQuery.error ??
    customTagDictQuery.error;

  useEffect(() => {
    if (skillOptions.length > 0 && form.getValues("selectedSkills").length === 0) {
      form.setValue("selectedSkills", [skillOptions[0].value], { shouldDirty: false });
    }
    if (regionOptions.length > 0 && form.getValues("selectedRegions").length === 0) {
      form.setValue("selectedRegions", [regionOptions[0].value], { shouldDirty: false });
    }
  }, [form, skillOptions, regionOptions]);

  if (!hydrated) {
    return (
      <Card className="rounded-3xl bg-white/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-zinc-100 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight text-zinc-900">
            新建资源
          </CardTitle>
          <CardDescription className="text-zinc-500">正在初始化登录状态...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isLoggedIn) {
    return (
      <Card className="rounded-3xl bg-white/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-zinc-100 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight text-zinc-900">
            新建资源
          </CardTitle>
          <CardDescription className="text-zinc-500">请先登录后再上传资源。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            asChild
            className="rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 text-white shadow-sm ring-1 ring-inset ring-white/10 transition-all duration-200 hover:-translate-y-[1px]"
          >
            <Link href="/auth">去登录</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  async function onSubmit(values: ResourceFormValues) {
    form.clearErrors();
    setComplianceWarning("");

    if (dictLoading) {
      toast({
        variant: "destructive",
        title: "字典加载中",
        description: "请稍候，正在同步标签与资源类型。"
      });
      return;
    }

    if (dictError) {
      toast({
        variant: "destructive",
        title: "字典加载失败",
        description: getErrorMessage(dictError)
      });
      return;
    }

    const parsed = resourceFormSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const fieldName = issue.path[0];
        if (typeof fieldName === "string") {
          form.setError(fieldName as FieldPath<ResourceFormValues>, {
            type: "manual",
            message: issue.message
          });
        }
      }

      toast({
        variant: "destructive",
        title: "表单校验失败",
        description: "请检查必填项与预算区间。"
      });
      return;
    }

    const complianceMessage = getComplianceViolationMessage([
      parsed.data.skill,
      parsed.data.location,
      parsed.data.account,
      parsed.data.time,
      parsed.data.notes,
      parsed.data.customTags.join(" "),
      parsed.data.selectedSkills.join(" "),
      parsed.data.selectedRegions.join(" ")
    ]);

    if (complianceMessage) {
      setComplianceWarning(complianceMessage);
      toast({
        variant: "destructive",
        title: "合规校验未通过",
        description: complianceMessage
      });
      return;
    }

    const min = Number(parsed.data.priceMin);
    const max = Number(parsed.data.priceMax);

    setSubmitting(true);
    try {
      const result = await getResourceApi().upload({
        resourceType: parsed.data.resourceType,
        tags: buildUploadTags(parsed.data, {
          resolveRegionLabel: (code) => regionLabelMap.get(code) ?? code
        }),
        areaCode: parsed.data.selectedRegions[0],
        priceRange: {
          min,
          max
        }
      });

      toast({
        title: "资源上传成功",
        description: `资源 #${result.resourceId}，等待审核通过发布`
      });

      form.reset(resourceFormDefaultValues);
      setComplianceWarning("");
    } catch (submitError) {
      toast({
        variant: "destructive",
        title: "资源上传失败",
        description: getErrorMessage(submitError)
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <ComplianceCheckWrapper warningMessage={complianceWarning}>
        <div className="overflow-hidden rounded-3xl bg-white/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-zinc-100 backdrop-blur-xl sm:p-10">
          <div className="mb-7 h-1 w-full rounded-full bg-gradient-to-r from-zinc-300 via-zinc-800 to-zinc-300" />

          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <ResourceBasicInfoForm form={form} resourceTypeOptions={resourceTypeOptions} />

              <Card className="rounded-2xl bg-white/65 p-6 shadow-none ring-1 ring-zinc-100">
                <CardHeader className="px-0 pb-4 pt-0">
                  <CardTitle className="text-lg font-semibold tracking-tight text-zinc-900">
                    标签选择
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    支持搜索添加、常用标签和自定义标签。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 px-0 pb-0">
                  {dictLoading ? (
                    <p className="text-xs text-zinc-500">正在加载字典选项...</p>
                  ) : null}
                  {dictError ? (
                    <p className="text-xs text-rose-500">
                      字典加载失败：{getErrorMessage(dictError)}
                    </p>
                  ) : null}

                  <FormField
                    control={form.control}
                    name="selectedSkills"
                    render={({ field }) => (
                      <FormItem>
                        <TagSelectorField
                          label="技能标签"
                          description="用于匹配算法推荐，至少选择一个。"
                          placeholder="搜索技能标签"
                          options={skillOptions}
                          commonValues={COMMON_SKILL_TAGS}
                          value={field.value ?? []}
                          onChange={field.onChange}
                          allowCustom
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="selectedRegions"
                    render={({ field }) => (
                      <FormItem>
                        <TagSelectorField
                          label="地区标签"
                          description="第一项将作为 areaCode 上传。"
                          placeholder="搜索城市或区域"
                          options={regionOptions}
                          commonValues={COMMON_REGION_TAGS}
                          value={field.value ?? []}
                          onChange={field.onChange}
                          allowCustom
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customTags"
                    render={({ field }) => (
                      <FormItem>
                        <TagSelectorField
                          label="自定义标签"
                          description="可补充场景、赛道、合作偏好等关键词。"
                          placeholder="输入后点击添加"
                          options={commonCustomTagOptions}
                          commonValues={COMMON_CUSTOM_TAGS}
                          value={field.value ?? []}
                          onChange={field.onChange}
                          allowCustom
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-zinc-500">
                  提交后将进入审核流程，审核通过后进入匹配池。
                </p>
                <Button
                  type="submit"
                  disabled={submitting || dictLoading || Boolean(dictError)}
                  className="min-w-36 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 px-8 py-2.5 text-white shadow-sm ring-1 ring-inset ring-white/10 transition-all duration-200 hover:-translate-y-[1px]"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? "提交中..." : "提交资源"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </ComplianceCheckWrapper>
    </section>
  );
}
