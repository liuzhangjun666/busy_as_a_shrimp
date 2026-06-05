import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import * as path from "path";
import { HealthModule } from "./health/health.module";
import { UserModule } from "./modules/user/user.module";
import { ResourceModule } from "./modules/resource/resource.module";
import { MatchModule } from "./modules/match/match.module";
import { ContentModule } from "./modules/content/content.module";
import { CaptainModule } from "./modules/captain/captain.module";
import { MembershipModule } from "./modules/membership/membership.module";
import { AdminModule } from "./modules/admin/admin.module";
import { ComplianceModule } from "./modules/compliance/compliance.module";

import { ActivityModule } from "./modules/activity/activity.module";
import { DoppelgangerModule } from "./modules/doppelganger/doppelganger.module";
import { TaskModule } from "./modules/task/task.module";
import { SignInModule } from "./modules/signin/signin.module";
import { PublicModule } from "./modules/public/public.module";
import { LobsterModule } from "./modules/lobster/lobster.module";
import { ScheduleModule } from "@nestjs/schedule";
import { MessageModule } from "./modules/message/message.module";
import { CampusUnlockModule } from "./modules/campus-unlock/campus-unlock.module";
import { StartupPostModule } from "./modules/startup-post/startup-post.module";
import { AutoReviewModule } from "./modules/compliance/auto-review.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.join(process.cwd(), ".env"),
        path.join(process.cwd(), "../../.env"),
        ".env"
      ]
    }),
    HealthModule,
    UserModule,
    ResourceModule,
    MatchModule,
    ContentModule,
    CaptainModule,
    MembershipModule,
    AdminModule,
    ComplianceModule,
    ActivityModule,
    DoppelgangerModule,
    TaskModule,
    SignInModule,
    PublicModule,
    LobsterModule,
    ScheduleModule.forRoot(),
    MessageModule,
    CampusUnlockModule,
    StartupPostModule,
    AutoReviewModule
  ]
})
export class AppModule {
  constructor(private configService: ConfigService) {
    const deerflowUrl = this.configService.get("DEERFLOW_BASE_URL");
    console.log("==========================================");
    console.log(`[AppModule] Config Initialized`);
    console.log(`[AppModule] DEERFLOW_BASE_URL: ${deerflowUrl}`);
    console.log(
      `[AppModule] JWT_SECRET: ${this.configService.get("JWT_SECRET") ? "LOADED" : "MISSING"}`
    );
    console.log("==========================================");
  }
}
