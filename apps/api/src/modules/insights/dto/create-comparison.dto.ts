import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum ComparisonKind {
  SUCCESSFUL_VS_VIOLATED = 'successful_vs_violated',
  COMPLETED_VS_LATE = 'completed_vs_completed_late',
  BEFORE_VS_AFTER_DEPLOYMENT = 'before_vs_after_deployment',
}

export class CreateComparisonDto {
  @IsEnum(ComparisonKind)
  kind: ComparisonKind;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deploymentVersion?: string;
}
