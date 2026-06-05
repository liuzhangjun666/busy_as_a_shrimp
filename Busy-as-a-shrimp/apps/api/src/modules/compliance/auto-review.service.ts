import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ResourceStatus, SubmissionStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { ResourceService } from "../resource/resource.service";
import { TaskService } from "../task/task.service";
import { ComplianceService } from "./compliance.service";

@Injectable()
export class AutoReviewService {
  private readonly logger = new Logger(AutoReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly complianceService: ComplianceService,
    private readonly resourceService: ResourceService,
    private readonly taskService: TaskService
  ) {}

  /**
   * 每 3 小时自动审核一次：阿里云主审，服务不可用时自动回落本地兜底。
   */
  @Cron("0 */3 * * *")
  async handleAutoReview() {
    this.logger.log("[AutoReview] scheduled review started");

    await Promise.all([this.reviewPendingResources(), this.reviewPendingSubmissions()]);

    this.logger.log("[AutoReview] scheduled review finished");
  }

  private async reviewPendingResources() {
    const pendingResources = await this.prisma.resource.findMany({
      where: { status: ResourceStatus.pending },
      orderBy: { resourceId: "asc" },
      take: 500
    });

    if (pendingResources.length === 0) {
      return;
    }

    this.logger.log(`[AutoReview] pending resources: ${pendingResources.length}`);

    for (const resource of pendingResources) {
      try {
        const texts = this.collectResourceReviewTexts(resource.tags, resource.activationDetails);

        if (texts.length === 0) {
          await this.resourceService.approveResource(resource.resourceId, "auto:no_content");
          continue;
        }

        const decision = await this.complianceService.reviewTexts(texts, {
          scene: "resource_upload"
        });

        if (decision.passed) {
          await this.resourceService.approveResource(
            resource.resourceId,
            `auto:${decision.engine}`
          );
          this.logger.log(
            `[AutoReview] resource ${resource.resourceId.toString()} approved (${decision.engine})`
          );
          continue;
        }

        await this.resourceService.rejectResource(
          resource.resourceId,
          decision.reason || "命中内容审核规则",
          `auto:${decision.engine}`
        );
        this.logger.warn(
          `[AutoReview] resource ${resource.resourceId.toString()} rejected (${decision.engine}): ${decision.reason}`
        );
      } catch (error) {
        this.logger.error(
          `[AutoReview] resource ${resource.resourceId.toString()} review error: ${(error as Error).message}`
        );
      }
    }
  }

  private async reviewPendingSubmissions() {
    const pendingSubmissions = await this.prisma.taskSubmission.findMany({
      where: { status: SubmissionStatus.PENDING },
      orderBy: { submissionId: "asc" },
      take: 500
    });

    if (pendingSubmissions.length === 0) {
      return;
    }

    this.logger.log(`[AutoReview] pending submissions: ${pendingSubmissions.length}`);

    for (const submission of pendingSubmissions) {
      try {
        if (!submission.proof) {
          continue;
        }

        await this.complianceService.checkText(submission.proof, { scene: "content_publish" });

        await this.taskService.approveSubmission(submission.submissionId);
        this.logger.log(`[AutoReview] submission ${submission.submissionId.toString()} approved`);
      } catch (error) {
        this.logger.warn(
          `[AutoReview] submission ${submission.submissionId.toString()} pending: ${(error as Error).message}`
        );
      }
    }
  }

  private collectResourceReviewTexts(tags: unknown, activationDetails: unknown): string[] {
    const output = new Set<string>();

    if (Array.isArray(tags)) {
      for (const tag of tags) {
        if (typeof tag === "string") {
          const normalized = tag.trim();
          if (normalized) {
            output.add(normalized);
          }
        }
      }
    }

    if (activationDetails && typeof activationDetails === "object") {
      const payload = activationDetails as {
        flowTitle?: unknown;
        stepDetails?: {
          resource?: Array<{ label?: unknown; intro?: unknown; note?: unknown }>;
          skill?: Array<{ label?: unknown; intro?: unknown; note?: unknown }>;
          goal?: Array<{ label?: unknown; intro?: unknown; note?: unknown }>;
        };
      };

      if (typeof payload.flowTitle === "string" && payload.flowTitle.trim()) {
        output.add(payload.flowTitle.trim());
      }

      const pushItemTexts = (
        items?: Array<{ label?: unknown; intro?: unknown; note?: unknown }>
      ) => {
        if (!Array.isArray(items)) {
          return;
        }
        for (const item of items) {
          [item.label, item.intro, item.note].forEach((value) => {
            if (typeof value === "string") {
              const normalized = value.trim();
              if (normalized) {
                output.add(normalized);
              }
            }
          });
        }
      };

      pushItemTexts(payload.stepDetails?.resource);
      pushItemTexts(payload.stepDetails?.skill);
      pushItemTexts(payload.stepDetails?.goal);
    }

    return Array.from(output);
  }
}
