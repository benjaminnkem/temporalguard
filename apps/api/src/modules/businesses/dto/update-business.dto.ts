import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateBusinessDto {
  @ApiProperty({ example: 'Northstar Labs' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'https://northstar.example' })
  @ValidateIf(
    (_, value) => value !== null && value !== undefined && value !== '',
  )
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  website?: string | null;

  @ApiPropertyOptional({
    example: 'Workflow reliability for document verification teams.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
