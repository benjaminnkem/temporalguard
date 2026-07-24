import { PartialType } from '@nestjs/swagger';
import { CreateBusinessEventDto } from './create-business-event.dto';

export class UpdateBusinessEventDto extends PartialType(
  CreateBusinessEventDto,
) {}
