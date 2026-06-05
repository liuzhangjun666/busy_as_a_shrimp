/**
 * 阿里云内容审核集成测试
 * 运行方式: npx ts-node scripts/test-aliyun-green.ts
 *
 * 前提：
 * 1. .env 中已配置 ALIYUN_ACCESS_KEY_ID 和 ALIYUN_ACCESS_KEY_SECRET
 * 2. 已安装 @darabonba/typescript: pnpm add @darabonba/typescript -F @airp/api
 */

import "reflect-metadata";
import * as dotenv from "dotenv";
import path from "path";

// 加载 .env 环境变量（.env 在项目根目录，从 apps/api/scripts 往上走 3 层）
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// 加载已编译的 provider（不走 Nest 容器，直接测 SDK）
async function main() {
  console.log("=".repeat(50));
  console.log("🚀 阿里云内容审核集成测试");
  console.log("=".repeat(50));

  const accessKeyId = process.env["ALIYUN_ACCESS_KEY_ID"];
  const accessKeySecret = process.env["ALIYUN_ACCESS_KEY_SECRET"];

  if (!accessKeyId || !accessKeySecret) {
    console.error("❌ 缺少环境变量：ALIYUN_ACCESS_KEY_ID 或 ALIYUN_ACCESS_KEY_SECRET");
    process.exit(1);
  }

  console.log(`✅ AccessKey 已加载: ${accessKeyId.slice(0, 4)}...${accessKeyId.slice(-4)}`);

  // 动态 import，避免 ts-node 找不到模块
  const GreenSdk = (await import("@alicloud/green20220302")).default;
  const { Config: OpenApiConfig } = await import("@alicloud/openapi-client");
  const Dara = await import("@darabonba/typescript");
  const { TextModerationRequest, ImageModerationRequest } = await import("@alicloud/green20220302");

  const client = new GreenSdk(
    new OpenApiConfig({
      accessKeyId,
      accessKeySecret,
      endpoint: "green-cip.cn-shanghai.aliyuncs.com",
      regionId: "cn-shanghai"
    })
  );

  const runtime = new Dara.RuntimeOptions({
    readTimeout: 15_000,
    connectTimeout: 15_000
  });

  // ========== 场景 1：文本审核 - 合规内容 ==========
  console.log("\n📝 测试 1：文本审核 - 合规内容");
  try {
    const normalText = new TextModerationRequest({
      service: "comment_detection_pro",
      serviceParameters: JSON.stringify({
        content: "今天天气真好，适合出门散步",
        dataId: `test-txt-normal-${Date.now()}`
      })
    });
    const resp1 = await client.textModerationWithOptions(normalText, runtime);
    const body1 = (resp1 as { body?: Record<string, unknown> }).body ?? {};
    const data1 = body1.data as Record<string, unknown> | undefined;
    console.log(`   风险等级: ${data1?.riskLevel}`);
    console.log(`   标签: ${data1?.labels ?? "无"}`);
    console.log(`   结果: ${data1?.riskLevel === "none" ? "✅ 通过" : "❌ 需复查"}`);
  } catch (e) {
    console.error(`   ❌ 失败: ${e}`);
  }

  // ========== 场景 2：文本审核 - 违规内容 ==========
  console.log("\n📝 测试 2：文本审核 - 违规内容（应该被拦截）");
  try {
    const riskyText = new TextModerationRequest({
      service: "comment_detection_pro",
      serviceParameters: JSON.stringify({
        content: "这个产品真的太好用了，非常满意，联系微信 abc123",
        dataId: `test-txt-risky-${Date.now()}`
      })
    });
    const resp2 = await client.textModerationWithOptions(riskyText, runtime);
    const body2 = (resp2 as { body?: Record<string, unknown> }).body ?? {};
    const data2 = body2.data as Record<string, unknown> | undefined;
    const level = String(data2?.riskLevel ?? "");
    console.log(`   风险等级: ${level}`);
    console.log(`   标签: ${data2?.labels ?? "无"}`);
    console.log(`   结果: ${level !== "none" ? "✅ 正确拦截" : "⚠️ 未拦截（内容可能不够明显）"}`);
  } catch (e) {
    console.error(`   ❌ 失败: ${e}`);
  }

  // ========== 场景 3：AI 生成内容审核 ==========
  console.log("\n🤖 测试 3：AI 生成内容审核（llm_response_moderation）");
  try {
    const aiText = new TextModerationRequest({
      service: "llm_response_moderation",
      serviceParameters: JSON.stringify({
        content: "作为你的专属分身，我来帮你分析一下这个问题的答案",
        dataId: `test-ai-txt-${Date.now()}`
      })
    });
    const resp3 = await client.textModerationWithOptions(aiText, runtime);
    const body3 = (resp3 as { body?: Record<string, unknown> }).body ?? {};
    const data3 = body3.data as Record<string, unknown> | undefined;
    console.log(`   风险等级: ${data3?.riskLevel}`);
    console.log(`   标签: ${data3?.labels ?? "无"}`);
    console.log(`   结果: ${data3?.riskLevel === "none" ? "✅ 通过" : "❌ 需复查"}`);
  } catch (e) {
    console.error(`   ❌ 失败: ${e}`);
  }

  // ========== 场景 4：图片审核 ==========
  console.log("\n🖼️  测试 4：图片审核");
  const testImageUrl = "https://img.alicdn.com/tfs/TB1HVNbNXXXXXX4apXXXXXXXXXX-100-100.jpg";
  try {
    const imageReq = new ImageModerationRequest({
      service: "baselineCheck",
      serviceParameters: JSON.stringify({
        imageUrl: testImageUrl,
        dataId: `test-img-${Date.now()}`
      })
    });
    const resp4 = await client.imageModerationWithOptions(imageReq, runtime);
    const body4 = (resp4 as { body?: Record<string, unknown> }).body ?? {};
    const data4 = body4.data as Record<string, unknown> | undefined;
    console.log(`   风险等级: ${data4?.riskLevel}`);
    console.log(`   标签: ${data4?.labels ?? "无"}`);
    console.log(`   结果: ${data4?.riskLevel === "none" ? "✅ 通过" : "⚠️ 需复查"}`);
  } catch (e) {
    console.error(`   ❌ 失败: ${e}`);
  }

  // ========== 场景 5：头像图片审核 ==========
  console.log("\n👤 测试 5：头像图片审核（profilePhotoCheck）");
  try {
    const avatarReq = new ImageModerationRequest({
      service: "profilePhotoCheck",
      serviceParameters: JSON.stringify({
        imageUrl: testImageUrl,
        dataId: `test-avatar-${Date.now()}`
      })
    });
    const resp5 = await client.imageModerationWithOptions(avatarReq, runtime);
    const body5 = (resp5 as { body?: Record<string, unknown> }).body ?? {};
    const data5 = body5.data as Record<string, unknown> | undefined;
    console.log(`   风险等级: ${data5?.riskLevel}`);
    console.log(`   标签: ${data5?.labels ?? "无"}`);
    console.log(`   结果: ${data5?.riskLevel === "none" ? "✅ 通过" : "⚠️ 需复查"}`);
  } catch (e) {
    console.error(`   ❌ 失败: ${e}`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ 全部测试完成");
  console.log("=".repeat(50));
}

main().catch((e) => {
  console.error("脚本异常:", e);
  process.exit(1);
});
