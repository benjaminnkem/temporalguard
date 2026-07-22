import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { RuleOperator } from '../enums/rule-operator.enum';
import { RuleSeverity } from '../enums/rule-severity.enum';
import { TimeoutUnit } from '../enums/timeout-unit.enum';

export class CreateRuleDto {
  @ApiProperty({ example: 'payment-must-resolve-within-15m' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Payment must be captured or reversed within 15 minutes',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'payment.authorized' })
  @IsString()
  @IsNotEmpty()
  triggerEvent: string;

  @ApiProperty({
    example: ['payment.captured', 'payment.reversed'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  expectedEvents: string[];

  @ApiPropertyOptional({ enum: RuleOperator, example: RuleOperator.ANY })
  @IsOptional()
  @IsEnum(RuleOperator)
  operator?: RuleOperator;

  @ApiProperty({ example: 15 })
  @IsInt()
  @IsPositive()
  timeoutValue: number;

  @ApiPropertyOptional({ enum: TimeoutUnit, example: TimeoutUnit.MINUTES })
  @IsOptional()
  @IsEnum(TimeoutUnit)
  timeoutUnit?: TimeoutUnit;

  @ApiPropertyOptional({ enum: RuleSeverity, example: RuleSeverity.HIGH })
  @IsOptional()
  @IsEnum(RuleSeverity)
  severity?: RuleSeverity;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
