"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Lock, MessageSquare, Phone } from "lucide-react";
import { z } from "zod";

import { getUserApi } from "@/api";
import { CaptchaInput, type CaptchaInputRef } from "@/components/auth/captcha-input";
import { Button } from "@/components/ui/button";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { privacyDocument, termsDocument } from "@/content/legal-documents";
import { toast } from "@/hooks/use-toast";
import { useUserStore } from "@/stores/user-store";
import { getErrorMessage } from "@/utils/error-message";

const phoneSchema = z
  .string()
  .trim()
  .min(1, "请输入手机号")
  .length(11, "手机号必须是 11 位")
  .regex(/^1[3-9]\d{9}$/, "请输入有效的中国大陆手机号");

const captchaValueSchema = z
  .string()
  .min(1, "请输入图形验证码")
  .regex(/^[a-zA-Z0-9]{4}$/, "图形验证码必须是 4 位字母或数字");

const verifyCodeSchema = z.string().regex(/^\d{6}$/, "短信验证码需为 6 位数字");
const passwordSchema = z
  .string()
  .min(6, "密码至少 6 位")
  .max(20, "密码最多 20 位")
  .regex(/^\S+$/, "密码不能包含空格");

const sendSmsSchema = z.object({
  phone: phoneSchema,
  captchaValue: captchaValueSchema,
  captchaId: z.string().min(1, "请先获取图形验证码")
});

const registerSchema = z
  .object({
    phone: phoneSchema,
    captchaValue: captchaValueSchema,
    captchaId: z.string().min(1, "请先获取图形验证码"),
    verifyCode: verifyCodeSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "请再次输入密码"),
    agreedToPolicies: z.boolean()
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"]
  })
  .refine((value) => value.agreedToPolicies, {
    message: "请先阅读并同意《用户协议》和《隐私政策》",
    path: ["agreedToPolicies"]
  });

type FormValues = z.infer<typeof registerSchema>;
type LegalDocumentKey = "terms" | "privacy";
const INVITE_CODE_STORAGE_KEY = "shrimpbusy_invite_code";

function sanitizeRedirect(redirect: string | null): string {
  if (!redirect || !redirect.startsWith("/")) {
    return "/";
  }
  return redirect;
}

function buildActivationRedirect(redirect: string | null): string {
  const target = sanitizeRedirect(redirect);
  return `/activation?redirect=${encodeURIComponent(target)}`;
}

function buildLoginHref(redirect: string | null, phone?: string, inviteCode?: string): string {
  const params = new URLSearchParams();
  const redirectTarget = sanitizeRedirect(redirect);
  if (redirectTarget !== "/") {
    params.set("redirect", redirectTarget);
  }
  if (phone) {
    params.set("phone", phone);
  }
  if (inviteCode) {
    params.set("inviteCode", inviteCode);
  }
  const suffix = params.toString();
  return `/auth${suffix ? `?${suffix}` : ""}`;
}

function normalizeInviteCode(inviteCode: string | null): string | undefined {
  const normalized = inviteCode?.trim();
  return normalized ? normalized : undefined;
}

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const captchaRef = useRef<CaptchaInputRef>(null);
  const smsInputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [hasSentSms, setHasSentSms] = useState(false);
  const [smsCooldown, setSmsCooldown] = useState(0);
  const [previewDocument, setPreviewDocument] = useState<LegalDocumentKey | null>(null);
  const [registeredPhoneHint, setRegisteredPhoneHint] = useState<string | null>(null);
  const [effectiveInviteCode, setEffectiveInviteCode] = useState<string | undefined>(undefined);
  const setLogin = useUserStore((state) => state.setLogin);

  useEffect(() => {
    const queryInviteCode = normalizeInviteCode(searchParams.get("inviteCode"));
    if (queryInviteCode) {
      setEffectiveInviteCode(queryInviteCode);
      window.localStorage.setItem(INVITE_CODE_STORAGE_KEY, queryInviteCode);
      return;
    }

    const cachedInviteCode = normalizeInviteCode(
      window.localStorage.getItem(INVITE_CODE_STORAGE_KEY)
    );
    setEffectiveInviteCode(cachedInviteCode);
  }, [searchParams]);

  useEffect(() => {
    if (smsCooldown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setSmsCooldown((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [smsCooldown]);

  const form = useForm<FormValues>({
    defaultValues: {
      phone: "",
      captchaValue: "",
      captchaId: "",
      verifyCode: "",
      password: "",
      confirmPassword: "",
      agreedToPolicies: false
    }
  });

  const handleCaptchaIdChange = useCallback(
    (captchaId: string) => {
      form.setValue("captchaId", captchaId, { shouldValidate: false, shouldDirty: false });
      if (captchaId) {
        form.clearErrors("captchaValue");
      }
    },
    [form]
  );

  function setFieldError(field: keyof FormValues, message: string) {
    form.setError(field, {
      type: "manual",
      message
    });
  }

  function handleRegisteredPhone(message: string, phone: string) {
    setRegisteredPhoneHint(phone);
    setFieldError("phone", message);
  }

  const previewConfig =
    previewDocument === "terms"
      ? termsDocument
      : previewDocument === "privacy"
        ? privacyDocument
        : null;

  async function onSendSms() {
    const payload = form.getValues();
    const parsed = sendSmsSchema.safeParse({
      phone: payload.phone,
      captchaValue: payload.captchaValue,
      captchaId: payload.captchaId
    });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "phone" || field === "captchaValue" || field === "captchaId") {
          setFieldError(field, issue.message);
        }
      }
      return;
    }

    setSendingSms(true);
    try {
      setRegisteredPhoneHint(null);
      await getUserApi().sendSms({
        ...parsed.data,
        purpose: "register"
      });
      setSmsCooldown(60);
      setHasSentSms(true);

      toast({
        title: "验证码发送成功",
        description: "请查收短信验证码"
      });
      smsInputRef.current?.focus();
    } catch (error) {
      const message = getErrorMessage(error);
      if (message.includes("已被注册")) {
        handleRegisteredPhone(message, parsed.data.phone);
        return;
      }

      form.setValue("captchaValue", "");
      await captchaRef.current?.refreshCaptcha();
      toast({
        variant: "destructive",
        title: "发送失败",
        description: message
      });
    } finally {
      setSendingSms(false);
    }
  }

  async function onSubmit(values: FormValues) {
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (
          field === "phone" ||
          field === "captchaValue" ||
          field === "captchaId" ||
          field === "verifyCode" ||
          field === "password" ||
          field === "confirmPassword" ||
          field === "agreedToPolicies"
        ) {
          setFieldError(field, issue.message);
        }
      }
      toast({
        variant: "destructive",
        title: "表单校验失败",
        description: "请检查注册信息后重试"
      });
      return;
    }

    if (!hasSentSms) {
      toast({
        variant: "destructive",
        title: "请先获取验证码",
        description: "请先完成图形验证码并发送短信验证码"
      });
      return;
    }

    setSubmitting(true);
    try {
      setRegisteredPhoneHint(null);
      const result = await getUserApi().register({
        phone: parsed.data.phone,
        captchaId: parsed.data.captchaId,
        captchaValue: parsed.data.captchaValue,
        verifyCode: parsed.data.verifyCode,
        password: parsed.data.password,
        inviteCode: effectiveInviteCode
      });

      window.localStorage.removeItem(INVITE_CODE_STORAGE_KEY);

      setLogin({
        token: result.token,
        userId: result.user.userId,
        phone: parsed.data.phone,
        role: result.user.role,
        memberLevel: result.user.memberLevel,
        isRealNameVerified: result.user.isRealNameVerified,
        pointsBalance: result.user.pointsBalance,
        memberMonthlyPointsGift: result.user.memberMonthlyPointsGift,
        currentMonthGrantedPoints: result.user.currentMonthGrantedPoints,
        isMomoUnlocked: result.user.isMomoUnlocked
      });

      toast({
        title: "注册成功",
        description: "账号已创建，正在进入赛博分身激活三步曲"
      });

      router.replace(buildActivationRedirect(searchParams.get("redirect")));
    } catch (error) {
      const message = getErrorMessage(error);
      if (message.includes("已被注册")) {
        handleRegisteredPhone(message, parsed.data.phone);
        return;
      }

      toast({
        variant: "destructive",
        title: "注册失败",
        description: message
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="relative isolate -mx-4 flex min-h-[calc(100vh-2rem)] items-center justify-center overflow-hidden bg-slate-50 px-4 py-12 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-cyan-100/50 blur-[120px] opacity-70" />
        <div className="absolute -right-1/4 -bottom-1/4 h-[800px] w-[800px] rounded-full bg-blue-100/50 blur-[120px] opacity-60" />
      </div>

      <div className="relative group w-full max-w-[36rem]">
        <div className="absolute -inset-[2px] overflow-hidden rounded-[2.6rem] pointer-events-none z-0">
          <div className="absolute inset-[-150%] animate-[spin_8s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(6,182,212,0.06)_330deg,rgba(6,182,212,0.16)_360deg)] blur-3xl" />
          <div className="absolute inset-[-150%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(6,182,212,0.35)_355deg,rgba(6,182,212,0.55)_360deg)] blur-md" />
        </div>

        <div className="relative z-10 w-full rounded-[2.5rem] border border-white border-t-cyan-500/20 bg-white/90 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-3xl sm:p-10">
          <header className="space-y-3 pb-10">
            <h1 className="bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-3xl font-black tracking-tighter text-transparent uppercase">
              创建虾忙账号
              <span className="block text-lg font-medium tracking-normal text-slate-400 normal-case">
                Register Account
              </span>
            </h1>
            <p className="text-sm font-medium leading-relaxed tracking-wide text-slate-500">
              完成短信验证并设置密码后即可独立登录，不再自动注册
            </p>
          </header>

          <div className="mb-10 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-center">
            <span className="text-sm font-bold tracking-tight text-cyan-600">
              {effectiveInviteCode ? `团长邀请注册 · ${effectiveInviteCode}` : "独立注册"}
            </span>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="space-y-2.5">
                    <FormLabel className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                      手机号
                    </FormLabel>
                    <FormControl>
                      <div className="group relative">
                        <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-cyan-500" />
                        <Input
                          {...field}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          maxLength={11}
                          placeholder="请输入 11 位手机号"
                          className="h-14 rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-slate-900 shadow-sm transition-all placeholder:text-slate-300 focus-visible:border-cyan-500/30 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                          onChange={(event) => {
                            const next = event.target.value.replace(/\D/g, "").slice(0, 11);
                            setRegisteredPhoneHint(null);
                            field.onChange(next);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="ml-1 text-[11px] font-medium text-rose-500/80" />
                    {registeredPhoneHint ? (
                      <div className="ml-1 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        <span>该手机号已注册，可直接前往登录页继续登录。</span>
                        <Button
                          asChild
                          type="button"
                          variant="ghost"
                          className="h-auto rounded-full px-3 py-1 text-xs font-semibold text-cyan-700 hover:bg-white/80 hover:text-cyan-800"
                        >
                          <Link
                            href={buildLoginHref(
                              searchParams.get("redirect"),
                              registeredPhoneHint,
                              effectiveInviteCode
                            )}
                          >
                            去登录
                          </Link>
                        </Button>
                      </div>
                    ) : null}
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="captchaValue"
                  render={({ field }) => (
                    <FormItem className="space-y-2.5">
                      <FormLabel className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                        图形码
                      </FormLabel>
                      <FormControl>
                        <CaptchaInput
                          ref={captchaRef}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="4 位图形码"
                          maxLength={4}
                          className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 shadow-sm transition-all placeholder:text-slate-300 focus-visible:border-cyan-500/30 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                          onCaptchaIdChange={handleCaptchaIdChange}
                        />
                      </FormControl>
                      <FormMessage className="ml-1 text-[11px] font-medium text-rose-500/80" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="verifyCode"
                  render={({ field }) => (
                    <FormItem className="space-y-2.5">
                      <FormLabel className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                        短信码
                      </FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <div className="group relative flex-1">
                            <MessageSquare className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-cyan-500" />
                            <Input
                              {...field}
                              ref={(element) => {
                                field.ref(element);
                                smsInputRef.current = element;
                              }}
                              type="tel"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={6}
                              placeholder="6 位短信验证码"
                              className="h-14 rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-slate-900 shadow-sm transition-all placeholder:text-slate-300 focus-visible:border-cyan-500/30 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                              onChange={(event) => {
                                const next = event.target.value.replace(/\D/g, "").slice(0, 6);
                                field.onChange(next);
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            className="h-14 min-w-[124px] shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-cyan-600 transition-all hover:bg-slate-100 hover:text-cyan-700 disabled:opacity-40"
                            disabled={sendingSms || smsCooldown > 0}
                            onClick={() => void onSendSms()}
                          >
                            {sendingSms ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : smsCooldown > 0 ? (
                              `${smsCooldown}S`
                            ) : (
                              "获取验证码"
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage className="ml-1 text-[11px] font-medium text-rose-500/80" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-2.5">
                      <FormLabel className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                        设置密码
                      </FormLabel>
                      <FormControl>
                        <div className="group relative">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-cyan-500" />
                          <Input
                            {...field}
                            type="password"
                            autoComplete="new-password"
                            placeholder="6-20 位密码"
                            className="h-14 rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-slate-900 shadow-sm transition-all placeholder:text-slate-300 focus-visible:border-cyan-500/30 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="ml-1 text-[11px] font-medium text-rose-500/80" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-2.5">
                      <FormLabel className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                        确认密码
                      </FormLabel>
                      <FormControl>
                        <div className="group relative">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-cyan-500" />
                          <Input
                            {...field}
                            type="password"
                            autoComplete="new-password"
                            placeholder="再次输入密码"
                            className="h-14 rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-slate-900 shadow-sm transition-all placeholder:text-slate-300 focus-visible:border-cyan-500/30 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="ml-1 text-[11px] font-medium text-rose-500/80" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="agreedToPolicies"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormControl>
                      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-50">
                        <input
                          ref={field.ref}
                          type="checkbox"
                          checked={field.value}
                          onBlur={field.onBlur}
                          onChange={(event) => field.onChange(event.target.checked)}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-cyan-600 focus:ring-2 focus:ring-cyan-500/30"
                        />
                        <span>
                          我已阅读并同意
                          <button
                            type="button"
                            className="mx-1 font-semibold text-cyan-600 transition-colors hover:text-cyan-700"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setPreviewDocument("terms");
                            }}
                          >
                            《用户协议》
                          </button>
                          和
                          <button
                            type="button"
                            className="ml-1 font-semibold text-cyan-600 transition-colors hover:text-cyan-700"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setPreviewDocument("privacy");
                            }}
                          >
                            《隐私政策》
                          </button>
                        </span>
                      </label>
                    </FormControl>
                    <FormMessage className="ml-1 text-[11px] font-medium text-rose-500/80" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="group relative h-16 w-full overflow-hidden rounded-2xl bg-cyan-500 px-6 font-black tracking-[0.2em] text-black shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_50px_rgba(6,182,212,0.5)] active:scale-[0.98]"
                disabled={submitting}
              >
                <span className="relative z-10 flex items-center justify-center gap-2 uppercase">
                  {submitting ? <Loader2 className="mr-1 h-5 w-5 animate-spin" /> : null}
                  {submitting ? "注册中..." : "注册并进入"}
                </span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
              </Button>
            </form>
          </Form>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
            <span>已经有账号？</span>
              <Link
                href={buildLoginHref(
                  searchParams.get("redirect"),
                  undefined,
                  effectiveInviteCode
                )}
                className="font-bold text-cyan-600 transition-colors hover:text-cyan-700"
              >
              返回登录
            </Link>
          </div>

          <footer className="flex justify-center pt-8">
            <Button
              asChild
              variant="ghost"
              className="h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-widest text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-600"
            >
              <Link href="/">返回首页</Link>
            </Button>
          </footer>
        </div>
      </div>

      <Dialog open={previewDocument !== null} onOpenChange={(open) => !open && setPreviewDocument(null)}>
        <DialogContent className="w-[min(92vw,960px)] max-w-5xl gap-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.2)]">
          <DialogHeader className="border-b border-slate-100 px-6 py-5 sm:px-8">
            <DialogTitle className="text-left text-xl font-black tracking-tight text-slate-900">
              {previewConfig?.label ?? "协议预览"}
            </DialogTitle>
            <DialogDescription className="text-left text-sm leading-6 text-slate-500">
              可直接在当前注册页预览协议内容，阅读完成后关闭弹窗继续注册。
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[75vh] overflow-y-auto px-6 py-6 sm:px-8">
            {previewConfig ? <LegalDocumentView document={previewConfig} compact /> : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="text-xs leading-6 text-slate-500">
              如需单独页面查看，也可以继续访问
              <Link
                href={previewDocument === "privacy" ? "/privacy" : "/terms"}
                className="ml-1 font-semibold text-cyan-600 transition-colors hover:text-cyan-700"
              >
                {previewDocument === "privacy" ? "隐私政策页" : "用户协议页"}
              </Link>
              。
            </p>
            <Button
              type="button"
              className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={() => setPreviewDocument(null)}
            >
              我已阅读，返回注册
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </section>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<section className="min-h-[calc(100vh-2rem)] bg-slate-50" />}>
      <RegisterPageContent />
    </Suspense>
  );
}
