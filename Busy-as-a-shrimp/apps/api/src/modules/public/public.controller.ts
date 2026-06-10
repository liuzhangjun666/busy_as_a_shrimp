import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { PublicService } from "./public.service";

@Controller("public")
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get("dict")
  async dict(@Query("type") type?: string, @Query("version") version = "v1") {
    return ok(await this.publicService.getDict(type, version));
  }

  @Get("announcements")
  async announcements() {
    return ok(await this.publicService.getAnnouncements());
  }

  @Get("ai-briefs")
  async aiBriefs(@Query("limit") limit?: string, @Query("cursor") cursor?: string) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return ok(await this.publicService.getAiBriefs(parsedLimit, cursor));
  }

  @Post("ai-briefs/refresh")
  async refreshAiBriefs() {
    return ok(await this.publicService.refreshAiBriefs(), "AI快报同步完成");
  }

  @Get("ai-briefs/refresh-status")
  async aiBriefRefreshStatus(@Query("jobId") jobId?: string) {
    return ok(await this.publicService.getAiBriefRefreshStatus(jobId ?? ""));
  }

  @Get("solo-signals")
  async soloSignals(@Query("limit") limit?: string, @Query("cursor") cursor?: string) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return ok(await this.publicService.getSoloSignals(parsedLimit, cursor));
  }

  @Post("solo-signals/refresh")
  async refreshSoloSignals() {
    return ok(await this.publicService.refreshSoloSignals(), "AI一人公司同步完成");
  }

  @Get("solo-signals/refresh-status")
  async soloSignalRefreshStatus(@Query("jobId") jobId?: string) {
    return ok(await this.publicService.getSoloSignalRefreshStatus(jobId ?? ""));
  }

  @Get("campus-opportunities")
  async campusOpportunities(@Query("limit") limit?: string) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return ok(await this.publicService.getCampusOpportunities(parsedLimit));
  }

  @Post("translate-insight")
  async translateInsight(
    @Body()
    payload: {
      title: string;
      summary?: string;
      incomeSnippet?: string;
      scene?: "ai_brief" | "solo_signal";
    }
  ) {
    return ok(await this.publicService.translateInsight(payload));
  }
}
