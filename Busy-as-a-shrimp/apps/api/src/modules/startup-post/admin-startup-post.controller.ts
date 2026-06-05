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
import { AdminAuthGuard } from "../admin/auth/admin-auth.guard";
import { AdminAuthProfile } from "../admin/dto/admin.dto";
import {
  CreateStartupPostDto,
  QueryAdminStartupPostsDto,
  UpdateStartupPostDto,
  UpdateStartupPostStatusDto
} from "./dto/startup-post.dto";
import { StartupPostService } from "./startup-post.service";

interface AdminRequest {
  admin?: AdminAuthProfile;
}

@UseGuards(AdminAuthGuard)
@Controller("admin/startup-posts")
export class AdminStartupPostController {
  constructor(private readonly startupPostService: StartupPostService) {}

  @Get()
  async list(@Query() query: QueryAdminStartupPostsDto) {
    return ok(await this.startupPostService.queryAdminPosts(query));
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return ok(await this.startupPostService.getAdminPost(id));
  }

  @Post()
  async create(@Body() payload: CreateStartupPostDto, @Req() request: AdminRequest) {
    const operator = request.admin?.username ?? "admin";
    return ok(await this.startupPostService.createAdminPost(payload, operator), "创业信息已创建");
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() payload: UpdateStartupPostDto,
    @Req() request: AdminRequest
  ) {
    const operator = request.admin?.username ?? "admin";
    return ok(
      await this.startupPostService.updateAdminPost(id, payload, operator),
      "创业信息已更新"
    );
  }

  @Put(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body() payload: UpdateStartupPostStatusDto,
    @Req() request: AdminRequest
  ) {
    const operator = request.admin?.username ?? "admin";
    return ok(
      await this.startupPostService.updateAdminPostStatus(id, payload, operator),
      "创业信息状态已更新"
    );
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return ok(await this.startupPostService.deleteAdminPost(id), "创业信息已删除");
  }
}
