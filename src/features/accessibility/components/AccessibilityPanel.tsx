'use client';

import { Minus, Plus, RotateCcw, Volume2, Square } from 'lucide-react';
import { useAccessibilityStore } from '../state/accessibility-store';
import { useSpeech, speechLangFor } from '../hooks/use-speech';
import { FONT_SCALE_MAX, FONT_SCALE_MIN } from '@/shared/types/domain';
import { Button } from '@/design-system/primitives/Button';
import { Switch } from '@/design-system/primitives/Switch';
import { Select } from '@/design-system/primitives/Select';
import { ThemeToggle } from '@/design-system/themes/ThemeToggle';
import { useTranslation } from '@/features/i18n/use-translation';
import { LanguageSwitcher } from '@/features/i18n/LanguageSwitcher';
import { DockPositionControl } from '@/features/shell/components/DockPositionControl';
import { cn } from '@/shared/lib/cn';

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const descId = description ? `${id}-desc` : undefined;
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex flex-col">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {description && (
          <span id={descId} className="text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-describedby={descId} />
    </div>
  );
}

/**
 * The accessibility control center. Every preference is independently
 * configurable, persists locally (Zustand persist) and applies via <html>
 * data-attributes. A single "Restaurar" button resets everything.
 */
export function AccessibilityPanel({ className }: { className?: string }) {
  const s = useAccessibilityStore();
  const { t, locale } = useTranslation();
  const speech = useSpeech();
  const fontPercent = Math.round(s.fontScale * 100);

  function readPage() {
    const main =
      document.getElementById('main-content') ??
      document.querySelector('main') ??
      document.body;
    speech.speak(main?.innerText ?? '', speechLangFor(locale));
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <section aria-labelledby="a11y-lang">
        <h3
          id="a11y-lang"
          className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {t('lang.label')}
        </h3>
        <LanguageSwitcher variant="inline" />
      </section>

      <section aria-labelledby="a11y-text">
        <h3
          id="a11y-text"
          className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {t('a11y.section.text')}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={s.decreaseFont}
            disabled={s.fontScale <= FONT_SCALE_MIN}
            aria-label={t('a11y.font.decrease')}
          >
            <Minus className="h-4 w-4" aria-hidden />
          </Button>
          <span className="flex-1 text-center text-sm tabular-nums" aria-live="polite">
            {fontPercent}%
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={s.increaseFont}
            disabled={s.fontScale >= FONT_SCALE_MAX}
            aria-label={t('a11y.font.increase')}
          >
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" onClick={s.resetFont} aria-label={t('a11y.font.reset')}>
            <RotateCcw className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </section>

      <section aria-labelledby="a11y-theme">
        <h3
          id="a11y-theme"
          className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {t('a11y.section.theme')}
        </h3>
        <ThemeToggle />
      </section>

      <section aria-labelledby="a11y-vision" className="flex flex-col gap-3">
        <h3
          id="a11y-vision"
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {t('a11y.section.vision')}
        </h3>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="a11y-cvd" className="text-sm font-medium text-foreground">
            {t('a11y.colorblind')}
          </label>
          <span className="text-xs text-muted-foreground">{t('a11y.colorblind.desc')}</span>
          <Select
            id="a11y-cvd"
            value={s.colorVision}
            onChange={(e) => s.setColorVision(e.target.value as typeof s.colorVision)}
            options={[
              { value: 'none', label: t('a11y.colorblind.none') },
              { value: 'protanopia', label: t('a11y.colorblind.protanopia') },
              { value: 'deuteranopia', label: t('a11y.colorblind.deuteranopia') },
              { value: 'tritanopia', label: t('a11y.colorblind.tritanopia') },
            ]}
            className="mt-1"
          />
        </div>
        <div className="divide-y divide-border">
          <ToggleRow
            id="a11y-contrast"
            label={t('a11y.contrast')}
            description={t('a11y.contrast.desc')}
            checked={s.contrast === 'high'}
            onChange={(v) => s.setContrast(v ? 'high' : 'normal')}
          />
          <ToggleRow
            id="a11y-cursor"
            label={t('a11y.cursor')}
            description={t('a11y.cursor.desc')}
            checked={s.largeCursor}
            onChange={s.setLargeCursor}
          />
        </div>
      </section>

      <section aria-labelledby="a11y-reading" className="flex flex-col">
        <h3
          id="a11y-reading"
          className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {t('a11y.section.reading')}
        </h3>
        <div className="divide-y divide-border">
          <ToggleRow
            id="a11y-readfont"
            label={t('a11y.dyslexia')}
            description={t('a11y.dyslexia.desc')}
            checked={s.readingFont === 'legible'}
            onChange={(v) => s.setReadingFont(v ? 'legible' : 'default')}
          />
          <ToggleRow
            id="a11y-reading-mode"
            label={t('a11y.reading')}
            description={t('a11y.reading.desc')}
            checked={s.reading === 'comfortable'}
            onChange={(v) => s.setReading(v ? 'comfortable' : 'normal')}
          />
          <ToggleRow
            id="a11y-ruler"
            label={t('a11y.ruler')}
            description={t('a11y.ruler.desc')}
            checked={s.readingRuler}
            onChange={s.setReadingRuler}
          />
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">{t('a11y.tts')}</span>
          <span className="text-xs text-muted-foreground">{t('a11y.tts.desc')}</span>
          {speech.supported ? (
            <div className="mt-1 flex gap-2">
              <Button variant="outline" size="sm" onClick={readPage} disabled={speech.speaking}>
                <Volume2 className="h-4 w-4" aria-hidden />
                {t('a11y.tts.play')}
              </Button>
              <Button variant="ghost" size="sm" onClick={speech.stop} disabled={!speech.speaking}>
                <Square className="h-4 w-4" aria-hidden />
                {t('a11y.tts.stop')}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t('a11y.tts.unsupported')}</p>
          )}
        </div>
      </section>

      <section aria-labelledby="a11y-toggles" className="divide-y divide-border">
        <h3
          id="a11y-toggles"
          className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {t('a11y.section.prefs')}
        </h3>
        <ToggleRow
          id="a11y-motion"
          label={t('a11y.motion')}
          description={t('a11y.motion.desc')}
          checked={s.motion === 'reduced'}
          onChange={(v) => s.setMotion(v ? 'reduced' : 'system')}
        />
        <ToggleRow
          id="a11y-transparency"
          label={t('a11y.transparency')}
          description={t('a11y.transparency.desc')}
          checked={s.transparency === 'reduced'}
          onChange={(v) => s.setTransparency(v ? 'reduced' : 'normal')}
        />
        <ToggleRow
          id="a11y-links"
          label={t('a11y.links')}
          checked={s.highlightLinks}
          onChange={s.setHighlightLinks}
        />
        <ToggleRow
          id="a11y-focus"
          label={t('a11y.focus')}
          description={t('a11y.focus.desc')}
          checked={s.enhancedFocus}
          onChange={s.setEnhancedFocus}
        />
      </section>

      <section aria-labelledby="a11y-interface" className="flex flex-col gap-2">
        <h3
          id="a11y-interface"
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {t('a11y.section.interface')}
        </h3>
        <DockPositionControl />
      </section>

      <Button variant="outline" onClick={s.resetAll} className="mt-1 w-full">
        <RotateCcw className="h-4 w-4" aria-hidden />
        {t('a11y.reset')}
      </Button>
    </div>
  );
}
