import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  registerDecorator,
  type ValidationOptions
} from "class-validator";
import { Type } from "class-transformer";

export enum ResourceType {
  SKILL = "skill",
  LOCATION = "location",
  ACCOUNT = "account",
  TIME = "time"
}

export enum ResourceStatus {
  PENDING = "pending",
  ACTIVE = "active",
  INACTIVE = "inactive",
  REJECTED = "rejected"
}

export enum ActivationStepKey {
  RESOURCE = "resource",
  SKILL = "skill",
  GOAL = "goal"
}

export enum ActivationDetailsVersion {
  V1 = "v1"
}

const RESOURCE_TYPE_VALUES = Object.values(ResourceType);

function IsResourceTypeOrArray(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isResourceTypeOrArray",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value === "string") {
            return RESOURCE_TYPE_VALUES.includes(value as ResourceType);
          }

          if (Array.isArray(value)) {
            return (
              value.length > 0 &&
              value.every(
                (item) =>
                  typeof item === "string" && RESOURCE_TYPE_VALUES.includes(item as ResourceType)
              )
            );
          }

          return false;
        },
        defaultMessage() {
          return "resourceType must be ResourceType or non-empty ResourceType[]";
        }
      }
    });
  };
}

export class PriceRangeDto {
  @IsNumber()
  min!: number;

  @IsNumber()
  max!: number;
}

export class ActivationSelectionDetailDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsNotEmpty()
  intro!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  isCustom?: boolean;
}

export class ActivationStepDetailsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivationSelectionDetailDto)
  resource!: ActivationSelectionDetailDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivationSelectionDetailDto)
  skill!: ActivationSelectionDetailDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivationSelectionDetailDto)
  goal!: ActivationSelectionDetailDto[];
}

export class ActivationCustomModuleDto {
  @IsString()
  @IsNotEmpty()
  moduleName!: string;

  @IsOptional()
  @IsString()
  moduleContext?: string;

  @IsOptional()
  @IsEnum(ActivationStepKey)
  sourceStep?: ActivationStepKey;
}

export class ActivationDetailsDto {
  @IsEnum(ActivationDetailsVersion)
  version!: ActivationDetailsVersion;

  @IsString()
  @IsNotEmpty()
  flowTitle!: string;

  @ValidateNested()
  @Type(() => ActivationStepDetailsDto)
  stepDetails!: ActivationStepDetailsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivationCustomModuleDto)
  customModules?: ActivationCustomModuleDto[];
}

export class UploadResourceDto {
  @IsResourceTypeOrArray({
    message: "resourceType 参数非法，必须为资源类型或非空资源类型数组"
  })
  resourceType!: ResourceType | ResourceType[];

  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @IsString()
  @IsOptional()
  areaCode?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PriceRangeDto)
  priceRange?: PriceRangeDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ActivationDetailsDto)
  activationDetails?: ActivationDetailsDto;
}

export class UpdateResourceDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsEnum(ResourceStatus)
  @IsOptional()
  status?: ResourceStatus;

  @IsString()
  @IsOptional()
  areaCode?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PriceRangeDto)
  priceRange?: PriceRangeDto;
}
