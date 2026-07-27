import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import type { User } from '../../users/entities';
import { CreateApiKeyDto, UpdateBusinessDto } from '../dto';
import { BusinessesService } from '../services/businesses.service';

@ApiTags('business')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('business')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get()
  @ApiOperation({ summary: 'Get the authenticated workspace business profile' })
  @ApiOkResponse({ description: 'Business profile' })
  getBusiness(@CurrentUser() user: User) {
    return this.businessesService.getBusiness(user.businessId);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update the authenticated workspace business profile',
  })
  updateBusiness(@CurrentUser() user: User, @Body() input: UpdateBusinessDto) {
    return this.businessesService.updateBusiness(user.businessId, input);
  }

  @Get('api-keys')
  @ApiOperation({ summary: 'List API keys for the workspace' })
  listApiKeys(@CurrentUser() user: User) {
    return this.businessesService.listApiKeys(user.businessId);
  }

  @Post('api-keys')
  @ApiOperation({
    summary: 'Create an API key for event ingestion',
  })
  @ApiCreatedResponse({
    description: 'API key created. Secret is only returned once.',
  })
  createApiKey(@CurrentUser() user: User, @Body() input: CreateApiKeyDto) {
    return this.businessesService.createApiKey(user.businessId, user.id, input);
  }

  @Post('api-keys/:id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an API key' })
  revokeApiKey(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.businessesService.revokeApiKey(user.businessId, id);
  }
}
