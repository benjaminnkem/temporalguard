import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessesModule } from '../businesses';
import { MediaModule } from '../media';
import { User } from '../users/entities';
import { UsersModule } from '../users';
import { AuthController } from './controllers/auth.controller';
import { RefreshSession } from './entities';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AuthService } from './services/auth.service';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([RefreshSession, User]),
    BusinessesModule,
    UsersModule,
    MediaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenGuard],
  exports: [AuthService, AccessTokenGuard],
})
export class AuthModule {}
