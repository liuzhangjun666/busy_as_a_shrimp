"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ActivationDetailsPayload, ActivationStepKey, ResourceType } from "@airp/api-types";
import { getResourceApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDictQuery } from "@/hooks/use-dict-query";
import { RESOURCE_ACTIVATION_QUERY_KEY } from "@/hooks/use-resource-activation-status";
import { toast } from "@/hooks/use-toast";
import { useAuthStatus } from "@/stores/use-auth-status";
import { getErrorMessage } from "@/utils/error-message";

type DictItem = {
  code: string;
  label: string;
  value: string;
  remark?: string;
};

type ActivationStep = 0 | 1 | 2;

type StepKey = "resource" | "skill" | "goal";

type OptionItem = {
  value: string;
  label: string;
  intro: string;
  example: string;
  isCustom?: boolean;
};

type SelectedValuesByStep = Record<StepKey, string[]>;
type NotesByStep = Record<StepKey, Record<string, string>>;
type CustomOptionsByStep = Record<StepKey, OptionItem[]>;

const STEP_KEYS: readonly StepKey[] = ["resource", "skill", "goal"];
const STEP_LABELS: Record<StepKey, string> = {
  resource: "资源",
  skill: "技能",
  goal: "愿望"
};

const STEP_TITLES: Record<StepKey, string> = {
  resource: "第 1 步：选择你可激活的资源",
  skill: "第 2 步：选择你的关键技能",
  goal: "第 3 步：选择你的目标愿望"
};

const STEP_DESCRIPTIONS: Record<StepKey, string> = {
  resource: "可多选。每个选项都有说明，勾选后补充你的具体情况，系统会按项保存。",
  skill: "可多选。建议写清技能水平、可交付内容与可投入时段，方便后续匹配。",
  goal: "可多选。建议写清你希望的合作结果、偏好条件与时间预期。"
};

const RESOURCE_TYPE_VALUES: readonly ResourceType[] = ["skill", "location", "account", "time"];

const RESOURCE_INTRO_FALLBACK: Record<string, string> = {
  skill: "适合你有人脉、技术、经验可直接提供给合作方。",
  location: "适合你有本地渠道、线下场地、地域优势可用于落地。",
  account: "适合你有账号矩阵、流量入口、私域资产可用于转化。",
  time: "适合你有稳定可投入时间，能持续协作推进任务。"
};

const OPTION_EXAMPLE_BY_STEP: Record<StepKey, Record<string, string>> = {
  resource: {
    skill: "例如：可提供 2 位兼职剪辑，3 天内可交 10 条短视频。",
    location: "例如：覆盖徐汇和浦东，可落地 6 所高校社团活动。",
    account: "例如：自有 3 个本地生活号，总粉丝 8 万，日均曝光 1.5 万。",
    time: "例如：工作日 19:00-23:00、周末全天可投入，每周至少 20 小时。"
  },
  skill: {
    short_video_script: "例如：擅长探店脚本，1 天可产出 3 条 30 秒口播稿。",
    visit_store_shoot: "例如：每周可到店拍摄 3 场，含机位与分镜执行。",
    live_stream_ops: "例如：可独立控场 2 小时直播，并沉淀复用话术模板。",
    ai_editing: "例如：可用 AI 批量剪辑，48 小时交付 10 条混剪视频。",
    graphic_design: "例如：可输出海报/封面/详情页，支持品牌统一视觉风格。",
    creator_bd: "例如：可对接 20 位本地达人，平均 3 天内完成排期。",
    brand_strategy: "例如：可做月度内容策略，明确人群定位和增长节奏。"
  },
  goal: {
    seek_partner: "例如：希望找到 1-2 位长期合伙人，按月协作推进项目。",
    resource_swap: "例如：我出拍摄团队，你出渠道流量，按单互换资源。",
    cross_industry: "例如：希望与本地健身/餐饮门店联名做联合活动。",
    traffic_share: "例如：双方互推 2 周，目标新增 2000 精准粉。",
    project_outsource: "例如：有 30 条短视频需求，按周外包交付。",
    recruit_anchor: "例如：招 2 位兼职主播，晚间档可稳定开播。",
    long_term: "例如：希望合作周期至少 3 个月，持续打磨账号模型。",
    short_term: "例如：先试跑 2 周活动，验证 ROI 后再扩大投入。",
    weekend: "例如：优先周末线下执行，适合兼职协作节奏。",
    part_time: "例如：每天晚间可协作 3 小时，适合轻量项目。",
    one_time: "例如：按单次结算，单条内容交付后即完成付款。",
    remote: "例如：全程远程协作，使用飞书/腾讯会议同步进度。"
  }
};

function sanitizeRedirect(redirect: string | null): string {
  if (!redirect || !redirect.startsWith("/")) {
    return "/";
  }

  return redirect;
}

function isResourceTypeValue(value: string): value is ResourceType {
  return (RESOURCE_TYPE_VALUES as readonly string[]).includes(value);
}

function resolveUploadResourceTypes(
  selectedResourceTypes: string[],
  selectedSkills: string[]
): ResourceType[] {
  const normalized = Array.from(new Set(selectedResourceTypes.filter(isResourceTypeValue)));
  if (normalized.length > 0) {
    return normalized;
  }

  if (selectedSkills.length > 0) {
    return ["skill"];
  }

  return ["location"];
}

function mergeGoalItems(wishItems: DictItem[], needItems: DictItem[]): DictItem[] {
  const merged = [...wishItems, ...needItems];
  const uniqueMap = new Map<string, DictItem>();

  for (const item of merged) {
    if (!uniqueMap.has(item.code)) {
      uniqueMap.set(item.code, item);
    }
  }

  return Array.from(uniqueMap.values());
}

function resolveOptionIntro(stepKey: StepKey, item: DictItem): string {
  const remark = item.remark?.trim();
  if (remark) {
    return remark;
  }

  if (stepKey === "resource") {
    return RESOURCE_INTRO_FALLBACK[item.code] ?? "适合你可稳定输出的资源类型。";
  }

  if (stepKey === "skill") {
    return "请补充你的技能水平、案例和可交付方式。";
  }

  return "请补充你的目标结果与偏好条件，便于系统理解你的意图。";
}

function resolveOptionExample(stepKey: StepKey, item: DictItem): string {
  const byCode = OPTION_EXAMPLE_BY_STEP[stepKey][item.code];
  if (byCode) {
    return byCode;
  }

  const rawLabel = item.value || item.label || item.code;
  const label = stepKey === "resource" && item.code === "skill" ? "资源" : rawLabel;

  if (stepKey === "resource") {
    return `例如：可提供哪些${label}、覆盖范围和可投入时间。`;
  }

  if (stepKey === "skill") {
    return `例如：${label}能做到什么水平、交付周期和过往案例。`;
  }

  return `例如：你对${label}的目标结果、周期和合作条件。`;
}

function resolveCustomOptionExample(stepKey: StepKey): string {
  if (stepKey === "resource") {
    return "例如：该模块能提供什么资源、覆盖哪些场景、每周可投入多少。";
  }

  if (stepKey === "skill") {
    return "例如：该模块对应的技能水平、交付样例和可协作方式。";
  }

  return "例如：该模块希望达成什么结果、周期多久、合作边界是什么。";
}

function toOptionItems(stepKey: StepKey, items: DictItem[]): OptionItem[] {
  return items.map((item) => {
    const rawLabel = item.value || item.label || item.code;
    const label = stepKey === "resource" && item.code === "skill" ? "资源" : rawLabel;
    return {
      value: item.code,
      label,
      intro: resolveOptionIntro(stepKey, item),
      example: resolveOptionExample(stepKey, item)
    };
  });
}

function createInitialSelectedValues(): SelectedValuesByStep {
  return {
    resource: [],
    skill: [],
    goal: []
  };
}

function createInitialNotes(): NotesByStep {
  return {
    resource: {},
    skill: {},
    goal: {}
  };
}

function createInitialCustomOptions(): CustomOptionsByStep {
  return {
    resource: [],
    skill: [],
    goal: []
  };
}

function getCurrentStep(step: ActivationStep): StepKey {
  return STEP_KEYS[step];
}

export default function ActivationPage() {
  return (
    <Suspense
      fallback={
        <Card className="rounded-3xl border-white/10 bg-zinc-900/60 p-8 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-zinc-100">激活引导加载中</CardTitle>
            <CardDescription className="text-zinc-400">正在准备赛博分身激活流程...</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <ActivationPageContent />
    </Suspense>
  );
}

function ActivationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { hydrated, isLoggedIn } = useAuthStatus();

  const [step, setStep] = useState<ActivationStep>(0);
  const [selectedValuesByStep, setSelectedValuesByStep] = useState<SelectedValuesByStep>(
    createInitialSelectedValues
  );
  const [notesByStep, setNotesByStep] = useState<NotesByStep>(createInitialNotes);
  const [customOptionsByStep, setCustomOptionsByStep] = useState<CustomOptionsByStep>(
    createInitialCustomOptions
  );
  const [customInputVisible, setCustomInputVisible] = useState(false);
  const [customInputValue, setCustomInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resourceTypeDictQuery = useDictQuery("RESOURCE_TYPE", {
    enabled: hydrated && isLoggedIn
  });
  const skillTagDictQuery = useDictQuery("RESOURCE_SKILL_TAGS", {
    enabled: hydrated && isLoggedIn
  });
  const wishTagDictQuery = useDictQuery("RESOURCE_WISH_TAGS", {
    enabled: hydrated && isLoggedIn
  });
  const needTagDictQuery = useDictQuery("RESOURCE_NEED_TAGS", {
    enabled: hydrated && isLoggedIn
  });

  const dictLoading =
    resourceTypeDictQuery.isPending ||
    skillTagDictQuery.isPending ||
    wishTagDictQuery.isPending ||
    needTagDictQuery.isPending;

  const dictError =
    resourceTypeDictQuery.error ??
    skillTagDictQuery.error ??
    wishTagDictQuery.error ??
    needTagDictQuery.error;

  const resourceOptions = useMemo(
    () => toOptionItems("resource", resourceTypeDictQuery.data?.items ?? []),
    [resourceTypeDictQuery.data?.items]
  );

  const skillOptions = useMemo(
    () => toOptionItems("skill", skillTagDictQuery.data?.items ?? []),
    [skillTagDictQuery.data?.items]
  );

  const goalOptions = useMemo(() => {
    const merged = mergeGoalItems(
      wishTagDictQuery.data?.items ?? [],
      needTagDictQuery.data?.items ?? []
    );
    return toOptionItems("goal", merged);
  }, [needTagDictQuery.data?.items, wishTagDictQuery.data?.items]);

  const optionsLookupByStep = useMemo(() => {
    const build = (
      stepKey: StepKey,
      baseItems: OptionItem[],
      customItems: OptionItem[],
      selectedValues: string[]
    ) => {
      const map = new Map<string, OptionItem>();

      [...baseItems, ...customItems].forEach((item) => {
        map.set(item.value, item);
      });

      selectedValues.forEach((value) => {
        if (!map.has(value)) {
          map.set(value, {
            value,
            label: value,
            intro: "自定义项，请补充你的实际情况。",
            example: resolveCustomOptionExample(stepKey),
            isCustom: true
          });
        }
      });

      return map;
    };

    return {
      resource: build(
        "resource",
        resourceOptions,
        customOptionsByStep.resource,
        selectedValuesByStep.resource
      ),
      skill: build("skill", skillOptions, customOptionsByStep.skill, selectedValuesByStep.skill),
      goal: build("goal", goalOptions, customOptionsByStep.goal, selectedValuesByStep.goal)
    };
  }, [
    customOptionsByStep.goal,
    customOptionsByStep.resource,
    customOptionsByStep.skill,
    goalOptions,
    resourceOptions,
    selectedValuesByStep.goal,
    selectedValuesByStep.resource,
    selectedValuesByStep.skill,
    skillOptions
  ]);

  const currentStepKey = getCurrentStep(step);
  const currentOptions = Array.from(optionsLookupByStep[currentStepKey].values());
  const currentSelectedValues = selectedValuesByStep[currentStepKey];

  const allCustomModules = useMemo(
    () =>
      STEP_KEYS.flatMap((stepKey) =>
        customOptionsByStep[stepKey].map((item) => ({
          stepKey,
          stepLabel: STEP_LABELS[stepKey],
          value: item.value,
          label: item.label,
          note: notesByStep[stepKey][item.value] ?? ""
        }))
      ),
    [customOptionsByStep, notesByStep]
  );

  const currentStepCustomModules = useMemo(
    () => allCustomModules.filter((item) => item.stepKey === currentStepKey),
    [allCustomModules, currentStepKey]
  );

  const redirectTarget = sanitizeRedirect(searchParams.get("redirect"));

  function toggleValue(stepKey: StepKey, value: string) {
    setSelectedValuesByStep((previous) => {
      const selectedValues = previous[stepKey];
      if (selectedValues.includes(value)) {
        return {
          ...previous,
          [stepKey]: selectedValues.filter((item) => item !== value)
        };
      }

      return {
        ...previous,
        [stepKey]: [...selectedValues, value]
      };
    });
  }

  function updateNote(stepKey: StepKey, value: string, note: string) {
    setNotesByStep((previous) => ({
      ...previous,
      [stepKey]: {
        ...previous[stepKey],
        [value]: note
      }
    }));
  }

  function autoResizeTextarea(element: HTMLTextAreaElement) {
    element.style.height = "0px";
    const maxHeight = 160;
    const nextHeight = Math.min(element.scrollHeight, maxHeight);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
  }

  function selectWhenTyping(stepKey: StepKey, value: string, note: string) {
    if (!note.trim()) {
      return;
    }

    setSelectedValuesByStep((previous) => {
      if (previous[stepKey].includes(value)) {
        return previous;
      }

      return {
        ...previous,
        [stepKey]: [...previous[stepKey], value]
      };
    });
  }

  function handleNoteInput(
    stepKey: StepKey,
    value: string,
    note: string,
    element: HTMLTextAreaElement
  ) {
    updateNote(stepKey, value, note);
    selectWhenTyping(stepKey, value, note);
    autoResizeTextarea(element);
  }

  function validateCurrentStep(): boolean {
    if (selectedValuesByStep[currentStepKey].length > 0) {
      return true;
    }

    toast({
      variant: "destructive",
      title: "请先选择至少一个选项",
      description: "勾选后可在下方输入具体情况，系统会按步骤保存。"
    });
    return false;
  }

  function removeCustomOption(stepKey: StepKey, value: string) {
    setCustomOptionsByStep((previous) => ({
      ...previous,
      [stepKey]: previous[stepKey].filter((item) => item.value !== value)
    }));

    setSelectedValuesByStep((previous) => ({
      ...previous,
      [stepKey]: previous[stepKey].filter((item) => item !== value)
    }));

    setNotesByStep((previous) => {
      const nextStepNotes = { ...previous[stepKey] };
      delete nextStepNotes[value];
      return {
        ...previous,
        [stepKey]: nextStepNotes
      };
    });
  }

  function handleAddCustomOption() {
    const customValue = customInputValue.trim();
    if (!customValue) {
      toast({
        variant: "destructive",
        title: "请输入模块名称",
        description: "例如：校园地推小组、社团渠道、行业微信群。"
      });
      return;
    }

    if (optionsLookupByStep[currentStepKey].has(customValue)) {
      toast({
        variant: "destructive",
        title: "模块已存在",
        description: "请更换一个名称，或直接填写该模块的具体情况。"
      });
      return;
    }

    const customOption: OptionItem = {
      value: customValue,
      label: customValue,
      intro: "自定义模块：请说明该模块能提供什么、覆盖什么场景、如何配合。",
      example: resolveCustomOptionExample(currentStepKey),
      isCustom: true
    };

    setCustomOptionsByStep((previous) => ({
      ...previous,
      [currentStepKey]: [...previous[currentStepKey], customOption]
    }));

    setSelectedValuesByStep((previous) => ({
      ...previous,
      [currentStepKey]: [...previous[currentStepKey], customValue]
    }));

    setCustomInputValue("");
    setCustomInputVisible(false);

    toast({
      title: "自定义模块已载入",
      description: "已加入当前步骤，你可以马上补充模块的具体情况。"
    });
  }

  function handleNext() {
    if (!validateCurrentStep()) {
      return;
    }

    if (step < 2) {
      setStep((current) => (current + 1) as ActivationStep);
      setCustomInputVisible(false);
      setCustomInputValue("");
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep((current) => (current - 1) as ActivationStep);
      setCustomInputVisible(false);
      setCustomInputValue("");
    }
  }

  async function handleSubmit() {
    if (!validateCurrentStep()) {
      return;
    }

    setSubmitting(true);

    try {
      const uploadResourceTypes = resolveUploadResourceTypes(
        selectedValuesByStep.resource,
        selectedValuesByStep.skill
      );

      const toStepDetails = (stepKey: StepKey) =>
        selectedValuesByStep[stepKey].map((value) => {
          const option = optionsLookupByStep[stepKey].get(value);
          return {
            code: value,
            label: option?.label ?? value,
            intro: option?.intro ?? "",
            note: notesByStep[stepKey][value]?.trim() || undefined,
            isCustom: option?.isCustom ?? false
          };
        });

      const customModules = allCustomModules.map((item) => ({
        moduleName: item.label,
        moduleContext: item.note.trim() || undefined,
        sourceStep: item.stepKey as ActivationStepKey
      }));

      const activationDetails: ActivationDetailsPayload = {
        version: "v1",
        flowTitle: "赛博分身激活三步曲",
        stepDetails: {
          resource: toStepDetails("resource"),
          skill: toStepDetails("skill"),
          goal: toStepDetails("goal")
        },
        customModules: customModules.length > 0 ? customModules : undefined
      };

      const tags = [
        ...selectedValuesByStep.resource.map((item) => `activation_resource:${item}`),
        ...selectedValuesByStep.skill.map((item) => `activation_skill:${item}`),
        ...selectedValuesByStep.goal.map((item) => `activation_goal:${item}`),
        ...customModules.map(
          (item) => `activation_custom_module:${item.sourceStep ?? "resource"}:${item.moduleName}`
        )
      ];

      await getResourceApi().upload({
        resourceType: uploadResourceTypes,
        tags: Array.from(new Set(tags)),
        areaCode: undefined,
        activationDetails
      });

      await queryClient.invalidateQueries({ queryKey: RESOURCE_ACTIVATION_QUERY_KEY });
      toast({
        title: "激活完成",
        description: "赛博分身已进入首轮匹配，激活详情已保存。"
      });

      router.replace(redirectTarget);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "激活失败",
        description: getErrorMessage(error)
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <Card className="rounded-3xl border-white/10 bg-zinc-900/60 p-8 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-zinc-100">激活引导加载中</CardTitle>
          <CardDescription className="text-zinc-400">正在同步登录状态与字典数据...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isLoggedIn) {
    return (
      <Card className="rounded-3xl border-white/10 bg-zinc-900/60 p-8 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-zinc-100">请先登录</CardTitle>
          <CardDescription className="text-zinc-400">
            登录后才能开启“资源 - 技能 - 愿望”三步激活流程。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={`/auth?redirect=${encodeURIComponent("/activation")}`}>去登录</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <Card className="rounded-3xl border-white/10 bg-zinc-900/60 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <CardHeader className="space-y-4">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-300/80">
            <Sparkles className="h-4 w-4" />
            赛博分身激活三步曲
          </div>
          <CardTitle className="text-2xl tracking-tight text-zinc-100">
            {STEP_TITLES[currentStepKey]}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {STEP_DESCRIPTIONS[currentStepKey]}
          </CardDescription>
          <div className="grid grid-cols-3 gap-2">
            {STEP_KEYS.map((stepKey, index) => {
              const active = index === step;
              const done = index < step;
              return (
                <div
                  key={stepKey}
                  className={`rounded-full border px-3 py-2 text-center text-xs font-medium ${
                    active
                      ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100"
                      : done
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                        : "border-white/10 bg-zinc-900/60 text-zinc-500"
                  }`}
                >
                  {index + 1}. {STEP_LABELS[stepKey]}
                </div>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {dictLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在加载可选项...
            </div>
          ) : null}

          {dictError ? (
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              可选项加载失败：{getErrorMessage(dictError)}
            </div>
          ) : null}

          {!dictLoading && !dictError && currentOptions.length === 0 ? (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              当前步骤暂无可选项，请联系运营检查对应字典配置。
            </div>
          ) : null}

          {!dictLoading && !dictError && currentOptions.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {currentOptions.map((item) => {
                  const selected = currentSelectedValues.includes(item.value);
                  const noteValue = notesByStep[currentStepKey][item.value] ?? "";

                  return (
                    <div
                      key={`${currentStepKey}-${item.value}`}
                      className={`rounded-xl border px-4 py-3 transition-all ${
                        selected
                          ? "border-cyan-400/60 bg-cyan-500/10"
                          : "border-white/10 bg-zinc-900/40"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleValue(currentStepKey, item.value)}
                        className="group flex w-full items-center justify-between text-left"
                      >
                        <span className="text-sm font-semibold text-zinc-100">{item.label}</span>
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                            selected
                              ? "border-cyan-300 bg-cyan-400/20 text-cyan-100"
                              : "border-zinc-600 text-zinc-500 group-hover:border-zinc-400"
                          }`}
                        >
                          {selected ? <Check className="h-3.5 w-3.5" /> : null}
                        </span>
                      </button>

                      <p className="mt-2 text-xs leading-5 text-zinc-400">{item.intro}</p>
                      <p className="mt-1 text-[11px] leading-5 text-cyan-200/80">{item.example}</p>

                      <div className="mt-3">
                        <Textarea
                          value={noteValue}
                          onChange={(event) =>
                            handleNoteInput(
                              currentStepKey,
                              item.value,
                              event.currentTarget.value,
                              event.currentTarget
                            )
                          }
                          onFocus={(event) => autoResizeTextarea(event.currentTarget)}
                          placeholder={
                            selected
                              ? item.example
                              : `${item.example}（可直接输入，系统会自动默认勾选该项）`
                          }
                          className="h-10 min-h-0 max-h-40 resize-none overflow-hidden border-white/10 bg-zinc-950/40 text-zinc-100 placeholder:text-zinc-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-dashed border-cyan-400/30 bg-cyan-500/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-cyan-100">载入自定义模块</p>
                    <p className="mt-1 text-xs text-cyan-200/80">
                      输入后会加入当前步骤，并可在对应输入框中写明具体情况，提交后会一起保存。
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCustomInputVisible((current) => !current)}
                    className="border-cyan-400/40 bg-transparent text-cyan-100 hover:bg-cyan-500/10"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    {customInputVisible ? "收起" : "载入模块"}
                  </Button>
                </div>

                {customInputVisible ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Input
                      value={customInputValue}
                      onChange={(event) => setCustomInputValue(event.currentTarget.value)}
                      placeholder="输入模块名称，例如：校园社群流量池"
                      className="h-10 flex-1 border-cyan-400/30 bg-zinc-950/40 text-zinc-100 placeholder:text-zinc-500"
                    />
                    <Button type="button" onClick={handleAddCustomOption}>
                      确认载入
                    </Button>
                  </div>
                ) : null}
              </div>

              {currentStepCustomModules.length > 0 ? (
                <div className="rounded-xl border border-white/10 bg-zinc-900/30 p-4">
                  <p className="mb-2 text-sm font-medium text-zinc-100">
                    当前步骤已载入自定义模块（仅保存到本步骤）
                  </p>
                  <div className="space-y-2">
                    {currentStepCustomModules.map((module) => (
                      <div
                        key={`${module.stepKey}:${module.value}`}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-950/30 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm text-zinc-100">{module.label}</p>
                          <p className="text-xs text-zinc-500">
                            归属步骤：{STEP_LABELS[currentStepKey]}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCustomOption(module.stepKey, module.value)}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-400/40 px-2 py-1 text-xs text-rose-300 transition-colors hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> 删除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 0 || submitting}
              className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/5"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              上一步
            </Button>

            {step < 2 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={dictLoading || Boolean(dictError)}
              >
                下一步
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={dictLoading || Boolean(dictError) || submitting}
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                完成激活
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
