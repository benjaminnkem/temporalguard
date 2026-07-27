import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { SigNozMode } from '../../processing/entities';

export class UpsertSigNozConnectionDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsEnum(SigNozMode)
  mode: SigNozMode;

  @IsUrl({ require_tld: false })
  apiUrl: string;

  @IsUrl({ require_tld: false })
  uiUrl: string;

  @IsString()
  @MaxLength(4096)
  apiKey: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  ingestionEndpoint?: string;
}
