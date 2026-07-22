import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard overview metrics' })
  @ApiOkResponse({ description: 'Mocked dashboard overview' })
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('workflows')
  @ApiOperation({ summary: 'Dashboard workflows list' })
  @ApiOkResponse({ description: 'Mocked workflows list' })
  getWorkflows() {
    return this.dashboardService.getWorkflows();
  }

  @Get('violations')
  @ApiOperation({ summary: 'Dashboard violations list' })
  @ApiOkResponse({ description: 'Mocked violations list' })
  getViolations() {
    return this.dashboardService.getViolations();
  }
}
