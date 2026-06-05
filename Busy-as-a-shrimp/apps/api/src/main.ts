import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { config as dotenvConfig } from "dotenv";
import { json, static as expressStatic, type Request, urlencoded } from "express";
import path from "path";
import { GlobalExceptionFilter } from "./common/global-exception.filter";
import { resolveUploadsDir } from "./common/uploads-path";

// Ensure BigInt can be serialized in JSON responses.
(BigInt.prototype as unknown as Record<string, unknown>).toJSON = function () {
  return this.toString();
};

function preloadEnvFiles(): void {
  const envPaths = [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "../../.env"),
    ".env"
  ];

  for (const envPath of envPaths) {
    dotenvConfig({ path: envPath, override: false });
  }
}

async function bootstrap(): Promise<void> {
  // Load env files before importing AppModule so process.env-based static/module-level
  // config (for example LOBSTER_MQ_DISABLED) can take effect without extra startup flags.
  preloadEnvFiles();
  const { AppModule } = await import("./app.module");

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: false
  });

  // Keep raw body for signature verification scenarios.
  app.use(
    json({
      limit: "5mb",
      verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );

  app.use(
    urlencoded({
      extended: true,
      limit: "5mb",
      verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );

  app.use("/uploads", expressStatic(resolveUploadsDir()));

  app.setGlobalPrefix("api/v1", {
    exclude: [{ path: "api/payment/wechat/callback", method: RequestMethod.POST }]
  });
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3002"
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  // Return a consistent error envelope for all exceptions.
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = Number(process.env.API_PORT ?? 8081);
  await app.listen(port);
}

void bootstrap();
