import app from "./app";
import { env } from "./config/env";
import { log } from "./utils/logger";

const server = app.listen(env.PORT, () => {
  log("info", "automation-api started", { port: env.PORT });
});

function shutdown(signal: string): void {
  log("info", "Received signal", { signal });
  server.close((error) => {
    if (error) {
      log("error", "Graceful shutdown failed", { signal, error: error.message });
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
