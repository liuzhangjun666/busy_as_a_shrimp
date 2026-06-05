import { Type } from "class-transformer";
import { IsISO8601, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Matches } from "class-validator";

export class ForwardedPaymentCallbackDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^MP[A-Z0-9]+$/i, {
    message: "order_no 必须为 MP 开头的订单号"
  })
  order_no!: string;

  @IsString()
  @IsIn(["success", "pending", "failed", "closed"])
  payStatus!: "success" | "pending" | "failed" | "closed";

  @IsString()
  @IsNotEmpty()
  payProvider!: string;

  @IsString()
  @IsNotEmpty()
  providerTradeNo!: string;

  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsISO8601()
  paidAt?: string;
}
