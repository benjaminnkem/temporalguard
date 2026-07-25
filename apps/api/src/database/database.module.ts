import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('database.url');
        return {
          type: 'postgres' as const,
          ...(url ? { url } : {}),
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          username: configService.get<string>('database.username'),
          password: configService.get<string>('database.password'),
          database: configService.get<string>('database.database'),
          schema: configService.get<string>('database.schema'),
          entities: [`${__dirname}/../modules/**/*.entity{.ts,.js}`],
          autoLoadEntities: true,
          synchronize: false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
