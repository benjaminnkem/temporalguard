import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth';
import { RulesController } from './controllers/rules.controller';
import { Rule } from './entities';
import { RulesService } from './services/rules.service';
import { BusinessEvent } from '../events/entities';
import { Workflow } from '../workflows/entities';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Rule, BusinessEvent, Workflow]),
  ],
  controllers: [RulesController],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
