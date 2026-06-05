import { Type } from "class-transformer";
import { IsIn, IsNumber, IsOptional, Min } from "class-validator";

export type WithdrawChannel = "wechat" | "bank";

export class WithdrawDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(100)
  amount!: number;

  @IsOptional()
  @IsIn(["wechat", "bank"])
  channel?: WithdrawChannel;
}
