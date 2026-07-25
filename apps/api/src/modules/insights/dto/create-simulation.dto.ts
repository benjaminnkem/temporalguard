import { IsDateString, IsObject, IsOptional, IsUUID } from 'class-validator';

export class CreateSimulationDto {
  @IsOptional()
  @IsUUID()
  ruleId?: string;

  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsObject()
  draft: Record<string, unknown>;
}
