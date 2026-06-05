import { IsIn, IsOptional, IsUrl } from "class-validator";

export class ImageCheckDto {
  @IsUrl(
    {
      require_protocol: true
    },
    { message: "imageUrl 必须为 http/https 图片地址" }
  )
  imageUrl!: string;

  @IsOptional()
  @IsIn(["avatar", "generic"])
  scene?: "avatar" | "generic";
}
