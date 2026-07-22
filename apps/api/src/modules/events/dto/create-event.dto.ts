import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ example: 'payment.authorized' })
  @IsString()
  @IsNotEmpty()
  eventName: string;

  @ApiProperty({ example: 'payment_123' })
  @IsString()
  @IsNotEmpty()
  workflowId: string;

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
