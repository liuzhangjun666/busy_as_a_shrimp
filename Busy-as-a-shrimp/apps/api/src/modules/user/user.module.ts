import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { PrismaService } from "../../common/prisma.service";
import { JwtStrategy } from "./jwt.strategy";
import { IdentityVerificationService } from "./identity-verification.service";
import { SmsVerificationService } from "./sms-verification.service";

import { DoppelgangerModule } from "../doppelganger/doppelganger.module";
import { ComplianceModule } from "../compliance/compliance.module";
import { CaptainModule } from "../captain/captain.module";

@Module({
  imports: [
    DoppelgangerModule,
    ComplianceModule,
    CaptainModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get("JWT_SECRET"),
        signOptions: { expiresIn: config.get("JWT_EXPIRES_IN") || "7d" }
      })
    })
  ],
  controllers: [UserController],
  providers: [
    UserService,
    IdentityVerificationService,
    SmsVerificationService,
    PrismaService,
    JwtStrategy
  ],
  exports: [UserService, JwtModule]
})
export class UserModule {}
