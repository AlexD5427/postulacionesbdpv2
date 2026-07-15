/**
 * Storage key for persisted accessibility preferences.
 *
 * This lives in its OWN module (deliberately without the `'use client'`
 * directive) so it can be imported from BOTH the client store and the server
 * `RootLayout`. The layout inlines a tiny pre-paint bootstrap script that reads
 * this key from `localStorage`; if the constant were imported from the client
 * store module, the server build would replace it with a client-reference stub
 * (a `function(){throw Error("…")}` string) and the inline script would throw a
 * syntax error, silently disabling the no-flash bootstrap.
 */
export const A11Y_STORAGE_KEY = 'bdp.a11y.v1';
