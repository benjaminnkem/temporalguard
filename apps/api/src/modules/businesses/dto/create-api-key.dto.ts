import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiKeyEnvironment } from '../enums/api-key-environment.enum';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Production ingestion' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiProperty({
    enum: ApiKeyEnvironment,
    example: ApiKeyEnvironment.LIVE,
    description:
      'Key environment. live keys mint as tg_live_…; test keys mint as tg_test_…. Events inherit this environment.',
  })
  @IsEnum(ApiKeyEnvironment)
  environment: ApiKeyEnvironment;

  @ApiPropertyOptional({
    example: 'Used by the documents-api worker to send events.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
