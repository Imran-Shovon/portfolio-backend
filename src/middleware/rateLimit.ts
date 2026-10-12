import { ipKeyGenerator, rateLimit } from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const tooMany = (message: string) => ({ error: { code: "RATE_LIMITED", message } });

/** Created per app instance so tests (and multiple apps) don't share counters. */
export function createRateLimiters() {
  return {
    login: rateLimit({
      windowMs: FIFTEEN_MINUTES,
      limit: 10,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skipSuccessfulRequests: true,
      message: tooMany("Too many login attempts. Try again in a few minutes."),
    }),
    contact: rateLimit({
      windowMs: FIFTEEN_MINUTES,
      limit: 5,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      // Per IP *and* per site, so one site's spam can't block another's form.
      keyGenerator: req => `${ipKeyGenerator(req.ip ?? "")}:${req.params.slug ?? ""}`,
      message: tooMany("Too many messages. Try again later."),
    }),
  };
}
