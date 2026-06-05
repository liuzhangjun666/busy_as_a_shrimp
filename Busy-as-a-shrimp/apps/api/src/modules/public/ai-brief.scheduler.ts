import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { AiBriefIngestService } from "./ai-brief-ingest.service";

@Injectable()
export class AiBriefScheduler {
  private readonly logger = new Logger(AiBriefScheduler.name);

  constructor(private readonly aiBriefIngestService: AiBriefIngestService) {}

  @Cron("0 0 20 * * *")
  async ingestAiBriefs() {
    const result = await this.aiBriefIngestService.ingestFromFeeds();
    this.logger.log(
      `[AiBrief] done: inserted=${result.inserted}, fetched=${result.fetched}, sources=${result.sources}, errors=${result.errors}`
    );
  }
}
