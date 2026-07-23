/**
 * Storage key for the persisted locale preference.
 *
 * Like the accessibility key, this lives in its OWN module (deliberately WITHOUT
 * the `'use client'` directive) so both the client store and the server
 * `RootLayout` can import it. The layout inlines a tiny pre-paint bootstrap that
 * reads this key from `localStorage` to set `<html lang>` before first paint,
 * avoiding a flash of the default language.
 */
export const I18N_STORAGE_KEY = 'bdp.locale.v1';
