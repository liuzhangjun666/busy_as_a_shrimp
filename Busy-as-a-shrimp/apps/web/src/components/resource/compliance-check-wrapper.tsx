import type { ReactNode } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function containsPrivateContact(text: string): boolean {
  const normalized = text.replace(/\s+/g, "");
  return (
    /1\d{10}/.test(normalized) ||
    /wechat|vx|v信|微信/i.test(normalized) ||
    /qq/i.test(normalized) ||
    /@/.test(normalized)
  );
}

export function getComplianceViolationMessage(values: string[]): string | null {
  const merged = values.join(" ");
  if (containsPrivateContact(merged)) {
    return "检测到疑似私下联系方式，请改为平台内可审核描述。";
  }
  return null;
}

type ComplianceCheckWrapperProps = {
  warningMessage?: string;
  children: ReactNode;
};

export function ComplianceCheckWrapper({ warningMessage, children }: ComplianceCheckWrapperProps) {
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border border-zinc-100 bg-white/65 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-zinc-900">
            <ShieldCheck className="h-4 w-4 text-zinc-700" />
            合规校验
          </CardTitle>
          <CardDescription className="text-xs text-zinc-500">
            禁止上传手机号、微信、QQ、邮箱等私联信息。
          </CardDescription>
        </CardHeader>
        {warningMessage ? (
          <CardContent>
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <p>{warningMessage}</p>
            </div>
          </CardContent>
        ) : null}
      </Card>

      {children}
    </div>
  );
}
