"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Lock, MessageSquare, Phone } from "lucide-react";
import { z } from "zod";

import { getUserApi } from "@/api";
import { CaptchaInput, type CaptchaInputRef } from "@/components/auth/captcha-input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
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

const resetPasswordSchema = z
  .object({
    phone: phoneSchema,
    captchaValue: captchaValueSchema,
    captchaId: z.string().min(1, "请先获取图形验证码"),
    verifyCode: verifyCodeSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "请再次输入密码")
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"]
  });

type FormValues = z.infer<typeof resetPasswordSchema>;

function ForgotPasswordPageContent() {
  const router = useRouter();
  const captchaRef = useRef<CaptchaInputRef>(null);
  const smsInputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [hasSentSms, setHasSentSms] = useState(false);
  const [smsCooldown, setSmsCooldown] = useState(0);

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
      confirmPassword: ""
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
      await getUserApi().sendSms({
        ...parsed.data,
        purpose: "reset_password"
      });
      setSmsCooldown(60);
      setHasSentSms(true);

      toast({
        title: "验证码发送成功",
        description: "请查收短信验证码"
      });
      smsInputRef.current?.focus();
    } catch (error) {
      form.setValue("captchaValue", "");
      await captchaRef.current?.refreshCaptcha();
      toast({
        variant: "destructive",
        title: "发送失败",
        description: getErrorMessage(error)
      });
    } finally {
      setSendingSms(false);
    }
  }

  async function onSubmit(values: FormValues) {
    const parsed = resetPasswordSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (
          field === "phone" ||
          field === "captchaValue" ||
          field === "captchaId" ||
          field === "verifyCode" ||
          field === "password" ||
          field === "confirmPassword"
        ) {
          setFieldError(field, issue.message);
        }
      }
      toast({
        variant: "destructive",
        title: "表单校验失败",
        description: "请检查找回信息后重试"
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
      await getUserApi().resetPassword({
        phone: parsed.data.phone,
        captchaId: parsed.data.captchaId,
        captchaValue: parsed.data.captchaValue,
        verifyCode: parsed.data.verifyCode,
        password: parsed.data.password
      });

      toast({
        title: "密码重置成功",
        description: "请使用新密码重新登录"
      });
      router.replace("/auth");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "重置失败",
        description: getErrorMessage(error)
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="relative isolate -mx-4 flex min-h-[calc(100vh-2rem)] items-center justify-center overflow-hidden bg-slate-50 px-4 py-12 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-sky-100/50 blur-[120px] opacity-70" />
        <div className="absolute -right-1/4 -bottom-1/4 h-[800px] w-[800px] rounded-full bg-cyan-100/50 blur-[120px] opacity-60" />
      </div>

      <div className="relative group w-full max-w-[36rem]">
        <div className="absolute -inset-[2px] overflow-hidden rounded-[2.6rem] pointer-events-none z-0">
          <div className="absolute inset-[-150%] animate-[spin_8s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(14,165,233,0.06)_330deg,rgba(14,165,233,0.16)_360deg)] blur-3xl" />
          <div className="absolute inset-[-150%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(14,165,233,0.35)_355deg,rgba(14,165,233,0.55)_360deg)] blur-md" />
        </div>

        <div className="relative z-10 w-full rounded-[2.5rem] border border-white border-t-sky-500/20 bg-white/90 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-3xl sm:p-10">
          <header className="space-y-3 pb-10">
            <h1 className="bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-3xl font-black tracking-tighter text-transparent uppercase">
              找回登录密码
              <span className="block text-lg font-medium tracking-normal text-slate-400 normal-case">
                Reset Password
              </span>
            </h1>
            <p className="text-sm font-medium leading-relaxed tracking-wide text-slate-500">
              通过短信验证重置密码，成功后返回登录页
            </p>
          </header>

          <div className="mb-10 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-center">
            <span className="text-sm font-bold tracking-tight text-sky-600">短信找回</span>
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
                        <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-sky-500" />
                        <Input
                          {...field}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          maxLength={11}
                          placeholder="请输入 11 位手机号"
                          className="h-14 rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-slate-900 shadow-sm transition-all placeholder:text-slate-300 focus-visible:border-sky-500/30 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-sky-500/50"
                          onChange={(event) => {
                            const next = event.target.value.replace(/\D/g, "").slice(0, 11);
                            field.onChange(next);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="ml-1 text-[11px] font-medium text-rose-500/80" />
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
                          className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 shadow-sm transition-all placeholder:text-slate-300 focus-visible:border-sky-500/30 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-sky-500/50"
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
                            <MessageSquare className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-sky-500" />
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
                              className="h-14 rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-slate-900 shadow-sm transition-all placeholder:text-slate-300 focus-visible:border-sky-500/30 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-sky-500/50"
                              onChange={(event) => {
                                const next = event.target.value.replace(/\D/g, "").slice(0, 6);
                                field.onChange(next);
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            className="h-14 min-w-[124px] shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-sky-600 transition-all hover:bg-slate-100 hover:text-sky-700 disabled:opacity-40"
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
                        新密码
                      </FormLabel>
                      <FormControl>
                        <div className="group relative">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-sky-500" />
                          <Input
                            {...field}
                            type="password"
                            autoComplete="new-password"
                            placeholder="6-20 位新密码"
                            className="h-14 rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-slate-900 shadow-sm transition-all placeholder:text-slate-300 focus-visible:border-sky-500/30 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-sky-500/50"
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
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-sky-500" />
                          <Input
                            {...field}
                            type="password"
                            autoComplete="new-password"
                            placeholder="再次输入新密码"
                            className="h-14 rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-slate-900 shadow-sm transition-all placeholder:text-slate-300 focus-visible:border-sky-500/30 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-sky-500/50"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="ml-1 text-[11px] font-medium text-rose-500/80" />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="group relative h-16 w-full overflow-hidden rounded-2xl bg-sky-500 px-6 font-black tracking-[0.2em] text-black shadow-[0_0_30px_rgba(14,165,233,0.3)] transition-all hover:bg-sky-400 hover:shadow-[0_0_50px_rgba(14,165,233,0.5)] active:scale-[0.98]"
                disabled={submitting}
              >
                <span className="relative z-10 flex items-center justify-center gap-2 uppercase">
                  {submitting ? <Loader2 className="mr-1 h-5 w-5 animate-spin" /> : null}
                  {submitting ? "重置中..." : "重置密码"}
                </span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
              </Button>
            </form>
          </Form>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
            <span>想起密码了？</span>
            <Link
              href="/auth"
              className="font-bold text-sky-600 transition-colors hover:text-sky-700"
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

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<section className="min-h-[calc(100vh-2rem)] bg-slate-50" />}>
      <ForgotPasswordPageContent />
    </Suspense>
  );
}
