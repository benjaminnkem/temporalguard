import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateEventLogDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  businessId: string;

  @ApiProperty({ example: 'payment.authorized' })
  @IsString()
  @IsNotEmpty()
  eventName: string;

  @ApiPropertyOptional({ example: 'payment_123' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  externalWorkflowId?: string;

  @ApiProperty({ example: new Date().toISOString() })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { amount: 1000, currency: 'USD' },
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
