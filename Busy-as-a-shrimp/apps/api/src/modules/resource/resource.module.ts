import { Module } from "@nestjs/common";
import { ResourceController } from "./resource.controller";
import { ResourceService } from "./resource.service";
import { PrismaService } from "../../common/prisma.service";

import { DoppelgangerModule } from "../doppelganger/doppelganger.module";

@Module({
  imports: [DoppelgangerModule],
  controllers: [ResourceController],
  providers: [ResourceService, PrismaService],
  exports: [ResourceService]
})
export class ResourceModule {}
