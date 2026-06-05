import { Controller, Get, Param, Query } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { QueryPublicStartupPostsDto } from "./dto/startup-post.dto";
import { StartupPostService } from "./startup-post.service";

@Controller("public/startup-posts")
export class PublicStartupPostController {
  constructor(private readonly startupPostService: StartupPostService) {}

  @Get()
  async list(@Query() query: QueryPublicStartupPostsDto) {
    return ok(await this.startupPostService.queryPublicPosts(query));
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return ok(await this.startupPostService.getPublicPost(id));
  }
}
