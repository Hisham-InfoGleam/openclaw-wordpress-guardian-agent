type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

const secretKeyPattern = /(token|secret|password|authorization|api[-_]?key)/i;

function redactValue(input: unknown): unknown {
  if (input == null) {
    return input;
  }

  if (typeof input === "string") {
    if (input.length > 120) {
      return `${input.slice(0, 40)}...[redacted]`;
    }
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(redactValue);
  }

  if (typeof input === "object") {
    const source = input as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source)) {
      next[key] = secretKeyPattern.test(key) ? "[redacted]" : redactValue(value);
    }
    return next;
  }

  return input;
}

export function log(level: LogLevel, message: string, payload?: LogPayload): void {
  const safePayload = payload ? redactValue(payload) : undefined;
  const event = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(safePayload ? { payload: safePayload } : {})
  };

  const text = JSON.stringify(event);
  if (level === "error") {
    console.error(text);
    return;
  }

  if (level === "warn") {
    console.warn(text);
    return;
  }

  console.log(text);
}
