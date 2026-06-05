"use client";

import imageCompression from "browser-image-compression";
import {
  ChevronDown,
  ChevronRight,
  Cpu,
  Network,
  PencilLine,
  Rocket,
  ShieldCheck,
  Sparkles,
  Upload
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getDoppelgangerApi, getResourceApi, getUserApi } from "../../src/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../src/components/ui/dialog";
import { toast } from "../../src/hooks/use-toast";
import { useDictQuery } from "../../src/hooks/use-dict-query";
import type { ResourceItem } from "../../src/api/resource-api";
import { useAuthStatus } from "../../src/stores/use-auth-status";
import { useUserStore, type UserRole } from "../../src/stores/user-store";
import { getErrorMessage } from "../../src/utils/error-message";
import {
  buildDictLabelMap,
  formatResourceTagLabel,
  formatUploaderLabel,
  resolveResourceTypeLabel
} from "../../src/utils/resource-display";

const PROFILE_QUERY_KEY = ["user", "profile"] as const;
const RESOURCE_AUDIT_QUERY_KEY = ["user", "resource-audit"] as const;

function maskPhone(phone: string): string {
  if (!phone) {
    return "138****9999";
  }
  if (phone.length < 7) {
    return phone;
  }
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function getMemberLabel(memberLevel: "FREE" | "PRO" | "YEARLY" | "LIFETIME"): string {
  if (memberLevel === "PRO") {
    return "PRO PASS";
  }
  if (memberLevel === "YEARLY") {
    return "YEARLY PASS";
  }
  if (memberLevel === "LIFETIME") {
    return "LIFETIME NODE";
  }
  return "FREE";
}

function getAuditStatusLabel(status: "pending" | "active" | "inactive" | "rejected"): string {
  if (status === "pending") return "审核中";
  if (status === "active") return "已通过";
  if (status === "rejected") return "未通过";
  return "已下线";
}

function getAuditStatusClass(status: "pending" | "active" | "inactive" | "rejected"): string {
  if (status === "pending") return "bg-amber-50 text-amber-600 ring-amber-500/20";
  if (status === "active") return "bg-emerald-50 text-emerald-600 ring-emerald-500/20";
  if (status === "rejected") return "bg-rose-50 text-rose-600 ring-rose-500/20";
  return "bg-slate-100 text-slate-500";
}

function getResourceTypeLabel(
  type: ResourceItem["resourceType"],
  labelMap?: Map<string, string>
): string {
  return resolveResourceTypeLabel(type, labelMap);
}

function normalizeTagList(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }
  return tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0);
}

function ensureNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildResourceSummary(
  item: ResourceItem,
  labelMaps: Parameters<typeof formatResourceTagLabel>[1] = {}
): string {
  const tagList = normalizeTagList(item.tags);
  const activationDetails = item.activationDetails;
  const resourceLabel = activationDetails?.stepDetails?.resource?.[0]?.label?.trim();
  const resourceNote = activationDetails?.stepDetails?.resource?.[0]?.note?.trim();

  if (resourceNote) {
    return resourceNote.slice(0, 18);
  }
  if (resourceLabel) {
    return resourceLabel.slice(0, 18);
  }
  if (tagList.length > 0) {
    return (formatResourceTagLabel(tagList[0], labelMaps) ?? tagList[0]).slice(0, 18);
  }
  return "暂无描述";
}

function buildResourceDetailLines(item: ResourceItem): string[] {
  const detailGroups = item.activationDetails?.stepDetails;
  if (!detailGroups) {
    return [];
  }

  const lines: string[] = [];
  [detailGroups.resource, detailGroups.skill, detailGroups.goal].forEach((group) => {
    group.forEach((detail) => {
      const title = detail.label?.trim();
      const note = detail.note?.trim();
      if (title && note) {
        lines.push(`${title}：${note}`);
        return;
      }
      if (note) {
        lines.push(note);
        return;
      }
      if (title) {
        lines.push(title);
      }
    });
  });

  item.activationDetails?.customModules?.forEach((module) => {
    const name = module.moduleName?.trim();
    const context = module.moduleContext?.trim();
    if (name && context) {
      lines.push(`${name}：${context}`);
      return;
    }
    if (name) {
      lines.push(name);
    }
  });

  return lines.slice(0, 6);
}

export default function ProfilePage() {
  const { hydrated, isLoggedIn, token, phone } = useAuthStatus();
  const role = useUserStore((state) => state.role);
  const memberLevel = useUserStore((state) => state.memberLevel);
  const avatar = useUserStore((state) => state.avatar);
  const setAvatar = useUserStore((state) => state.setAvatar);
  const setRole = useUserStore((state) => state.setRole);
  const setMemberLevel = useUserStore((state) => state.setMemberLevel);
  const isRealNameVerified = useUserStore((state) => state.isRealNameVerified);
  const setRealNameVerified = useUserStore((state) => state.setRealNameVerified);
  const pointsBalance = useUserStore((state) => state.pointsBalance);
  const setPointsSummary = useUserStore((state) => state.setPointsSummary);
  const queryClient = useQueryClient();

  const [nicknameDraft, setNicknameDraft] = useState<string | null>(null);
  const [cityDraft, setCityDraft] = useState<string | null>(null);
  const [districtDraft, setDistrictDraft] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [realName, setRealName] = useState("");
  const [idCard, setIdCard] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(avatar ?? "");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [selectedAuditResourceId, setSelectedAuditResourceId] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => getUserApi().getInfo(),
    enabled: hydrated && isLoggedIn && Boolean(token)
  });

  const resourceAuditQuery = useQuery({
    queryKey: RESOURCE_AUDIT_QUERY_KEY,
    queryFn: () => getResourceApi().mine(),
    enabled: hydrated && isLoggedIn && Boolean(token),
    staleTime: 20_000
  });

  const dictQueryEnabled = hydrated && isLoggedIn;
  const resourceTypeDictQuery = useDictQuery("RESOURCE_TYPE", { enabled: dictQueryEnabled });
  const skillDictQuery = useDictQuery("RESOURCE_SKILL_TAGS", { enabled: dictQueryEnabled });
  const regionDictQuery = useDictQuery("RESOURCE_REGION_CODES", { enabled: dictQueryEnabled });
  const wishGoalDictQuery = useDictQuery("RESOURCE_WISH_TAGS", { enabled: dictQueryEnabled });
  const needGoalDictQuery = useDictQuery("RESOURCE_NEED_TAGS", { enabled: dictQueryEnabled });
  const customGoalDictQuery = useDictQuery("RESOURCE_CUSTOM_TAGS", { enabled: dictQueryEnabled });

  const saveInfoMutation = useMutation({
    mutationFn: (payload: { nickname: string; city: string; district: string }) =>
      getUserApi().updateInfo(payload),
    onSuccess: async () => {
      setMessage("资料已更新");
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    }
  });

  const saveRoleMutation = useMutation({
    mutationFn: (nextRole: UserRole) => getUserApi().updateRole({ role: nextRole }),
    onSuccess: async (result) => {
      setRole(result.role);
      setMessage("角色已更新");
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    }
  });

  async function syncPointSummaryFromLedger() {
    try {
      const ledger = await getDoppelgangerApi().getMyPointLedger();
      setPointsSummary({
        pointsBalance: ledger.balance,
        memberMonthlyPointsGift: ledger.memberMonthlyPointsGift,
        currentMonthGrantedPoints: ledger.currentMonthGrantedPoints,
        isMomoUnlocked: ledger.isMomoUnlocked
      });
      queryClient.setQueryData(PROFILE_QUERY_KEY, (previous: typeof profileQuery.data) => {
        if (!previous) {
          return previous;
        }
        return {
          ...previous,
          pointsBalance: ledger.balance,
          memberMonthlyPointsGift: ledger.memberMonthlyPointsGift,
          currentMonthGrantedPoints: ledger.currentMonthGrantedPoints,
          isMomoUnlocked: ledger.isMomoUnlocked
        };
      });
    } catch {
      // Ignore transient ledger sync failures and keep current UI state.
    }
  }

  const nickname = nicknameDraft ?? profileQuery.data?.nickname ?? "";
  const city = cityDraft ?? profileQuery.data?.city ?? "";
  const district = districtDraft ?? profileQuery.data?.district ?? "";
  const currentRole = profileQuery.data?.role ?? role;
  const loading = profileQuery.isFetching;
  const phoneMasked = useMemo(() => maskPhone(phone), [phone]);
  const avatarText = useMemo(() => phoneMasked.slice(-2), [phoneMasked]);
  const displayName = nickname.trim() || "未设置昵称";
  const pointsDisplay = ensureNumber(profileQuery.data?.pointsBalance ?? pointsBalance);
  const monthlyGiftDisplay = ensureNumber(profileQuery.data?.memberMonthlyPointsGift);
  const currentMonthGrantedDisplay = ensureNumber(profileQuery.data?.currentMonthGrantedPoints);
  const momoUnlocked = profileQuery.data?.isMomoUnlocked ?? false;
  const resourceAuditList = resourceAuditQuery.data ?? [];
  const publishedCount = resourceAuditList.filter((item) => item.status === "active").length;
  const matchingCount = resourceAuditList.filter((item) => item.status === "pending").length;
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
  const resourceTagLabelMaps = useMemo(
    () => ({
      resourceType: resourceTypeLabelMap,
      skill: skillLabelMap,
      goal: goalLabelMap,
      custom: customLabelMap,
      region: regionLabelMap
    }),
    [customLabelMap, goalLabelMap, regionLabelMap, resourceTypeLabelMap, skillLabelMap]
  );

  const error = useMemo(() => {
    if (profileQuery.error) {
      return getErrorMessage(profileQuery.error);
    }
    if (saveInfoMutation.error) {
      return getErrorMessage(saveInfoMutation.error);
    }
    if (saveRoleMutation.error) {
      return getErrorMessage(saveRoleMutation.error);
    }
    return "";
  }, [profileQuery.error, saveInfoMutation.error, saveRoleMutation.error]);

  useEffect(() => {
    const nextAvatar = profileQuery.data?.avatar ?? null;
    const nextNickname = profileQuery.data?.nickname ?? "";
    const nextMemberLevel = profileQuery.data?.memberLevel;
    const nextRealNameVerified = Boolean(profileQuery.data?.isRealNameVerified);
    if (nicknameDraft === null) {
      setNicknameDraft(nextNickname);
    }
    if (districtDraft === null && profileQuery.data?.district) {
      setDistrictDraft(profileQuery.data.district);
    }
    if (nextAvatar !== avatar) {
      setAvatar(nextAvatar);
    }
    if (nextMemberLevel === "monthly") {
      setMemberLevel("PRO");
    } else if (nextMemberLevel === "yearly") {
      setMemberLevel("YEARLY");
    } else if (nextMemberLevel === "lifetime") {
      setMemberLevel("LIFETIME");
    } else if (nextMemberLevel === "free") {
      setMemberLevel("FREE");
    }
    if (nextRealNameVerified !== isRealNameVerified) {
      setRealNameVerified(nextRealNameVerified);
    }
    if (profileQuery.data) {
      setPointsSummary({
        pointsBalance: profileQuery.data.pointsBalance,
        memberMonthlyPointsGift: profileQuery.data.memberMonthlyPointsGift,
        currentMonthGrantedPoints: profileQuery.data.currentMonthGrantedPoints,
        isMomoUnlocked: profileQuery.data.isMomoUnlocked
      });
      void syncPointSummaryFromLedger();
    }
    if (!avatarDialogOpen) {
      setAvatarPreviewUrl(nextAvatar ?? "");
      setAvatarFile(null);
    }
  }, [
    avatar,
    avatarDialogOpen,
    districtDraft,
    isRealNameVerified,
    nicknameDraft,
    profileQuery.data?.avatar,
    profileQuery.data?.district,
    profileQuery.data?.memberLevel,
    profileQuery.data?.nickname,
    profileQuery.data?.isRealNameVerified,
    setAvatar,
    setMemberLevel,
    setPointsSummary,
    setRealNameVerified
  ]);

  function resetMutationErrors() {
    if (saveInfoMutation.isError) {
      saveInfoMutation.reset();
    }
    if (saveRoleMutation.isError) {
      saveRoleMutation.reset();
    }
  }

  async function saveInfo() {
    setMessage("");
    resetMutationErrors();
    const normalizedNickname = nickname.trim();
    if (normalizedNickname.length > 20) {
      toast({
        variant: "destructive",
        title: "昵称过长",
        description: "昵称最多 20 个字符"
      });
      return;
    }
    try {
      await saveInfoMutation.mutateAsync({ nickname: normalizedNickname, city, district });
    } catch {
      // Error is surfaced via mutation state.
    }
  }

  async function saveRole(nextRole: UserRole) {
    setMessage("");
    resetMutationErrors();
    try {
      await saveRoleMutation.mutateAsync(nextRole);
    } catch {
      // Error is surfaced via mutation state.
    }
  }

  async function verifyRealName() {
    const name = realName.trim();
    const card = idCard.trim();

    if (!name || !card) {
      toast({
        title: "信息不完整",
        description: "请先填写真实姓名和身份证号",
        variant: "destructive"
      });
      return;
    }

    setMessage("");
    setVerifying(true);
    try {
      const res = await getUserApi().verifyIdentity({ idNumber: card, name });
      if (res.success) {
        setRealNameVerified(true);
        queryClient.setQueryData(PROFILE_QUERY_KEY, (current: typeof profileQuery.data) =>
          current
            ? {
                ...current,
                isRealNameVerified: true
              }
            : current
        );
        await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
        await profileQuery.refetch();
        setVerifyDialogOpen(false);
        setRealName("");
        setIdCard("");
        setMessage("实名认证已更新");
        toast({
          title: "实名校验通过",
          description: "认证状态已更新。"
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "请求异常";
      toast({
        title: "实名校验失败",
        description: message,
        variant: "destructive"
      });
    } finally {
      setVerifying(false);
    }
  }

  function openAvatarDialog() {
    setAvatarFile(null);
    setAvatarPreviewUrl(profileQuery.data?.avatar ?? avatar ?? "");
    setAvatarDialogOpen(true);
  }

  function handleAvatarFileChange(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "\u6587\u4ef6\u7c7b\u578b\u4e0d\u652f\u6301",
        description:
          "\u8bf7\u9009\u62e9\u56fe\u7247\u6587\u4ef6\uff08JPG\u3001PNG \u6216 WEBP\uff09"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "\u56fe\u7247\u8fc7\u5927",
        description: "\u8bf7\u4e0a\u4f20 5MB \u4ee5\u5185\u7684\u56fe\u7247"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    setAvatarFile(file);
  }

  async function confirmAvatarUpload() {
    if (!avatarFile) {
      toast({
        variant: "destructive",
        title: "\u8bf7\u5148\u9009\u62e9\u56fe\u7247",
        description: "\u5934\u50cf\u9700\u8981\u5148\u4e0a\u4f20\u56fe\u7247\u6587\u4ef6"
      });
      return;
    }

    setAvatarUploading(true);
    try {
      const compressed = await imageCompression(avatarFile, {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      });

      const updated = await getUserApi().uploadAvatar(compressed);
      setAvatar(updated.avatar ?? null);
      setAvatarDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      toast({
        title: "\u5934\u50cf\u4e0a\u4f20\u6210\u529f",
        description: "\u5934\u50cf\u5df2\u66f4\u65b0\u5230\u4e2a\u4eba\u8d44\u6599"
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "\u5934\u50cf\u4e0a\u4f20\u5931\u8d25",
        description: err instanceof Error ? err.message : "\u8bf7\u6c42\u5f02\u5e38"
      });
    } finally {
      setAvatarUploading(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="min-h-[calc(100vh-64px)] relative overflow-hidden bg-slate-50 -mx-4 -mt-4 px-4 py-8 md:-mx-6 md:-mt-5 md:px-6">
        <section className="relative mx-auto mt-8 max-w-3xl overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">个人指挥中枢</h1>
          <p className="mt-2 text-sm text-slate-500">正在初始化登录状态...</p>
        </section>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-[calc(100vh-64px)] relative overflow-hidden bg-slate-50 -mx-4 -mt-4 px-4 py-8 md:-mx-6 md:-mt-5 md:px-6">
        <section className="relative mx-auto mt-8 max-w-3xl overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">个人指挥中枢</h1>
          <p className="mt-2 text-sm text-slate-500">当前未登录，请先完成认证。</p>
          <Link
            href="/auth"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-6 py-3 font-semibold tracking-wide text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800"
          >
            去登录
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] relative overflow-hidden bg-slate-50 -mx-4 -mt-4 px-4 py-8 md:-mx-6 md:-mt-5 md:px-6">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            个人指挥中枢 (Command Hub)
          </h1>
          <p className="text-sm text-slate-500">
            用户、资源、匹配、会员与团长网络的一体化控制视图。
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <aside className="space-y-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <button
                  type="button"
                  onClick={openAvatarDialog}
                  className="group relative h-24 w-24 overflow-hidden rounded-full border border-slate-100 bg-slate-50 shadow-inner"
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="用户头像"
                      onError={() => setAvatar(null)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-400">
                      {avatarText}
                    </div>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <PencilLine className="h-4 w-4 text-white" />
                    <span className="text-[10px] font-medium text-white">修改头像</span>
                  </div>
                </button>
                <div>
                  <p className="text-base font-semibold text-slate-900">{displayName}</p>
                  <p className="text-xs font-medium text-slate-400">{phoneMasked}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-600">
                        Points Balance
                      </p>
                      <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                        {pointsDisplay.toFixed(2)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        本月已发放 {currentMonthGrantedDisplay.toFixed(2)} / {monthlyGiftDisplay.toFixed(2)} 积分
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        momoUnlocked
                          ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20"
                          : "bg-slate-100 text-slate-500 ring-1 ring-slate-300/60"
                      }`}
                    >
                      {momoUnlocked ? "momo 已解锁" : "momo 未解锁"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isRealNameVerified ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20" : "bg-orange-50 text-orange-600 ring-1 ring-orange-500/20"}`}
                  >
                    {isRealNameVerified ? "已实名认证" : "未实名"}
                  </span>
                  {!isRealNameVerified ? (
                    <button
                      type="button"
                      onClick={() => setVerifyDialogOpen(true)}
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      去认证
                    </button>
                  ) : null}
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    通行证级别
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      memberLevel === "PRO"
                        ? "bg-blue-50 text-blue-600 ring-1 ring-blue-500/20"
                        : memberLevel === "YEARLY"
                          ? "bg-amber-50 text-amber-600 ring-1 ring-amber-500/20"
                        : memberLevel === "LIFETIME"
                          ? "bg-purple-50 text-purple-600 ring-1 ring-purple-500/20"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {getMemberLabel(memberLevel)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                资料编辑区
              </p>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    昵称
                  </span>
                  <input
                    value={nickname}
                    maxLength={20}
                    onChange={(event) => setNicknameDraft(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 transition-all focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5"
                    placeholder="给自己起个昵称（最多20字）"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    城市
                  </span>
                  <input
                    value={city}
                    onChange={(event) => setCityDraft(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 transition-all focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    区县
                  </span>
                  <input
                    value={district}
                    onChange={(event) => setDistrictDraft(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 transition-all focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => void saveInfo()}
                className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold tracking-wide text-white transition-all hover:bg-slate-800"
              >
                保存资料
              </button>
            </div>

            {loading ? (
              <p className="text-center text-[10px] font-medium text-slate-400">同步中...</p>
            ) : null}
            {error ? (
              <p className="text-center text-[10px] font-medium text-rose-500">{error}</p>
            ) : null}
            {message ? (
              <p className="text-center text-[10px] font-medium text-emerald-500">{message}</p>
            ) : null}
          </aside>

          <div className="space-y-6 lg:col-span-2">
            <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  已发布
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{publishedCount}</p>
              </article>
              <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  匹配中
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{matchingCount}</p>
              </article>
              <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  信誉分
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">98</p>
              </article>
              <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  节点数
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">24</p>
              </article>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <Link
                href="/member"
                className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)]"
              >
                <div className="absolute right-4 top-4 h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                <div className="flex items-center gap-2 text-blue-600">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    MEMBER PORTAL
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-900">星际通行证入口</h3>
                <p className="mt-1 text-sm text-slate-500">升级算力与专属特权</p>
              </Link>

              <Link
                href="/points"
                className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)]"
              >
                <div className="flex items-center gap-2 text-cyan-600">
                  <Cpu className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    POINTS LEDGER
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-900">分身积分账本</h3>
                <p className="mt-1 text-sm text-slate-500">
                  查看当前积分余额与 momo 指令扣分流水
                </p>
              </Link>

              <Link
                href="/captain"
                className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)]"
              >
                <div className="flex items-center gap-2 text-emerald-600">
                  <Rocket className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    CAPTAIN CORE
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-900">团长中枢入口</h3>
                <p className="mt-1 text-sm text-slate-500">查看我的收益与财务流水</p>
              </Link>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  资源审核
                </p>
                <h3 className="text-lg font-bold text-slate-900">资源审核状态</h3>
                <p className="text-xs text-slate-500">
                  仅展示你自己上传的资源。点击每条资源可查看详细内容与审核结果。
                </p>
              </div>

              {resourceAuditQuery.isLoading ? (
                <p className="text-xs text-slate-500">正在同步资源审核状态...</p>
              ) : null}

              {resourceAuditQuery.isError ? (
                <p className="text-xs text-rose-500">
                  资源状态加载失败：{getErrorMessage(resourceAuditQuery.error)}
                </p>
              ) : null}

              {!resourceAuditQuery.isLoading && !resourceAuditQuery.isError ? (
                resourceAuditList.length > 0 ? (
                  <div className="space-y-2">
                    {resourceAuditList.map((item) => {
                      const resourceId = String(item.resourceId);
                      const isExpanded = selectedAuditResourceId === resourceId;
                      const summary = buildResourceSummary(item, resourceTagLabelMaps);
                      const tags = normalizeTagList(item.tags)
                        .map((tag) => formatResourceTagLabel(tag, resourceTagLabelMaps))
                        .filter((tag): tag is string => Boolean(tag));
                      const detailLines = buildResourceDetailLines(item);
                      const uploaderLabel = formatUploaderLabel(item.uploader ?? null, item.userId);

                      return (
                        <div
                          key={resourceId}
                          className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/60"
                        >
                          <button
                            type="button"
                            className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-left"
                            onClick={() =>
                              setSelectedAuditResourceId((current) =>
                                current === resourceId ? null : resourceId
                              )
                            }
                          >
                            <p className="text-xs font-semibold text-slate-800">
                              资源 #{item.resourceId} · {summary}
                            </p>
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${getAuditStatusClass(item.status)}`}
                              >
                                {getAuditStatusLabel(item.status)}
                              </span>
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                              )}
                            </div>
                          </button>

                          {isExpanded ? (
                            <div className="space-y-2 border-t border-slate-100 px-3 py-2.5">
                              <p className="text-xs text-slate-600">
                                类型：
                                {getResourceTypeLabel(item.resourceType, resourceTypeLabelMap)}
                              </p>
                              <p className="text-xs text-slate-500">上传者：{uploaderLabel}</p>
                              {tags.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {detailLines.length > 0 ? (
                                <div className="space-y-1">
                                  {detailLines.map((line) => (
                                    <p key={line} className="text-xs text-slate-500">
                                      {line}
                                    </p>
                                  ))}
                                </div>
                              ) : null}
                              {item.status === "rejected" ? (
                                <p className="text-xs text-rose-600">
                                  未通过原因：
                                  {item.reviewReason || "内容不符合平台规范，请修改后重新提交。"}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    还没有资源记录，发布后会在这里展示审核进度。
                  </p>
                )
              ) : null}
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Role Engine
                </p>
                <h3 className="text-lg font-bold text-slate-900">当前网络拓扑角色</h3>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${currentRole === "service" ? "bg-slate-900 text-white shadow-lg" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                  onClick={() => void saveRole("service")}
                >
                  服务方
                </button>
                <button
                  type="button"
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${currentRole === "resource" ? "bg-slate-900 text-white shadow-lg" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                  onClick={() => void saveRole("resource")}
                >
                  资源方
                </button>
                <button
                  type="button"
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${currentRole === "both" ? "bg-slate-900 text-white shadow-lg" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                  onClick={() => void saveRole("both")}
                >
                  双角色
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    用户引擎
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                    身份域稳定运行
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    匹配引擎
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Cpu className="h-3.5 w-3.5 text-blue-500" />
                    资源智能调度
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    生态网络
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Network className="h-3.5 w-3.5 text-blue-500" />
                    节点实时同步
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <Dialog
          open={avatarDialogOpen}
          onOpenChange={(open) => {
            if (avatarUploading) return;
            setAvatarDialogOpen(open);
          }}
        >
          <DialogContent className="rounded-3xl border-0 bg-white p-6 shadow-2xl sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900">修改头像</DialogTitle>
            </DialogHeader>

            <div className="grid gap-6 py-4 md:grid-cols-[1fr_240px]">
              <div className="relative flex h-[300px] items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                {avatarPreviewUrl ? (
                  <img
                    src={avatarPreviewUrl}
                    alt="头像主预览"
                    onError={() => setAvatarPreviewUrl("")}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <p className="text-xs font-medium text-slate-400">预览区域</p>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    圆形预览
                  </p>
                  <div className="mx-auto flex gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-white bg-slate-200 shadow-sm">
                      {avatarPreviewUrl && (
                        <img
                          src={avatarPreviewUrl}
                          alt="预览"
                          onError={() => setAvatarPreviewUrl("")}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-slate-200 shadow-sm">
                      {avatarPreviewUrl && (
                        <img
                          src={avatarPreviewUrl}
                          alt="预览"
                          onError={() => setAvatarPreviewUrl("")}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    上传头像
                  </span>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-600 transition-all hover:border-blue-300 hover:text-blue-600">
                    <Upload className="h-4 w-4" />
                    <span>{avatarFile ? avatarFile.name : "选择图片（JPG / PNG / WEBP）"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) => handleAvatarFileChange(event.target.files?.[0])}
                    />
                  </label>
                  <p className="text-[10px] leading-relaxed text-slate-400">
                    头像会自动压缩并上传，提交后会通过内容审核。
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setAvatarDialogOpen(false)}
                className="rounded-xl px-5 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void confirmAvatarUpload()}
                disabled={avatarUploading}
                className="rounded-xl bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {avatarUploading ? "更新中..." : "保存头像"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
          <DialogContent className="rounded-3xl border-0 bg-white p-6 shadow-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900">实名认证</DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                请输入您的真实身份信息，系统将通过官方数据接口进行比对。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  真实姓名
                </span>
                <input
                  value={realName}
                  onChange={(event) => setRealName(event.target.value)}
                  placeholder="姓名"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  身份证号
                </span>
                <input
                  value={idCard}
                  onChange={(event) => setIdCard(event.target.value)}
                  placeholder="18位身份证号码"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900"
                />
              </label>
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => void verifyRealName()}
                disabled={verifying}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 disabled:opacity-50"
              >
                {verifying ? "核验中..." : "立即提交认证"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
