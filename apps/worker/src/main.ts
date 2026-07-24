import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { CompanyConcurrencyService } from "../../api/src/modules/processing/services/company-concurrency.service";
import { WorkerModule } from "./worker.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  const logger = new Logger("ProcessingWorker");
  const config = app.get(ConfigService);
  const dataSource = app.get(DataSource);
  const concurrency = app.get(CompanyConcurrencyService);
  let ready = true;

  const handleRequest = async (
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> => {
    if (request.url === "/health/live") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok" }));
      return;
    }
    if (request.url === "/health/ready") {
      const healthy =
        ready && dataSource.isInitialized && (await concurrency.isHealthy());
      response.writeHead(healthy ? 200 : 503, {
        "content-type": "application/json",
      });
      response.end(JSON.stringify({ status: healthy ? "ready" : "not_ready" }));
      return;
    }
    response.writeHead(404).end();
  };
  const server = createServer((request, response) => {
    void handleRequest(request, response);
  });

  const port = config.get<number>("worker.healthPort") ?? 3002;
  server.listen(port, () => logger.log(`Worker health listening on ${port}`));

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    ready = false;
    logger.log(`Received ${signal}; stopping new work`);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await app.close();
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

void bootstrap();
