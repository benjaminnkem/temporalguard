import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities';
import { BusinessesController } from './controllers/businesses.controller';
import { Business, BusinessApiKey } from './entities';
import { ApiKeyGuard } from './guards/api-key.guard';
import { WorkspaceAuthGuard } from './guards/workspace-auth.guard';
import { BusinessesService } from './services/businesses.service';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([Business, BusinessApiKey, User]),
  ],
  controllers: [BusinessesController],
  providers: [BusinessesService, ApiKeyGuard, WorkspaceAuthGuard],
  exports: [TypeOrmModule, BusinessesService, ApiKeyGuard, WorkspaceAuthGuard],
})
export class BusinessesModule {}
