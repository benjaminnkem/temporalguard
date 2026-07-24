import { Module } from '@nestjs/common';
import { ProcessingModule } from './processing.module';
import { ProcessingProcessor } from './services/processing.processor';

@Module({
  imports: [ProcessingModule],
  providers: [ProcessingProcessor],
})
export class ProcessingWorkerModule {}
