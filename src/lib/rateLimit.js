/**
 * Fixed-window rate limiting with a swappable store.
 * Security practice under SPDI Rules 2011, Rule 8 (now) and DPDP Rules 2025, Rule 6
 * (from about May 2027): throttle public endpoints and admin login attempts.
 *
 * The default store keeps counters in this process's memory. That is fine for a single
 * instance, but counters reset on restart and are not shared between instances. To run
 * more than one instance, call `setRateLimitStore()` at startup with a shared store
 * (e.g. Redis) that implements the same two async methods.
 */

/** @typedef {{ count: number, resetAt: number }} Window */

export const createMemoryStore = () => {
  const windows = new Map();
  return {
    /** Adds one hit and returns the current window. */
    async increment(key, windowMs) {
      const now = Date.now();
      const current = windows.get(key);
      if (!current || current.resetAt <= now) {
        const fresh = { count: 1, resetAt: now + windowMs };
        windows.set(key, fresh);
        if (windows.size > 10000) {
          for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
        }
        return fresh;
      }
      current.count += 1;
      return current;
    },
    /** Returns the current window without counting, or null. */
    async get(key) {
      const current = windows.get(key);
      return current && current.resetAt > Date.now() ? current : null;
    }
  };
};

// Kept on globalThis because Next.js bundles each page and API route separately: a
// module-level variable would give every route its own counters, so an admin blocked on
// /api/admin/* could keep guessing on /admin/*.
const globalForLimits = globalThis;
if (!globalForLimits.__rateLimitStore) globalForLimits.__rateLimitStore = createMemoryStore();
const getStore = () => globalForLimits.__rateLimitStore;

export const setRateLimitStore = (next) => {
  globalForLimits.__rateLimitStore = next;
};

/** Counts a hit. @returns {Promise<{ allowed: boolean, retryAfterSeconds: number }>} */
export const consume = async (key, { limit, windowMs }) => {
  const window = await getStore().increment(key, windowMs);
  return { allowed: window.count <= limit, retryAfterSeconds: Math.ceil((window.resetAt - Date.now()) / 1000) };
};

/** Checks without counting. */
export const isBlocked = async (key, { limit }) => {
  const window = await getStore().get(key);
  return window ? { blocked: window.count >= limit, retryAfterSeconds: Math.ceil((window.resetAt - Date.now()) / 1000) } : { blocked: false, retryAfterSeconds: 0 };
};
