import { IsEnum, IsIn, IsString, MaxLength, MinLength } from "class-validator";

export enum ContentType {
  CARD = "card",
  POST = "post",
  VIDEO_SCRIPT = "video_script",
  POSTER = "poster"
}

export class CreateContentDto {
  @IsEnum(ContentType)
  contentType!: ContentType;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  targetPlatform!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  prompt!: string;
}

export class TrackContentStatsDto {
  @IsIn(["view", "like", "inquiry"])
  event!: "view" | "like" | "inquiry";
}
