import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { log } from "../utils/logger";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request payload.", correlationId: req.correlationId });
    return;
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  log("error", "Unhandled API error", { correlationId: req.correlationId, message });
  res.status(500).json({ error: "Unexpected server error.", correlationId: req.correlationId });
}
