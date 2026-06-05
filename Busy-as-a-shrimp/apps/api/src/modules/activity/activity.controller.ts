import { Controller, Get } from "@nestjs/common";
import { ActivityService } from "./activity.service";

@Controller("activity")
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get("current")
  async getCurrent() {
    return this.activityService.getCurrentActivity();
  }

  @Get("ranking")
  async getRanking() {
    return this.activityService.getRanking();
  }
}
