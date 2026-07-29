'use client';

import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { PublicAssessmentQuestion } from '@/shared/types/domain';
import { Field } from '@/design-system/primitives/Field';
import { Input, Textarea } from '@/design-system/primitives/Input';
import { Select } from '@/design-system/primitives/Select';
import { RadioGroup, RadioGroupItem } from '@/design-system/primitives/RadioGroup';
import { Checkbox } from '@/design-system/primitives/Checkbox';
import { Button } from '@/design-system/primitives/Button';
import { Alert } from '@/shared/components/Alert';
import { cn } from '@/shared/lib/cn';
import type { PublicAnswerValue } from '../model/answers';

interface Props {
  question: PublicAssessmentQuestion;
  value: PublicAnswerValue;
  error?: string;
  disabled?: boolean;
  onChange: (value: PublicAnswerValue) => void;
}

/**
 * One question, rendered from its **control family** — never from a hardcoded
 * assessment. Every control is operable with the keyboard, labelled for screen
 * readers and usable on a phone.
 *
 * Guarantees, enforced by tests:
 *  · No correctness hint is rendered: the payload does not contain one and this
 *    component has no notion of a "right" option.
 *  · Text is rendered as text. No raw-HTML sink is used anywhere in this
 *    module, so rich content authored in the ATS cannot inject markup.
 *  · Controls the beta cannot answer (`upload`, `pending`, unknown types) render
 *    an explanatory notice instead of a made-up input.
 */
export function PublicQuestionField({ question, value, error, disabled, onChange }: Props) {
  const config = question.configuration;
  const label = question.questionText || 'Pregunta';
  const description = [question.description, question.helpText].filter(Boolean).join(' · ');
  const ariaLabel = question.accessibility.ariaLabel || undefined;
  const longDescription = question.accessibility.longDescription;

  /** Media and long description, shown above the control for every type. */
  const preamble = (
    <>
      {question.media?.url && question.media.kind === 'image' && (
        // Remote assessment media is not part of `images.remotePatterns`, so a
        // plain <img> is correct here: no optimisation, no unexpected origin.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.media.url}
          alt={question.media.alt}
          className="max-h-72 w-auto rounded-2xl border border-border object-contain"
          loading="lazy"
        />
      )}
      {longDescription && (
        <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">{longDescription}</p>
      )}
    </>
  );

  /* ------------------------------ Content blocks --------------------------- */
  if (question.control === 'content') {
    return (
      <div className="flex flex-col gap-2">
        {question.questionText && <h3 className="text-lg font-semibold">{question.questionText}</h3>}
        {question.description && (
          <p className="whitespace-pre-line text-muted-foreground">{question.description}</p>
        )}
        {question.helpText && <p className="text-sm text-muted-foreground">{question.helpText}</p>}
        {preamble}
      </div>
    );
  }

  /* ------------------------- Types disabled in the beta -------------------- */
  if (!question.collectsAnswer) {
    return (
      <Alert tone="info" title={label}>
        {question.control === 'upload'
          ? 'Este tipo de respuesta requiere adjuntar un archivo y no está habilitado en esta versión. El equipo te indicará cómo enviarlo si es necesario.'
          : 'Este tipo de pregunta todavía no puede responderse desde el portal. Puedes continuar con el resto de la evaluación.'}
      </Alert>
    );
  }

  switch (question.control) {
    case 'radio': {
      const scaleHint = config.labelMin || config.labelMax;
      return (
        <Field label={label} required={question.required} description={description} error={error}>
          {(field) => (
            <>
              {preamble}
              {scaleHint && (
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{config.labelMin}</span>
                  <span>{config.labelMax}</span>
                </div>
              )}
              <RadioGroup
                aria-label={ariaLabel}
                aria-describedby={field['aria-describedby']}
                value={typeof value === 'string' ? value : ''}
                disabled={disabled}
                onValueChange={onChange}
                className="flex flex-col gap-2"
              >
                {question.options.map((option) => (
                  <label
                    key={option.optionId}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-sm',
                      'transition-colors duration-[var(--duration-sm)] hover:bg-muted/60',
                      'has-[:checked]:border-primary has-[:checked]:bg-primary/5',
                    )}
                  >
                    <RadioGroupItem value={option.optionId} className="mt-0.5 shrink-0" />
                    <span className="flex flex-col gap-1">
                      <span>{option.optionText || option.optionValue}</span>
                      {option.mediaUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={option.mediaUrl}
                          alt=""
                          className="max-h-40 w-auto rounded-lg"
                          loading="lazy"
                        />
                      )}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </>
          )}
        </Field>
      );
    }

    case 'checkbox': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <Field label={label} required={question.required} description={description} error={error}>
          {() => (
            <>
              {preamble}
              <div role="group" aria-label={ariaLabel ?? label} className="flex flex-col gap-2">
                {question.options.map((option) => (
                  <label
                    key={option.optionId}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-sm',
                      'transition-colors duration-[var(--duration-sm)] hover:bg-muted/60',
                      'has-[:checked]:border-primary has-[:checked]:bg-primary/5',
                    )}
                  >
                    <Checkbox
                      checked={selected.includes(option.optionId)}
                      disabled={disabled}
                      className="mt-0.5 shrink-0"
                      onCheckedChange={(checked) =>
                        onChange(
                          checked === true
                            ? [...selected, option.optionId]
                            : selected.filter((id) => id !== option.optionId),
                        )
                      }
                    />
                    <span>{option.optionText || option.optionValue}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </Field>
      );
    }

    case 'select':
      return (
        <Field label={label} required={question.required} description={description} error={error}>
          {(field) => (
            <>
              {preamble}
              <Select
                id={field.id}
                aria-describedby={field['aria-describedby']}
                aria-invalid={field['aria-invalid']}
                value={typeof value === 'string' ? value : ''}
                disabled={disabled}
                placeholder="Selecciona una opción"
                options={question.options.map((option) => ({
                  value: option.optionId,
                  label: option.optionText || option.optionValue,
                }))}
                onChange={(event) => onChange(event.target.value)}
              />
            </>
          )}
        </Field>
      );

    case 'text':
      return (
        <Field label={label} required={question.required} description={description} error={error}>
          {(field) => (
            <>
              {preamble}
              <Input
                {...field}
                value={typeof value === 'string' ? value : ''}
                maxLength={config.maxLength}
                placeholder={config.placeholder}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
              />
            </>
          )}
        </Field>
      );

    case 'textarea':
      return (
        <Field label={label} required={question.required} description={description} error={error}>
          {(field) => (
            <>
              {preamble}
              <Textarea
                {...field}
                rows={config.rows ?? 5}
                value={typeof value === 'string' ? value : ''}
                maxLength={config.maxLength}
                placeholder={config.placeholder}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
              />
            </>
          )}
        </Field>
      );

    case 'number': {
      const min = config.min ?? config.scaleMin;
      const max = config.max ?? config.scaleMax ?? config.starCount;
      return (
        <Field label={label} required={question.required} description={description} error={error}>
          {(field) => (
            <>
              {preamble}
              <div className="flex items-center gap-2">
                {config.currency && (
                  <span className="text-sm font-medium text-muted-foreground">{config.currency}</span>
                )}
                <Input
                  {...field}
                  type="number"
                  inputMode="decimal"
                  className="max-w-xs"
                  value={typeof value === 'number' ? String(value) : ''}
                  min={min}
                  max={max}
                  step={config.step ?? config.scaleStep}
                  placeholder={config.placeholder}
                  disabled={disabled}
                  onChange={(event) => {
                    const raw = event.target.value;
                    if (raw === '') {
                      onChange(null);
                      return;
                    }
                    const parsed = Number(raw);
                    onChange(Number.isFinite(parsed) ? parsed : null);
                  }}
                />
              </div>
            </>
          )}
        </Field>
      );
    }

    case 'date':
    case 'time':
    case 'datetime':
      return (
        <Field label={label} required={question.required} description={description} error={error}>
          {(field) => (
            <>
              {preamble}
              <Input
                {...field}
                type={
                  question.control === 'date'
                    ? 'date'
                    : question.control === 'time'
                      ? 'time'
                      : 'datetime-local'
                }
                className="max-w-xs"
                value={typeof value === 'string' ? value : ''}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
              />
            </>
          )}
        </Field>
      );

    case 'ordering': {
      const order =
        Array.isArray(value) && value.length === question.options.length
          ? value
          : question.options.map((option) => option.optionId);

      function move(index: number, direction: -1 | 1) {
        const target = index + direction;
        if (target < 0 || target >= order.length) return;
        const next = [...order];
        const current = next[index]!;
        next[index] = next[target]!;
        next[target] = current;
        onChange(next);
      }

      return (
        <Field
          label={label}
          required={question.required}
          description={
            description ||
            'Ordena los elementos con los botones de subir y bajar. El orden inicial ya cuenta como respuesta; cámbialo si no estás de acuerdo.'
          }
          error={error}
        >
          {() => (
            <>
              {preamble}
              {/* Keyboard-first by design: ordering never depends on dragging. */}
              <ol className="flex flex-col gap-2" aria-label={ariaLabel ?? label}>
                {order.map((optionId, index) => {
                  const option = question.options.find((item) => item.optionId === optionId);
                  const text = option?.optionText || option?.optionValue || optionId;
                  return (
                    <li
                      key={optionId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm"
                    >
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="font-semibold text-primary tabular-nums">{index + 1}.</span>
                        <span className="break-words">{text}</span>
                      </span>
                      <span className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={disabled || index === 0}
                          aria-label={`Subir «${text}» a la posición ${index}`}
                          onClick={() => move(index, -1)}
                        >
                          <ChevronUp className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={disabled || index === order.length - 1}
                          aria-label={`Bajar «${text}» a la posición ${index + 2}`}
                          onClick={() => move(index, 1)}
                        >
                          <ChevronDown className="h-4 w-4" aria-hidden />
                        </Button>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </Field>
      );
    }

    case 'matrix': {
      const rows = config.matrixRows ?? [];
      const columns = config.matrixColumns ?? [];
      if (rows.length === 0 || columns.length === 0) {
        // Without both axes there is nothing coherent to render, and inventing a
        // free-text substitute would store a value the reviewer cannot compare.
        return (
          <Alert tone="info" title={label}>
            Esta pregunta de matriz no trae sus filas y columnas en la versión publicada, así que no
            puede responderse desde el portal. Puedes continuar con el resto de la evaluación.
          </Alert>
        );
      }
      const cells = typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
      return (
        <Field label={label} required={question.required} description={description} error={error}>
          {() => (
            <>
              {preamble}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <caption className="sr-only">{ariaLabel ?? label}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="border border-border bg-muted/50 px-3 py-2 text-left">
                        <span className="sr-only">Fila</span>
                      </th>
                      {columns.map((column) => (
                        <th
                          key={column}
                          scope="col"
                          className="border border-border bg-muted/50 px-3 py-2 text-center font-semibold"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row}>
                        <th scope="row" className="border border-border px-3 py-2 text-left font-medium">
                          {row}
                        </th>
                        {columns.map((column) => (
                          <td key={column} className="border border-border px-3 py-2 text-center">
                            <input
                              type="radio"
                              name={`${question.questionId}-${row}`}
                              value={column}
                              checked={cells[row] === column}
                              disabled={disabled}
                              aria-label={`${row}: ${column}`}
                              className="h-4 w-4 accent-primary"
                              onChange={() => onChange({ ...cells, [row]: column })}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Field>
      );
    }

    default:
      return (
        <Alert tone="info" title={label}>
          <span className="inline-flex items-center gap-1.5">
            <Info className="h-4 w-4" aria-hidden />
            Este tipo de pregunta no está disponible en esta versión del portal.
          </span>
        </Alert>
      );
  }
}
