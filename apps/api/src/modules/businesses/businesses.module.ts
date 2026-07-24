import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([Business])],
  exports: [TypeOrmModule],
})
export class BusinessesModule {}
