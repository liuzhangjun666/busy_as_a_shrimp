import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SoloSignalIngestService } from "./solo-signal-ingest.service";

@Injectable()
export class SoloSignalScheduler {
  private readonly logger = new Logger(SoloSignalScheduler.name);

  constructor(private readonly soloSignalIngestService: SoloSignalIngestService) {}

  @Cron("0 0 20 * * *")
  async ingestSoloSignals() {
    const result = await this.soloSignalIngestService.ingestFromSources();
    this.logger.log(
      `[SoloSignal] done: inserted=${result.inserted}, fetched=${result.fetched}, sources=${result.sources}, errors=${result.errors}`
    );
  }
}
