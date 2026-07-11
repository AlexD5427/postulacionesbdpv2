'use client';

import type { JobApplicationQuestion } from '@/shared/types/domain';
import { Field } from '@/design-system/primitives/Field';
import { Input, Textarea } from '@/design-system/primitives/Input';
import { Checkbox } from '@/design-system/primitives/Checkbox';
import { RadioGroup, RadioGroupItem } from '@/design-system/primitives/RadioGroup';

type AnswerValue = string | string[] | number | boolean;

/** Renders one configurable application question by type. Fully keyboard/AT accessible. */
export function ApplicationQuestionField({
  question,
  value,
  error,
  onChange,
}: {
  question: JobApplicationQuestion;
  value: AnswerValue | undefined;
  error?: string;
  onChange: (value: AnswerValue) => void;
}) {
  switch (question.type) {
    case 'short_text':
      return (
        <Field label={question.prompt} required={question.required} description={question.helpText} error={error}>
          {(f) => <Input {...f} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />}
        </Field>
      );
    case 'long_text':
      return (
        <Field label={question.prompt} required={question.required} description={question.helpText} error={error}>
          {(f) => <Textarea {...f} rows={4} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />}
        </Field>
      );
    case 'numeric':
      return (
        <Field label={question.prompt} required={question.required} description={question.helpText} error={error}>
          {(f) => (
            <Input
              {...f}
              type="number"
              inputMode="numeric"
              value={value === undefined ? '' : String(value)}
              onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            />
          )}
        </Field>
      );
    case 'boolean':
      return (
        <Field label={question.prompt} required={question.required} description={question.helpText} error={error}>
          {() => (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={value === true} onCheckedChange={(v) => onChange(v === true)} />
              Sí
            </label>
          )}
        </Field>
      );
    case 'single_choice':
      return (
        <Field label={question.prompt} required={question.required} description={question.helpText} error={error}>
          {(f) => (
            <RadioGroup
              aria-describedby={f['aria-describedby']}
              value={(value as string) ?? ''}
              onValueChange={onChange}
              className="flex flex-col gap-2"
            >
              {(question.options ?? []).map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value={option} />
                  {option}
                </label>
              ))}
            </RadioGroup>
          )}
        </Field>
      );
    case 'multiple_choice': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <Field label={question.prompt} required={question.required} description={question.helpText} error={error}>
          {() => (
            <div className="flex flex-col gap-2">
              {(question.options ?? []).map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.includes(option)}
                    onCheckedChange={(v) =>
                      onChange(v === true ? [...selected, option] : selected.filter((o) => o !== option))
                    }
                  />
                  {option}
                </label>
              ))}
            </div>
          )}
        </Field>
      );
    }
    default:
      return null;
  }
}
