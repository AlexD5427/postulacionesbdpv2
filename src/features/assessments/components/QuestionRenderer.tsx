'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';
import type { AssessmentQuestion } from '@/shared/types/domain';
import type { AnswerValue } from '../schemas/answer-validation';
import { Field } from '@/design-system/primitives/Field';
import { Input, Textarea } from '@/design-system/primitives/Input';
import { RadioGroup, RadioGroupItem } from '@/design-system/primitives/RadioGroup';
import { Checkbox } from '@/design-system/primitives/Checkbox';
import { Button } from '@/design-system/primitives/Button';
import { Alert } from '@/shared/components/Alert';
import { cn } from '@/shared/lib/cn';

interface Props {
  question: AssessmentQuestion;
  value: AnswerValue;
  error?: string;
  review?: boolean;
  onChange: (value: AnswerValue) => void;
}

/**
 * Renders a single assessment question by type. Every type is keyboard and
 * screen-reader operable and works on mobile. Correct answers are NEVER exposed
 * (the definition doesn't carry them). In `review` mode inputs are read-only.
 */
export function QuestionRenderer({ question, value, error, review, onChange }: Props) {
  const label = question.prompt;
  const help = question.helpText;
  const required = question.required;
  const disabled = review;

  // Optional narrative / table shown above the input.
  const preamble = (
    <>
      {question.scenario && (
        <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">{question.scenario}</p>
      )}
      {question.table && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {question.table.columns.map((col) => (
                  <th key={col} scope="col" className="border border-border bg-muted/50 px-3 py-2 text-left font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {question.table.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-border px-3 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  switch (question.type) {
    case 'short_text':
      return (
        <Field label={label} required={required} description={help} error={error}>
          {(f) => (
            <>
              {preamble}
              <Input {...f} value={(value as string) ?? ''} maxLength={question.maxLength} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
            </>
          )}
        </Field>
      );
    case 'long_text':
      return (
        <Field label={label} required={required} description={help} error={error}>
          {(f) => (
            <>
              {preamble}
              <Textarea {...f} rows={5} value={(value as string) ?? ''} maxLength={question.maxLength} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
            </>
          )}
        </Field>
      );
    case 'numeric':
    case 'currency':
      return (
        <Field label={label} required={required} description={help} error={error}>
          {(f) => (
            <>
              {preamble}
              <div className="flex items-center gap-2">
                {question.type === 'currency' && <span className="text-muted-foreground">{question.currency ?? 'Bs'}</span>}
                <Input
                  {...f}
                  type="number"
                  inputMode="decimal"
                  value={value === null || value === undefined ? '' : String(value)}
                  min={question.min}
                  max={question.max}
                  disabled={disabled}
                  onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
                />
              </div>
            </>
          )}
        </Field>
      );
    case 'true_false':
      return (
        <Field label={label} required={required} description={help} error={error}>
          {(f) => (
            <>
              {preamble}
              <RadioGroup aria-describedby={f['aria-describedby']} value={(value as string) ?? ''} disabled={disabled} onValueChange={onChange} className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="true" /> Verdadero
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="false" /> Falso
                </label>
              </RadioGroup>
            </>
          )}
        </Field>
      );
    case 'single_choice':
    case 'scenario':
    case 'table_interpretation':
      return (
        <Field label={label} required={required} description={help} error={error}>
          {(f) => (
            <>
              {preamble}
              <RadioGroup aria-describedby={f['aria-describedby']} value={(value as string) ?? ''} disabled={disabled} onValueChange={onChange} className="flex flex-col gap-2">
                {(question.options ?? []).map((option) => (
                  <label key={option.id} className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm has-[:checked]:border-primary">
                    <RadioGroupItem value={option.id} className="mt-0.5" />
                    <span>
                      {option.label}
                      {option.description && <span className="block text-muted-foreground">{option.description}</span>}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </>
          )}
        </Field>
      );
    case 'multiple_choice': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <Field label={label} required={required} description={help} error={error}>
          {() => (
            <>
              {preamble}
              <div className="flex flex-col gap-2">
                {(question.options ?? []).map((option) => (
                  <label key={option.id} className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm has-[:checked]:border-primary">
                    <Checkbox
                      checked={selected.includes(option.id)}
                      disabled={disabled}
                      onCheckedChange={(v) => onChange(v === true ? [...selected, option.id] : selected.filter((o) => o !== option.id))}
                      className="mt-0.5"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </>
          )}
        </Field>
      );
    }
    case 'likert': {
      const scale = question.scale ?? { min: 1, max: 5 };
      const points = Array.from({ length: scale.max - scale.min + 1 }, (_, i) => scale.min + i);
      return (
        <Field label={label} required={required} description={help} error={error}>
          {(f) => (
            <>
              {preamble}
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{scale.minLabel}</span>
                <span>{scale.maxLabel}</span>
              </div>
              <RadioGroup
                aria-describedby={f['aria-describedby']}
                value={value === null || value === undefined ? '' : String(value)}
                disabled={disabled}
                onValueChange={(v) => onChange(Number(v))}
                className="flex justify-between gap-2"
              >
                {points.map((point) => (
                  <label key={point} className="flex flex-col items-center gap-1 text-sm">
                    <RadioGroupItem value={String(point)} aria-label={`${point}`} />
                    {point}
                  </label>
                ))}
              </RadioGroup>
            </>
          )}
        </Field>
      );
    }
    case 'ranking': {
      const items = question.rankingItems ?? [];
      const order = Array.isArray(value) && value.length === items.length ? value : items.map((i) => i.id);
      function move(index: number, dir: -1 | 1) {
        const target = index + dir;
        if (target < 0 || target >= order.length) return;
        const next = [...order];
        const a = next[index]!;
        next[index] = next[target]!;
        next[target] = a;
        onChange(next);
      }
      return (
        <Field label={label} required={required} description={help ?? 'Ordena de mayor a menor prioridad.'} error={error}>
          {() => (
            <ol className="flex flex-col gap-2">
              {order.map((id, index) => {
                const item = items.find((i) => i.id === id);
                return (
                  <li key={id} className={cn('flex items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm')}>
                    <span>
                      <span className="mr-2 font-semibold text-primary">{index + 1}.</span>
                      {item?.label}
                    </span>
                    <span className="flex gap-1">
                      <Button variant="ghost" size="icon" disabled={disabled || index === 0} aria-label={`Subir ${item?.label}`} onClick={() => move(index, -1)}>
                        <ChevronUp className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={disabled || index === order.length - 1} aria-label={`Bajar ${item?.label}`} onClick={() => move(index, 1)}>
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      </Button>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </Field>
      );
    }
    case 'file_response':
    case 'media_response':
      return (
        <Alert tone="info" title={label}>
          Este tipo de respuesta no está habilitado en esta evaluación.
        </Alert>
      );
    default:
      return null;
  }
}
