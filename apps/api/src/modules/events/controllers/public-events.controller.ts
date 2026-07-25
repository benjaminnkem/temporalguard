import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiHeader,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentApiKeyEnvironment } from '../../businesses/decorators/current-api-key-environment.decorator';
import { CurrentBusinessId } from '../../businesses/decorators/current-business-id.decorator';
import type { ApiKeyEnvironment } from '../../businesses/enums/api-key-environment.enum';
import { ApiKeyGuard } from '../../businesses/guards/api-key.guard';
import { TrackEventDto, TrackEventsBatchDto } from '../dto/track-event.dto';
import { PublicEventsService } from '../services/public-events.service';

@ApiTags('public-v1')
@ApiSecurity('api-key')
@ApiSecurity('api-key-bearer')
@ApiHeader({
  name: 'x-api-key',
  required: false,
  description:
    'Workspace API key (tg_live_… / tg_test_…). Prefer Authorization: Bearer with the same secret. Events inherit the key environment.',
})
@Controller('v1/events')
@UseGuards(ApiKeyGuard)
export class PublicEventsController {
  constructor(private readonly publicEventsService: PublicEventsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Track a single business event (public data plane)',
    description:
      'API-key only. Accepts Authorization: Bearer tg_… or X-API-Key. Events inherit live/test from the key. See docs/PUBLIC_API_AND_SDK.md.',
  })
  @ApiAcceptedResponse({ description: 'Event accepted for processing' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid API key' })
  track(
    @CurrentBusinessId() businessId: string,
    @CurrentApiKeyEnvironment() apiEnvironment: ApiKeyEnvironment,
    @Body() body: TrackEventDto,
  ) {
    return this.publicEventsService.track(businessId, body, apiEnvironment);
  }

  @Post('batch')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Track a batch of business events (public data plane)',
    description:
      'Up to 100 events. Whole batch is rejected if any item is invalid.',
  })
  @ApiAcceptedResponse({ description: 'Batch accepted for processing' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid API key' })
  trackBatch(
    @CurrentBusinessId() businessId: string,
    @CurrentApiKeyEnvironment() apiEnvironment: ApiKeyEnvironment,
    @Body() body: TrackEventsBatchDto,
  ) {
    return this.publicEventsService.trackBatch(
      businessId,
      body,
      apiEnvironment,
    );
  }
}
