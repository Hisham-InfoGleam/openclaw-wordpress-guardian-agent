import "express";

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      correlationId?: string;
    }
  }
}

export {};
