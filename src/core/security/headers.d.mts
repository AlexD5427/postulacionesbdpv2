/**
 * Types for the plain-JS security header module.
 *
 * `headers.mjs` stays untyped JavaScript on purpose: `next.config.mjs` imports it
 * directly, with no build step. This declaration lets tests and tooling consume
 * it with the same guarantees as the rest of the codebase.
 */
export declare function securityHeaders(): Array<{ key: string; value: string }>;
