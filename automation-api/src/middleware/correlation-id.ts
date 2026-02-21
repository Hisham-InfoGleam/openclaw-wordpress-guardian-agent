import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("x-correlation-id");
  const correlationId = incoming && incoming.trim().length > 0 ? incoming : randomUUID();

  req.correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);
  next();
}
