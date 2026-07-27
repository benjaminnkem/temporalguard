import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const port = Number(process.env.PORT ?? 8080);
const origin = (value, fallback) =>
  new URL(
    /^https?:\/\//.test(value ?? "") ? value : `http://${value ?? fallback}`,
  );
const webOrigin = origin(process.env.WEB_ORIGIN, "web:3000");
const apiOrigin = origin(process.env.API_ORIGIN, "api:3000");
const signozPublicUrl =
  process.env.SIGNOZ_PUBLIC_URL ?? "http://localhost:3301";

function proxy(request, response, origin) {
  const target = new URL(request.url ?? "/", origin);
  const send = target.protocol === "https:" ? httpsRequest : httpRequest;
  const upstream = send(
    target,
    {
      method: request.method,
      headers: {
        ...request.headers,
        host: target.host,
        "x-forwarded-host": request.headers.host ?? "",
        "x-forwarded-proto": request.headers["x-forwarded-proto"] ?? "http",
      },
    },
    (upstreamResponse) => {
      response.writeHead(
        upstreamResponse.statusCode ?? 502,
        upstreamResponse.headers,
      );
      upstreamResponse.pipe(response);
    },
  );
  upstream.on("error", () => {
    if (!response.headersSent) {
      response.writeHead(502, { "content-type": "application/json" });
    }
    response.end(
      JSON.stringify({ status: "error", code: "UPSTREAM_UNAVAILABLE" }),
    );
  });
  request.pipe(upstream);
}

createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://gateway").pathname;
  if (pathname === "/healthz") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok", service: "gateway" }));
    return;
  }
  if (pathname === "/signoz" || pathname.startsWith("/signoz/")) {
    response.writeHead(302, { location: signozPublicUrl });
    response.end();
    return;
  }
  proxy(request, response, pathname.startsWith("/api") ? apiOrigin : webOrigin);
}).listen(port, "0.0.0.0");
