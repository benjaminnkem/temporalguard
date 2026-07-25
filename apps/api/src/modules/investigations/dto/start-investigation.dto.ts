import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class StartInvestigationDto {
  @IsUUID()
  violationId: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  idempotencyKey?: string;
}
