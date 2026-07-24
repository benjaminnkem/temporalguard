import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import type { User } from '../../users/entities';
import { DashboardService } from '../services/dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(AccessTokenGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard overview metrics' })
  @ApiOkResponse({ description: 'Workspace-scoped dashboard overview' })
  getOverview(@CurrentUser() user: User) {
    return this.dashboardService.getOverview(user.businessId);
  }

  @Get('workflows')
  @ApiOperation({ summary: 'Dashboard workflows list' })
  @ApiOkResponse({ description: 'Workspace-scoped workflows list' })
  getWorkflows(@CurrentUser() user: User) {
    return this.dashboardService.getWorkflows(user.businessId);
  }

  @Get('violations')
  @ApiOperation({ summary: 'Dashboard violations list' })
  @ApiOkResponse({ description: 'Workspace-scoped violations list' })
  getViolations(@CurrentUser() user: User) {
    return this.dashboardService.getViolations(user.businessId);
  }
}
