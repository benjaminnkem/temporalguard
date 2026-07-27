import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { ProcessingPersistenceService } from '../processing/services/processing-persistence.service';
import type { User } from '../users/entities';
import { UpsertSigNozConnectionDto } from './dto/upsert-signoz-connection.dto';
import { SigNozQueryClient } from './signoz-query-client.service';

@ApiTags('observability')
@Controller('observability/connection')
@UseGuards(AccessTokenGuard)
export class SigNozController {
  constructor(
    private readonly persistence: ProcessingPersistenceService,
    private readonly client: SigNozQueryClient,
  ) {}

  @Put()
  @ApiOperation({ summary: 'Create or update the workspace SigNoz connection' })
  async upsert(
    @CurrentUser() user: User,
    @Body() input: UpsertSigNozConnectionDto,
  ) {
    const connection = await this.persistence.upsertConnection({
      businessId: user.businessId,
      createdBy: user.id,
      ...input,
      ingestionEndpoint: input.ingestionEndpoint ?? null,
    });
    return {
      id: connection.id,
      name: connection.name,
      mode: connection.mode,
      apiUrl: connection.apiUrl,
      uiUrl: connection.uiUrl,
      ingestionEndpoint: connection.ingestionEndpoint,
      status: connection.status,
      keyConfigured: true,
      updatedAt: connection.updatedAt,
    };
  }

  @Post('validate')
  @ApiOperation({
    summary: 'Validate SigNoz authentication and signal queries',
  })
  validate(@CurrentUser() user: User) {
    return this.client.validateConnection(user.businessId);
  }

  @Get('health')
  @ApiOperation({ summary: 'Read current SigNoz connection health' })
  health(@CurrentUser() user: User) {
    return this.client.validateConnection(user.businessId);
  }
}
