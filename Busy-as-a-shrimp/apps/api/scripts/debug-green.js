require("dotenv").config({ path: "C:/develop/Busy-as-a-shrimp/.env" });
require("reflect-metadata");
async function test() {
  const GreenSdk = require("@alicloud/green20220302").default;
  const { Config } = require("@alicloud/openapi-client");
  const Dara = require("@darabonba/typescript");
  const { TextModerationRequest, ImageModerationRequest } = require("@alicloud/green20220302");

  const client = new GreenSdk(
    new Config({
      accessKeyId: process.env["ALIYUN_ACCESS_KEY_ID"],
      accessKeySecret: process.env["ALIYUN_ACCESS_KEY_SECRET"],
      endpoint: "green-cip.cn-shanghai.aliyuncs.com",
      regionId: "cn-shanghai"
    })
  );
  const runtime = new Dara.RuntimeOptions({ readTimeout: 15000, connectTimeout: 15000 });

  function checkLabels(body) {
    const labels = String(body?.data?.labels ?? "");
    return labels.split(",").filter((l) => l.trim());
  }

  // 测试 1：正常文本
  console.log("\n=== 场景 1：正常文本 ===");
  const resp1 = await client.textModerationWithOptions(
    new TextModerationRequest({
      service: "comment_detection",
      serviceParameters: JSON.stringify({ content: "今天天气真好，适合散步", dataId: "test-1" })
    }),
    runtime
  );
  const labels1 = checkLabels(resp1.body);
  console.log(
    "labels:",
    JSON.stringify(labels1),
    "→",
    labels1.length === 0 ? "✅ PASS" : "❌ BLOCK"
  );

  // 测试 2：广告引流
  console.log("\n=== 场景 2：广告引流（微信/二维码） ===");
  const resp2 = await client.textModerationWithOptions(
    new TextModerationRequest({
      service: "comment_detection",
      serviceParameters: JSON.stringify({ content: "便宜卖，联系微信 abc123", dataId: "test-2" })
    }),
    runtime
  );
  const labels2 = checkLabels(resp2.body);
  console.log(
    "labels:",
    JSON.stringify(labels2),
    "→",
    labels2.length > 0 ? "✅ BLOCK（正确拦截）" : "❌ PASS（未拦截）"
  );

  // 测试 3：AI 生成内容检测
  console.log("\n=== 场景 3：AI 生成内容检测 ===");
  const resp3 = await client.textModerationWithOptions(
    new TextModerationRequest({
      service: "ai_art_detection",
      serviceParameters: JSON.stringify({
        content: "作为AI助手，我来帮你分析这个问题",
        dataId: "test-3"
      })
    }),
    runtime
  );
  const labels3 = checkLabels(resp3.body);
  console.log(
    "labels:",
    JSON.stringify(labels3),
    "→",
    labels3.length === 0 ? "✅ PASS" : "❌ BLOCK"
  );

  // 测试 4：敏感词
  console.log("\n=== 场景 4：明显违规词 ===");
  const resp4 = await client.textModerationWithOptions(
    new TextModerationRequest({
      service: "comment_detection",
      serviceParameters: JSON.stringify({ content: "靠你妈垃圾废物", dataId: "test-4" })
    }),
    runtime
  );
  const labels4 = checkLabels(resp4.body);
  console.log(
    "labels:",
    JSON.stringify(labels4),
    "→",
    labels4.length > 0 ? "✅ BLOCK（正确拦截）" : "❌ PASS（未拦截）"
  );

  // 测试 5：图片审核
  console.log("\n=== 场景 5：图片审核（用阿里的示例图） ===");
  const testImg = "https://img.alicdn.com/tfs/TB1HVNbNXXXXXX4apXXXXXXXXXX-100-100.jpg";
  const resp5 = await client.imageModerationWithOptions(
    new ImageModerationRequest({
      service: "baselineCheck",
      serviceParameters: JSON.stringify({ imageUrl: testImg, dataId: "test-5" })
    }),
    runtime
  );
  const labels5 = checkLabels(resp5.body);
  console.log("code:", resp5.body?.code, "labels:", JSON.stringify(labels5));
  console.log("result:", labels5.length === 0 ? "✅ PASS" : "❌ BLOCK");

  console.log("\n========================================");
  console.log("✅ 审核链路验证完毕");
  console.log("========================================");
}

test().catch((e) => console.error("请求失败:", e?.message, JSON.stringify(e?.response?.body)));
