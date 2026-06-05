import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { ok } from "../../common/api-response";
import { CurrentUser } from "../user/decorators/current-user.decorator";
import { JwtAuthGuard } from "../user/guards/jwt-auth.guard";
import { UpdateResourceDto, UploadResourceDto } from "./dto/resource.dto";
import { ResourceService } from "./resource.service";

@Controller("resource")
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @UseGuards(JwtAuthGuard)
  @Post("upload")
  async upload(@CurrentUser() user: User, @Body() payload: UploadResourceDto) {
    const resource = await this.resourceService.upload(user.userId, payload);
    return ok(
      {
        resourceId: Number(resource.resourceId),
        reviewStatus: resource.status
      },
      "resource uploaded and pending review"
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("list")
  async list(@CurrentUser() user: User) {
    const resources = await this.resourceService.list(user.userId);
    return ok(resources);
  }

  @UseGuards(JwtAuthGuard)
  @Get("mine")
  async listMine(@CurrentUser() user: User) {
    const resources = await this.resourceService.listMine(user.userId);
    return ok(resources);
  }

  @UseGuards(JwtAuthGuard)
  @Put(":id")
  async update(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Body() payload: UpdateResourceDto
  ) {
    const resource = await this.resourceService.update(Number(id), user.userId, payload);
    return ok(resource, "resource updated");
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() user: User) {
    await this.resourceService.remove(Number(id), user.userId);
    return ok(null, "resource deleted");
  }

  @Get("tags")
  async tags() {
    const tags = await this.resourceService.tags();
    return ok(tags);
  }
}
