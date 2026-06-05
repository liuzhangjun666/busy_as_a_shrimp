export type DictLabelItem = {
  code: string;
  label: string;
};

export type ResourceUploader = {
  userId?: number | string;
  nickname?: string | null;
  maskedPhone?: string | null;
} | null;

export type ResourceLabelMaps = {
  resourceType?: Map<string, string>;
  skill?: Map<string, string>;
  goal?: Map<string, string>;
  custom?: Map<string, string>;
  region?: Map<string, string>;
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  skill: "技能",
  location: "场地/位置",
  account: "账号/流量",
  time: "时间/劳动力"
};

const STEP_LABELS: Record<string, string> = {
  resource: "资源",
  skill: "技能",
  goal: "愿望"
};

const DEFAULT_CODE_LABELS: Record<string, string> = {
  ...RESOURCE_TYPE_LABELS,
  short_video_script: "短视频脚本",
  visit_store_shoot: "探店拍摄",
  live_stream_ops: "直播运营",
  ai_editing: "AI剪辑",
  graphic_design: "平面设计",
  creator_bd: "达人对接",
  brand_strategy: "品牌策划",
  seek_partner: "寻找合伙人",
  resource_swap: "资源互换",
  cross_industry: "异业合作",
  traffic_share: "流量共享",
  project_outsource: "项目外包",
  recruit_anchor: "招募主播",
  long_term: "长期",
  short_term: "短期",
  weekend: "周末",
  part_time: "兼职",
  one_time: "单次结",
  remote: "远程",
  high_conversion: "高转化",
  weekend_slot: "周末档期",
  food_track: "美食赛道",
  local_life: "本地生活",
  content_cocreation: "内容共创"
};

const ASCII_FIELD_PATTERN = /^[a-z0-9_ -]+$/i;

export function buildDictLabelMap(items: Array<DictLabelItem> | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items ?? []) {
    map.set(item.code.trim().toLowerCase(), item.label);
  }
  return map;
}

export function resolveResourceTypeLabel(value: string, labelMap?: Map<string, string>): string {
  return resolveDisplayLabel(value, labelMap);
}

export function resolveDisplayLabel(
  value: string,
  ...labelMaps: Array<Map<string, string> | undefined>
): string {
  const trimmed = value.trim();
  const key = trimmed.toLowerCase();

  for (const labelMap of labelMaps) {
    const label = labelMap?.get(key);
    if (label) {
      return label;
    }
  }

  return DEFAULT_CODE_LABELS[key] ?? trimmed;
}

export function formatResourceTagLabel(
  tag: string,
  labelMaps: ResourceLabelMaps = {}
): string | null {
  const normalizedTag = tag.trim();
  if (!normalizedTag) {
    return null;
  }

  const [prefixRaw, ...rest] = normalizedTag.split(":");
  const rawValue = rest.join(":").trim();
  const prefix = prefixRaw.trim().toLowerCase();

  if (!rawValue) {
    return resolveDisplayLabel(
      normalizedTag,
      labelMaps.custom,
      labelMaps.skill,
      labelMaps.goal,
      labelMaps.resourceType,
      labelMaps.region
    );
  }

  if (prefix === "activation_resource") {
    return `资源：${resolveResourceTypeLabel(rawValue, labelMaps.resourceType)}`;
  }
  if (prefix === "activation_skill") {
    return `技能：${resolveDisplayLabel(rawValue, labelMaps.skill)}`;
  }
  if (prefix === "activation_goal") {
    return `愿望：${resolveDisplayLabel(rawValue, labelMaps.goal, labelMaps.custom)}`;
  }
  if (prefix === "activation_custom_module") {
    return formatActivationCustomModule(rawValue);
  }
  if (prefix === "skill") {
    return `技能：${resolveDisplayLabel(rawValue, labelMaps.skill)}`;
  }
  if (prefix === "region") {
    return `地区：${resolveDisplayLabel(rawValue, labelMaps.region)}`;
  }
  if (prefix === "core_skill") {
    return `核心技能：${rawValue}`;
  }
  if (prefix === "core_location") {
    return `地点：${rawValue}`;
  }
  if (prefix === "core_account") {
    return `账号/流量：${rawValue}`;
  }
  if (prefix === "core_time") {
    return `时间/劳动力：${rawValue}`;
  }

  if (ASCII_FIELD_PATTERN.test(prefixRaw)) {
    return resolveDisplayLabel(
      rawValue,
      labelMaps.custom,
      labelMaps.skill,
      labelMaps.goal,
      labelMaps.resourceType,
      labelMaps.region
    );
  }

  return `${prefixRaw}：${rawValue}`;
}

export function formatUploaderLabel(
  uploader: ResourceUploader,
  fallbackUserId: number | string
): string {
  const fallback = `用户 #${fallbackUserId}`;
  const nickname = uploader?.nickname?.trim();
  const maskedPhone = uploader?.maskedPhone?.trim();

  if (nickname && maskedPhone) {
    return `${nickname}（${maskedPhone}）`;
  }
  if (nickname) {
    return `${nickname} · ${fallback}`;
  }
  if (maskedPhone) {
    return `${maskedPhone} · ${fallback}`;
  }

  return fallback;
}

function formatActivationCustomModule(value: string): string {
  const segments = value
    .split(":")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length >= 2 && STEP_LABELS[segments[0].toLowerCase()]) {
    const sourceStep = STEP_LABELS[segments[0].toLowerCase()];
    return `${sourceStep}补充：${segments.slice(1).join("：")}`;
  }

  return `补充信息：${segments.join("：") || value}`;
}
