/**
 * Colour-vision assistance filters.
 *
 * Renders three `feColorMatrix` filters (protan / deutan / tritan) once, hidden
 * off-canvas. When the candidate picks a mode in the accessibility center, CSS
 * sets `filter: url(#bdp-cvd-…)` on <html> (see globals.css). Applying the
 * filter at the document root means the whole UI — including fixed chrome like
 * the dock and launcher — is remapped consistently.
 *
 * These are colour-remap matrices intended as a perceptual aid; individual
 * needs vary, so they sit alongside (not instead of) high-contrast and
 * non-colour status cues (text + shape) used throughout the portal.
 */
export function ColorVisionFilters() {
  return (
    <svg
      aria-hidden
      focusable="false"
      style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
    >
      <defs>
        <filter id="bdp-cvd-protanopia" colorInterpolationFilters="linearRGB">
          <feColorMatrix
            type="matrix"
            values="0.567 0.433 0 0 0
                    0.558 0.442 0 0 0
                    0     0.242 0.758 0 0
                    0     0     0     1 0"
          />
        </filter>
        <filter id="bdp-cvd-deuteranopia" colorInterpolationFilters="linearRGB">
          <feColorMatrix
            type="matrix"
            values="0.625 0.375 0   0 0
                    0.7   0.3   0   0 0
                    0     0.3   0.7 0 0
                    0     0     0   1 0"
          />
        </filter>
        <filter id="bdp-cvd-tritanopia" colorInterpolationFilters="linearRGB">
          <feColorMatrix
            type="matrix"
            values="0.95 0.05  0     0 0
                    0    0.433 0.567 0 0
                    0    0.475 0.525 0 0
                    0    0     0     1 0"
          />
        </filter>
      </defs>
    </svg>
  );
}
