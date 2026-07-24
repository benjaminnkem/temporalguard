import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth';
import { EventLog } from '../events/entities';
import { Rule } from '../rules/entities';
import { Violation } from '../violations/entities';
import { Workflow } from '../workflows/entities';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Workflow, Violation, Rule, EventLog]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
