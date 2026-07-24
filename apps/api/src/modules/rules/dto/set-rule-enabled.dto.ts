import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetRuleEnabledDto {
  @ApiProperty({
    description: 'Whether this rule should evaluate incoming events',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;
}
