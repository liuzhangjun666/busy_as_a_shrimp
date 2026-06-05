import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../user/guards/jwt-auth.guard";
import { TaskService } from "./task.service";

type AuthenticatedRequest = {
  user: {
    userId: string;
  };
};

@Controller("bounty-hall")
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get("tasks")
  async listOpen(@Req() req: AuthenticatedRequest) {
    return this.taskService.listOpenTasks(BigInt(req.user.userId));
  }

  @Post("tasks")
  async publish(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      title: string;
      content: string;
      points: number;
      difficulty?: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
    }
  ) {
    return this.taskService.publishTask(BigInt(req.user.userId), body);
  }

  @Get("tasks/:id")
  async get(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.taskService.getTask(BigInt(req.user.userId), BigInt(id));
  }

  @Post("tasks/:id/claim")
  async claim(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.taskService.claimTask(BigInt(req.user.userId), BigInt(id));
  }

  @Get("my/published")
  async myPublished(@Req() req: AuthenticatedRequest) {
    return this.taskService.listMyPublishedTasks(BigInt(req.user.userId));
  }

  @Get("my/claimed")
  async myClaimed(@Req() req: AuthenticatedRequest) {
    return this.taskService.listMyClaimedTasks(BigInt(req.user.userId));
  }

  @Post("submissions/:id/publisher-agree")
  async publisherAgree(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.taskService.publisherAgreeSubmission(BigInt(req.user.userId), BigInt(id));
  }

  @Post("submissions/:id/claimer-agree")
  async claimerAgree(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.taskService.claimerAgreeSubmission(BigInt(req.user.userId), BigInt(id));
  }

  @Post("submissions/:id/reject")
  async reject(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.taskService.rejectSubmission(BigInt(req.user.userId), BigInt(id));
  }

  @Post("submissions/:id/proof")
  async submitProof(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { proof: string }
  ) {
    return this.taskService.submitProof(BigInt(req.user.userId), BigInt(id), body.proof);
  }

  @Post("submissions/:id/complete")
  async complete(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.taskService.completeSubmissionByPublisher(BigInt(req.user.userId), BigInt(id));
  }
}
