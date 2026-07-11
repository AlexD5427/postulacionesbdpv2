import { Button } from '@/design-system/primitives/Button';

/** Keyboard skip-to-content link; visible only when focused (see globals.css). */
export function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      <Button asChild variant="primary" size="sm">
        <span>Saltar al contenido principal</span>
      </Button>
    </a>
  );
}
