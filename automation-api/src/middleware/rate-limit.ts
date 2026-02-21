import type { NextFunction, Request, Response } from "express";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function createSimpleRateLimiter(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (existing.count >= limit) {
      const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader("retry-after", retryAfterSec.toString());
      res.status(429).json({
        error: "rate_limited",
        correlationId: req.correlationId
      });
      return;
    }

    existing.count += 1;
    next();
  };
}
