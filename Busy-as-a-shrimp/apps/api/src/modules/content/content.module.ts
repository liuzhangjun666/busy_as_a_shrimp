import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { ContentController } from "./content.controller";
import { ContentService } from "./content.service";
import { DoppelgangerModule } from "../doppelganger/doppelganger.module";

@Module({
  imports: [DoppelgangerModule],
  controllers: [ContentController],
  providers: [ContentService, PrismaService]
})
export class ContentModule {}
