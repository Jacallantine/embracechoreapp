/**
 * Simple in-memory rate limiter for API routes.
 * In production, use Redis or a proper rate-limiting service.
 */

const attempts = new Map();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of attempts) {
    if (now - data.firstAttempt > data.windowMs) {
      attempts.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * @param {string} key - Unique identifier (e.g., IP address or email)
 * @param {object} options
 * @param {number} options.maxAttempts - Max allowed attempts in the window
 * @param {number} options.windowMs - Time window in milliseconds
 * @returns {{ allowed: boolean, remaining: number, retryAfterMs: number }}
 */
export function checkRateLimit(key, { maxAttempts = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.firstAttempt > windowMs) {
    // Start a new window
    attempts.set(key, { count: 1, firstAttempt: now, windowMs });
    return { allowed: true, remaining: maxAttempts - 1, retryAfterMs: 0 };
  }

  record.count += 1;

  if (record.count > maxAttempts) {
    const retryAfterMs = windowMs - (now - record.firstAttempt);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  return { allowed: true, remaining: maxAttempts - record.count, retryAfterMs: 0 };
}
