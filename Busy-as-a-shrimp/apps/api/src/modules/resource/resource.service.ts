import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { ComplianceService } from "../compliance/compliance.service";
import { DoppelgangerService } from "../doppelganger/doppelganger.service";
import {
  ActivationDetailsDto,
  ResourceStatus,
  ResourceType,
  UpdateResourceDto,
  UploadResourceDto
} from "./dto/resource.dto";

@Injectable()
export class ResourceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly compliance: ComplianceService,
    private readonly doppelgangerService: DoppelgangerService
  ) {}

  private static readonly RESOURCE_TYPE_VALUES = Object.values(ResourceType);

  private normalizeReviewEngine(reviewEngine?: string | null): string | null {
    const normalized = reviewEngine?.trim();
    if (!normalized) {
      return null;
    }
    return normalized.slice(0, 64);
  }

  private async activateLobsterWhenSleeping(
    tx: Prisma.TransactionClient,
    userId: bigint
  ): Promise<void> {
    const lobster = await tx.lobsterStatus.findUnique({
      where: { userId },
      select: { lobsterId: true, status: true }
    });

    if (!lobster) {
      await tx.lobsterStatus.create({
        data: {
          userId,
          hp: 100,
          status: "active"
        }
      });
      return;
    }

    if (lobster.status === "sleeping") {
      await tx.lobsterStatus.update({
        where: { lobsterId: lobster.lobsterId },
        data: { status: "active" }
      });
    }
  }

  async approveResource(resourceId: bigint, reviewEngine?: string | null) {
    const resource = await this.prisma.resource.findUnique({
      where: { resourceId }
    });

    if (!resource) {
      throw new BadRequestException("资源不存在");
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.resource.update({
        where: { resourceId },
        data: {
          status: ResourceStatus.ACTIVE,
          verifiedAt: new Date(),
          lastUpdate: new Date(),
          reviewReason: null,
          reviewEngine: this.normalizeReviewEngine(reviewEngine) ?? "manual"
        }
      });

      const activeCount = await tx.resource.count({
        where: { userId: resource.userId, status: ResourceStatus.ACTIVE }
      });

      if (activeCount === 3) {
        await this.doppelgangerService.activateWithBonus(resource.userId, 100);
      }

      return updated;
    });
  }

  async rejectResource(resourceId: bigint, reviewReason: string, reviewEngine?: string | null) {
    const resource = await this.prisma.resource.findUnique({
      where: { resourceId }
    });

    if (!resource) {
      throw new BadRequestException("资源不存在");
    }

    const normalizedReason = reviewReason.trim().slice(0, 255) || "资源未通过审核";
    return this.prisma.resource.update({
      where: { resourceId },
      data: {
        status: ResourceStatus.REJECTED,
        verifiedAt: new Date(),
        lastUpdate: new Date(),
        reviewReason: normalizedReason,
        reviewEngine: this.normalizeReviewEngine(reviewEngine) ?? "manual"
      }
    });
  }

  async upload(userId: bigint, payload: UploadResourceDto) {
    const normalizedResourceTypes = this.normalizeResourceTypes(payload.resourceType);
    const activationTexts = this.collectActivationTexts(payload.activationDetails);
    const moderationTexts = [...payload.tags, ...activationTexts];

    await this.compliance.enforceWritePolicy({
      userId,
      scene: "resource_upload",
      texts: moderationTexts
    });

    await this.compliance.checkTags(moderationTexts);

    const normalizedActivationDetails = this.normalizeActivationDetails(payload.activationDetails);

    return this.prisma.$transaction(async (tx) => {
      const resource = await tx.resource.create({
        data: {
          userId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          resourceType: normalizedResourceTypes[0] as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          resourceTypes: normalizedResourceTypes as any,
          tags: payload.tags,
          areaCode: payload.areaCode,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          priceRange: payload.priceRange as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          activationDetails: normalizedActivationDetails as any,
          status: ResourceStatus.PENDING,
          lastUpdate: new Date(),
          reviewReason: null,
          reviewEngine: null
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any
      });

      await this.activateLobsterWhenSleeping(tx, userId);

      return resource;
    });
  }

  async list(userId: bigint) {
    const resources = await this.prisma.resource.findMany({
      where: {
        OR: [{ status: ResourceStatus.ACTIVE }, { userId }]
      },
      include: {
        user: {
          select: {
            userId: true,
            nickname: true,
            maskedPhone: true
          }
        }
      },
      orderBy: { lastUpdate: "desc" }
    });

    return resources.map((resource) => this.toResourceResponse(resource));
  }

  async listMine(userId: bigint) {
    const resources = await this.prisma.resource.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            userId: true,
            nickname: true,
            maskedPhone: true
          }
        }
      },
      orderBy: { lastUpdate: "desc" }
    });

    return resources.map((resource) => this.toResourceResponse(resource));
  }

  async update(id: number, userId: bigint, payload: UpdateResourceDto) {
    await this.compliance.enforceWritePolicy({
      userId,
      scene: "resource_update",
      texts: payload.tags ?? []
    });

    const resource = await this.prisma.resource.findUnique({
      where: { resourceId: BigInt(id) }
    });

    if (!resource || resource.userId !== userId) {
      throw new BadRequestException("资源不存在或无权操作");
    }

    if (payload.tags) {
      await this.compliance.checkTags(payload.tags);
    }

    return this.prisma.resource.update({
      where: { resourceId: BigInt(id) },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tags: payload.tags !== undefined ? payload.tags : (resource.tags as any),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: (payload.status as any) || resource.status,
        areaCode: payload.areaCode !== undefined ? payload.areaCode : resource.areaCode,
        priceRange:
          payload.priceRange !== undefined
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (payload.priceRange as any)
            : resource.priceRange,
        lastUpdate: new Date()
      }
    });
  }

  async remove(id: number, userId: bigint) {
    const resource = await this.prisma.resource.findUnique({
      where: { resourceId: BigInt(id) }
    });

    if (!resource || resource.userId !== userId) {
      throw new BadRequestException("资源不存在或无权操作");
    }

    return this.prisma.resource.delete({
      where: { resourceId: BigInt(id) }
    });
  }

  async tags() {
    return {
      skill: ["短视频", "直播", "线下探店", "图文直推", "账号代运营商"],
      location: ["上海", "北京", "广州", "深圳", "杭州"],
      time: ["长期", "短期", "周末"],
      scale: ["个人", "工作室", "MCN机构"]
    };
  }

  private normalizeResourceTypes(resourceType: UploadResourceDto["resourceType"]): ResourceType[] {
    const rawList = Array.isArray(resourceType) ? resourceType : [resourceType];
    const normalized = Array.from(new Set(rawList));

    if (normalized.length === 0) {
      throw new BadRequestException("resourceType 不能为空");
    }

    const invalidTypes = normalized.filter(
      (item) => !ResourceService.RESOURCE_TYPE_VALUES.includes(item as ResourceType)
    );
    if (invalidTypes.length > 0) {
      throw new BadRequestException(`resourceType 非法: ${invalidTypes.join(",")}`);
    }

    return normalized;
  }

  private hydrateResourceTypes(persisted: unknown, fallbackType: string): string[] {
    if (Array.isArray(persisted)) {
      const filtered = persisted.filter(
        (item): item is string =>
          typeof item === "string" &&
          ResourceService.RESOURCE_TYPE_VALUES.includes(item as ResourceType)
      );

      const unique = Array.from(new Set(filtered));
      if (unique.length > 0) {
        return unique;
      }
    }

    return [fallbackType];
  }

  private toResourceResponse(
    resource: Prisma.ResourceGetPayload<{
      include: {
        user: {
          select: {
            userId: true;
            nickname: true;
            maskedPhone: true;
          };
        };
      };
    }>
  ) {
    const { user, ...resourceData } = resource;
    return {
      ...resourceData,
      uploader: {
        userId: user.userId,
        nickname: user.nickname,
        maskedPhone: user.maskedPhone
      },
      resourceTypes: this.hydrateResourceTypes(
        (resourceData as { resourceTypes?: unknown }).resourceTypes,
        resourceData.resourceType
      )
    };
  }

  private collectActivationTexts(activationDetails?: ActivationDetailsDto): string[] {
    if (!activationDetails) {
      return [];
    }

    const texts: string[] = [activationDetails.flowTitle];
    const stepDetails = activationDetails.stepDetails;

    [stepDetails.resource, stepDetails.skill, stepDetails.goal].forEach((items) => {
      items.forEach((item) => {
        texts.push(item.label);
        texts.push(item.intro);
        if (item.note) {
          texts.push(item.note);
        }
      });
    });

    activationDetails.customModules?.forEach((module) => {
      texts.push(module.moduleName);
      if (module.moduleContext) {
        texts.push(module.moduleContext);
      }
    });

    return texts.map((item) => item.trim()).filter((item) => item.length > 0);
  }

  private normalizeActivationDetails(
    activationDetails?: ActivationDetailsDto
  ): Prisma.InputJsonValue | undefined {
    if (!activationDetails) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(activationDetails)) as Prisma.InputJsonValue;
  }
}
