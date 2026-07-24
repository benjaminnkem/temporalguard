import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth';
import { ViolationsController } from './controllers/violations.controller';
import { Violation } from './entities';
import { ViolationsService } from './services/violations.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Violation])],
  controllers: [ViolationsController],
  providers: [ViolationsService],
  exports: [ViolationsService],
})
export class ViolationsModule {}
