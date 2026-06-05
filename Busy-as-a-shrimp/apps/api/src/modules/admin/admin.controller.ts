import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { ok } from "../../common/api-response";
import { AdminAuthGuard } from "./auth/admin-auth.guard";
import { AdminAuthService } from "./auth/admin-auth.service";
import { Public } from "./auth/public.decorator";
import { AdminService } from "./admin.service";
import { DeerFlowGatewayService } from "../lobster/deerflow-gateway.service";
import {
  AdminAuthProfile,
  AdminLoginDto,
  QueryBrushOrderPenaltiesDto,
  CreateDictTypeDto,
  CreateDictDataDto,
  PublishAnnouncementDto,
  QueryAiBriefsDto,
  CreateAiBriefDto,
  QuerySoloSignalsDto,
  CreateSoloSignalDto,
  GrantCampusUnlockDto,
  QueryResourcesDto,
  QueryDictDataDto,
  QueryUsersDto,
  ReviewResourceDto,
  ReviewBrushOrderPenaltyDto,
  UpdateCaptainLevelDto,
  UpdateDictTypeDto,
  UpdateDictDataDto,
  UpdateUserStatusDto,
  CaptainLevel,
  CreateBountyTaskDto
} from "./dto/admin.dto";

@UseGuards(AdminAuthGuard)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminAuthService: AdminAuthService,
    private readonly deerFlowGatewayService: DeerFlowGatewayService
  ) {}

  @Public()
  @Post("login")
  login(@Body() payload: AdminLoginDto) {
    return ok(this.adminAuthService.login(payload), "Admin login success");
  }

  @Get("me")
  me(@Req() request: { admin?: unknown }) {
    return ok(request.admin ?? null);
  }

  @Get("users")
  async users(@Query() query: QueryUsersDto) {
    return ok(await this.adminService.users(query));
  }

  @Get("risk/brush-order-penalties")
  async brushOrderPenalties(@Query() query: QueryBrushOrderPenaltiesDto) {
    return ok(await this.adminService.brushOrderPenalties(query));
  }

  @Put("risk/brush-order-penalties/:id/review")
  async reviewBrushOrderPenalty(
    @Param("id") id: string,
    @Body() payload: ReviewBrushOrderPenaltyDto,
    @Req() request: { admin?: AdminAuthProfile }
  ) {
    return ok(
      await this.adminService.reviewBrushOrderPenalty(
        Number(id),
        payload,
        Number(request.admin?.adminId ?? 0)
      ),
      "Brush-order penalty reviewed"
    );
  }

  @Put("users/:id/status")
  async updateUserStatus(@Param("id") id: string, @Body() payload: UpdateUserStatusDto) {
    return ok(
      await this.adminService.updateUserStatus(Number(id), payload.status),
      "User status updated"
    );
  }

  @Get("resources")
  async resources(@Query() query: QueryResourcesDto) {
    return ok(await this.adminService.resources(query));
  }

  @Get("dict/types")
  async dictTypes() {
    return ok(await this.adminService.dictTypes());
  }

  @Post("dict/types")
  async createDictType(@Body() payload: CreateDictTypeDto) {
    return ok(await this.adminService.createDictType(payload), "Dict type created");
  }

  @Put("dict/types/:id")
  async updateDictType(@Param("id") id: string, @Body() payload: UpdateDictTypeDto) {
    return ok(await this.adminService.updateDictType(Number(id), payload), "Dict type updated");
  }

  @Delete("dict/types/:id")
  async deleteDictType(@Param("id") id: string) {
    return ok(await this.adminService.deleteDictType(Number(id)), "Dict type deleted");
  }

  @Get("dict/data")
  async dictData(@Query() query: QueryDictDataDto) {
    return ok(await this.adminService.dictData(query.dictType));
  }

  @Post("dict/data")
  async createDictData(@Body() payload: CreateDictDataDto) {
    return ok(await this.adminService.createDictData(payload), "Dict data created");
  }

  @Put("dict/data/:id")
  async updateDictData(@Param("id") id: string, @Body() payload: UpdateDictDataDto) {
    return ok(await this.adminService.updateDictData(Number(id), payload), "Dict data updated");
  }

  @Delete("dict/data/:id")
  async deleteDictData(@Param("id") id: string) {
    return ok(await this.adminService.deleteDictData(Number(id)), "Dict data deleted");
  }

  @Put("resources/:id")
  async reviewResource(@Param("id") id: string, @Body() payload: ReviewResourceDto) {
    return ok(
      await this.adminService.reviewResource(Number(id), payload.decision, payload.reason),
      "Resource review completed"
    );
  }

  @Get("stats")
  async stats() {
    return ok(await this.adminService.stats());
  }

  @Post("announce")
  async announce(@Body() payload: PublishAnnouncementDto) {
    return ok(
      await this.adminService.announce(
        payload.title,
        payload.type,
        payload.content,
        payload.publisher || "admin"
      ),
      "Announcement published"
    );
  }

  @Get("announcements")
  async announcements() {
    return ok(await this.adminService.announcements());
  }

  @Get("ai-briefs")
  async aiBriefs(@Query() query: QueryAiBriefsDto) {
    return ok(await this.adminService.aiBriefs(query));
  }

  @Post("ai-briefs")
  async createAiBrief(@Body() payload: CreateAiBriefDto) {
    return ok(await this.adminService.createAiBrief(payload), "AI brief created");
  }

  @Get("solo-signals")
  async soloSignals(@Query() query: QuerySoloSignalsDto) {
    return ok(await this.adminService.soloSignals(query));
  }

  @Post("solo-signals")
  async createSoloSignal(@Body() payload: CreateSoloSignalDto) {
    return ok(await this.adminService.createSoloSignal(payload), "Solo signal created");
  }

  @Post("campus-unlocks/grant")
  async grantCampusUnlock(@Body() payload: GrantCampusUnlockDto) {
    return ok(await this.adminService.grantCampusUnlock(payload), "Campus unlock granted");
  }

  @Get("matches")
  async matches() {
    return ok(await this.adminService.matches());
  }

  @Delete("announcements/:id")
  async deleteAnnouncement(@Param("id") id: string) {
    return ok(await this.adminService.deleteAnnouncement(id), "Announcement deleted");
  }

  @Get("captain/ranking")
  async captainRanking() {
    return ok(await this.adminService.captainRanking());
  }

  @Put("captain/:id/level")
  async updateCaptainLevel(@Param("id") id: string, @Body() payload: UpdateCaptainLevelDto) {
    return ok(
      await this.adminService.updateCaptainLevel(Number(id), payload.level as CaptainLevel),
      "Captain level updated"
    );
  }

  @Get("tasks")
  async tasks() {
    return ok(await this.adminService.tasks());
  }

  @Post("tasks")
  async createTask(@Body() payload: CreateBountyTaskDto) {
    return ok(await this.adminService.createTask(payload), "Task published");
  }

  @Get("submissions")
  async submissions() {
    return ok(await this.adminService.submissions());
  }

  @Put("submissions/:id/review")
  async reviewSubmission(
    @Param("id") id: string,
    @Body() payload: { decision: "approve" | "reject" }
  ) {
    return ok(
      await this.adminService.reviewSubmission(Number(id), payload.decision),
      "Submission reviewed"
    );
  }

  @Get("deerflow/models")
  async deerflowModels() {
    return ok(await this.deerFlowGatewayService.listModels());
  }

  @Get("deerflow/models/:modelName")
  async deerflowModel(@Param("modelName") modelName: string) {
    return ok(await this.deerFlowGatewayService.getModel(modelName));
  }

  @Get("deerflow/mcp/config")
  async deerflowMcpConfig() {
    return ok(await this.deerFlowGatewayService.getMcpConfig());
  }

  @Put("deerflow/mcp/config")
  async updateDeerflowMcpConfig(@Body() payload: Record<string, unknown>) {
    return ok(await this.deerFlowGatewayService.updateMcpConfig(payload), "MCP config updated");
  }

  @Get("deerflow/memory")
  async deerflowMemory() {
    return ok(await this.deerFlowGatewayService.getMemory());
  }

  @Delete("deerflow/memory")
  async clearDeerflowMemory() {
    return ok(await this.deerFlowGatewayService.clearMemory(), "Memory cleared");
  }

  @Post("deerflow/memory/reload")
  async reloadDeerflowMemory(@Body() payload?: Record<string, unknown>) {
    return ok(await this.deerFlowGatewayService.reloadMemory(payload ?? {}), "Memory reloaded");
  }

  @Post("deerflow/memory/facts")
  async createDeerflowMemoryFact(@Body() payload: Record<string, unknown>) {
    return ok(await this.deerFlowGatewayService.createMemoryFact(payload), "Memory fact created");
  }
}
