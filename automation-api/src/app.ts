import express from "express";
import { correlationIdMiddleware } from "./middleware/correlation-id";
import { errorHandler } from "./middleware/error-handler";
import { telegramRouter } from "./routes/telegram";
import { webhooksRouter } from "./routes/webhooks";

const app = express();

app.use(
  express.json({
    verify(req, _res, buffer) {
      (req as typeof req & { rawBody?: Buffer }).rawBody = buffer;
    }
  })
);
app.use(correlationIdMiddleware);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/hooks", webhooksRouter);
app.use("/telegram", telegramRouter);
app.use(errorHandler);

export default app;
