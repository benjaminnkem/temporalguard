import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RulesController } from './controllers/rules.controller';
import { Rule } from './entities';
import { RulesService } from './services/rules.service';
import { BusinessEvent } from '../events/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Rule, BusinessEvent])],
  controllers: [RulesController],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
