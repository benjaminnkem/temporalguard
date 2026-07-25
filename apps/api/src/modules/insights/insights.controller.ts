import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { User } from '../users/entities';
import { CreateComparisonDto } from './dto/create-comparison.dto';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import { InsightsService } from './insights.service';

@Controller()
@UseGuards(AccessTokenGuard)
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get('comparisons')
  comparisons(@CurrentUser() user: User) {
    return this.insights.listComparisons(user.businessId);
  }

  @Post('comparisons')
  createComparison(
    @CurrentUser() user: User,
    @Body() input: CreateComparisonDto,
  ) {
    return this.insights.createComparison(user.businessId, user.id, input);
  }

  @Get('comparisons/:id')
  comparison(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.insights.getComparison(user.businessId, id);
  }

  @Get('simulations')
  simulations(@CurrentUser() user: User) {
    return this.insights.listSimulations(user.businessId);
  }

  @Post('simulations')
  createSimulation(
    @CurrentUser() user: User,
    @Body() input: CreateSimulationDto,
  ) {
    return this.insights.createSimulation(user.businessId, user.id, input);
  }

  @Get('deployments')
  deployments(@CurrentUser() user: User) {
    return this.insights.listDeployments(user.businessId);
  }

  @Get('telemetry-quality')
  quality(@CurrentUser() user: User) {
    return this.insights.listQuality(user.businessId);
  }

  @Get('platform-health')
  health(@CurrentUser() user: User) {
    return this.insights.platformHealth(user.businessId);
  }

  @Get('observability/assets')
  assets() {
    return this.insights.assets();
  }
}
