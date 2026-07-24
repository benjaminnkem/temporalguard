import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { configuration, validateEnvironment } from "../../api/src/config";
import { DatabaseModule } from "../../api/src/database";
import { ProcessingWorkerModule } from "../../api/src/modules/processing";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
      envFilePath: ["../../.env", "../api/.env", ".env"],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>("redis.host"),
          port: config.get<number>("redis.port"),
        },
        prefix: config.get<string>("queue.prefix"),
      }),
    }),
    DatabaseModule,
    ProcessingWorkerModule,
  ],
})
export class WorkerModule {}
