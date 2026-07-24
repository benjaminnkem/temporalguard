import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { RuleOperator } from '../enums';

class EventReferenceDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  canonicalName: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;
}

export class TestRuleDto {
  @IsObject()
  @ValidateNested()
  @Type(() => EventReferenceDto)
  trigger: EventReferenceDto;

  @IsEnum(RuleOperator)
  operator: RuleOperator;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EventReferenceDto)
  outcomes: EventReferenceDto[];
}
