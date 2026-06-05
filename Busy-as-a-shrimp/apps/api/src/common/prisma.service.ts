import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      await this.assertSchemaReady();
    } catch (error) {
      const canStartWithoutDb = process.env.ALLOW_API_WITHOUT_DB === "1";
      if (!canStartWithoutDb) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Database connection skipped: ${message}`);
    }
  }

  private async assertSchemaReady(): Promise<void> {
    const resourceTypesColumn = await this.$queryRaw<
      Array<{
        columnCount: number | bigint;
      }>
    >`
      SELECT COUNT(1) AS columnCount
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'resources'
        AND COLUMN_NAME = 'resource_types'
    `;

    const columnCount = Number(resourceTypesColumn[0]?.columnCount ?? 0);
    if (columnCount > 0) {
      return;
    }

    throw new Error(
      [
        "Database schema is outdated: missing resources.resource_types.",
        "Run: corepack pnpm --filter @airp/database migrate:deploy",
        "Then: corepack pnpm --filter @airp/database generate"
      ].join(" ")
    );
  }
}
