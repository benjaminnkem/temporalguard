import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class EventCorrelationDto {
  @ApiProperty({ example: 'document.id' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  key: string;

  @ApiProperty({ example: 'doc_123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  value: string;
}

export class EventContextDto {
  @ApiPropertyOptional({ example: 'documents-api' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  service?: string;

  @ApiPropertyOptional({ example: 'documents-api@2.8.1' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  deployment?: string;

  @ApiPropertyOptional({ example: 'f65e9d0a41b94734b9fd93ce0b132b44' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  traceId?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4e5f60718' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  spanId?: string;
}

export class TrackEventDto {
  @ApiProperty({ example: 'document.uploaded' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  event: string;

  @ApiProperty({ example: new Date().toISOString() })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ type: EventCorrelationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EventCorrelationDto)
  correlation?: EventCorrelationDto;

  @ApiPropertyOptional({ example: 'wf_doc_123' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  externalId?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { region: 'eu-west-1' },
  })
  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @ApiPropertyOptional({ type: EventContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EventContextDto)
  context?: EventContextDto;

  @ApiPropertyOptional({
    example: 'doc_123:document.uploaded:2026-07-25T12:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey?: string;
}

export class TrackEventsBatchDto {
  @ApiProperty({ type: [TrackEventDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TrackEventDto)
  events: TrackEventDto[];
}
