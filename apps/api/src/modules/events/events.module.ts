import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './controllers/events.controller';
import { BusinessEvent } from './entities';
import { EventsService } from './services/events.service';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessEvent])],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
