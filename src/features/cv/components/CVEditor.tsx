'use client';

import { useEffect, useState } from 'react';
import { Plus, Eye, Printer, Check, CloudUpload, AlertTriangle } from 'lucide-react';
import type { DigitalCV } from '@/shared/types/domain';
import { useCV, useSaveCV } from '../hooks/use-cv';
import { computeCVCompletion } from '@/features/candidate-profile/lib/completion';
import {
  moveItem,
  newCertification,
  newEducation,
  newExperience,
  newLanguage,
  newReference,
  newSkill,
} from '../lib/factories';
import { PROFICIENCY_OPTIONS } from '../lib/labels';
import { RepeatableItem } from './RepeatableItem';
import { CVPreview } from './CVPreview';
import { useAutosave } from '@/shared/hooks/use-autosave';
import { Card, CardTitle, CardDescription } from '@/design-system/primitives/Card';
import { Field } from '@/design-system/primitives/Field';
import { Input, Textarea } from '@/design-system/primitives/Input';
import { Select } from '@/design-system/primitives/Select';
import { Button } from '@/design-system/primitives/Button';
import { Checkbox } from '@/design-system/primitives/Checkbox';
import { Progress } from '@/design-system/primitives/Progress';
import { Skeleton } from '@/design-system/primitives/Skeleton';

function AutosaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'idle') return null;
  const map = {
    saving: { icon: CloudUpload, text: 'Guardando…', cls: 'text-muted-foreground' },
    saved: { icon: Check, text: 'Cambios guardados', cls: 'text-success' },
    error: { icon: AlertTriangle, text: 'No se pudo guardar', cls: 'text-danger' },
  } as const;
  const { icon: Icon, text, cls } = map[status];
  return (
    <span className={`flex items-center gap-1.5 text-sm ${cls}`} role="status" aria-live="polite">
      <Icon className="h-4 w-4" aria-hidden />
      {text}
    </span>
  );
}

export function CVEditor() {
  const { data, isLoading } = useCV();
  const saveCV = useSaveCV();
  const [cv, setCv] = useState<DigitalCV | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (data && !cv) setCv(data);
  }, [data, cv]);

  const status = useAutosave(
    cv,
    async (value) => {
      if (value) await saveCV.mutateAsync(value);
    },
    { enabled: Boolean(cv), delayMs: 1200 },
  );

  if (isLoading || !cv) {
    return <Skeleton className="h-96 w-full rounded-3xl" />;
  }

  const completion = computeCVCompletion(cv);

  // Generic patch helpers ---------------------------------------------------
  function patch(partial: Partial<DigitalCV>) {
    setCv((prev) => (prev ? { ...prev, ...partial } : prev));
  }
  function updateList<K extends keyof DigitalCV>(key: K, updater: (list: DigitalCV[K]) => DigitalCV[K]) {
    setCv((prev) => (prev ? { ...prev, [key]: updater(prev[key]) } : prev));
  }

  if (preview) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between print:hidden">
          <Button variant="outline" onClick={() => setPreview(false)}>
            Volver a editar
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden />
            Imprimir / Guardar PDF
          </Button>
        </div>
        <CVPreview cv={cv} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header / completion */}
      <Card className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Progreso del CV</CardTitle>
            <CardDescription>{completion}% completado</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <AutosaveIndicator status={status} />
            <Button variant="outline" onClick={() => setPreview(true)}>
              <Eye className="h-4 w-4" aria-hidden />
              Vista previa
            </Button>
          </div>
        </div>
        <Progress value={completion} label="Progreso del CV" />
      </Card>

      {/* Summary */}
      <Card className="gap-4">
        <CardTitle className="text-lg">Resumen profesional</CardTitle>
        <Field label="Resumen">
          {(f) => (
            <Textarea
              {...f}
              rows={4}
              value={cv.professionalSummary ?? ''}
              onChange={(e) => patch({ professionalSummary: e.target.value })}
              placeholder="Una síntesis de tu perfil, logros y objetivos."
            />
          )}
        </Field>
      </Card>

      {/* Experience */}
      <Card className="gap-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Experiencia laboral</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateList('experiences', (list) => [...list, newExperience(list.length)])}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Agregar
          </Button>
        </div>
        {cv.experiences.length === 0 && <p className="text-sm text-muted-foreground">Aún no agregaste experiencia.</p>}
        <div className="flex flex-col gap-4">
          {cv.experiences.map((exp, index) => (
            <RepeatableItem
              key={exp.id}
              title="Experiencia"
              index={index}
              count={cv.experiences.length}
              onMoveUp={() => updateList('experiences', (l) => moveItem(l, index, -1))}
              onMoveDown={() => updateList('experiences', (l) => moveItem(l, index, 1))}
              onRemove={() => updateList('experiences', (l) => l.filter((x) => x.id !== exp.id))}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Cargo" required>
                  {(f) => (
                    <Input
                      {...f}
                      value={exp.role}
                      onChange={(e) => updateList('experiences', (l) => l.map((x) => (x.id === exp.id ? { ...x, role: e.target.value } : x)))}
                    />
                  )}
                </Field>
                <Field label="Organización" required>
                  {(f) => (
                    <Input
                      {...f}
                      value={exp.organization}
                      onChange={(e) => updateList('experiences', (l) => l.map((x) => (x.id === exp.id ? { ...x, organization: e.target.value } : x)))}
                    />
                  )}
                </Field>
                <Field label="Fecha de inicio">
                  {(f) => (
                    <Input
                      {...f}
                      type="month"
                      value={exp.startDate}
                      onChange={(e) => updateList('experiences', (l) => l.map((x) => (x.id === exp.id ? { ...x, startDate: e.target.value } : x)))}
                    />
                  )}
                </Field>
                <Field label="Fecha de fin">
                  {(f) => (
                    <Input
                      {...f}
                      type="month"
                      value={exp.endDate ?? ''}
                      disabled={exp.current}
                      onChange={(e) => updateList('experiences', (l) => l.map((x) => (x.id === exp.id ? { ...x, endDate: e.target.value || null } : x)))}
                    />
                  )}
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={exp.current}
                  onCheckedChange={(v) =>
                    updateList('experiences', (l) =>
                      l.map((x) => (x.id === exp.id ? { ...x, current: v === true, endDate: v === true ? null : x.endDate } : x)),
                    )
                  }
                />
                Trabajo actual
              </label>
              <Field label="Descripción">
                {(f) => (
                  <Textarea
                    {...f}
                    rows={3}
                    value={exp.description ?? ''}
                    onChange={(e) => updateList('experiences', (l) => l.map((x) => (x.id === exp.id ? { ...x, description: e.target.value } : x)))}
                  />
                )}
              </Field>
            </RepeatableItem>
          ))}
        </div>
      </Card>

      {/* Education */}
      <Card className="gap-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Formación académica</CardTitle>
          <Button variant="outline" size="sm" onClick={() => updateList('education', (l) => [...l, newEducation(l.length)])}>
            <Plus className="h-4 w-4" aria-hidden />
            Agregar
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          {cv.education.map((ed, index) => (
            <RepeatableItem
              key={ed.id}
              title="Formación"
              index={index}
              count={cv.education.length}
              onMoveUp={() => updateList('education', (l) => moveItem(l, index, -1))}
              onMoveDown={() => updateList('education', (l) => moveItem(l, index, 1))}
              onRemove={() => updateList('education', (l) => l.filter((x) => x.id !== ed.id))}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Institución" required>
                  {(f) => (
                    <Input {...f} value={ed.institution} onChange={(e) => updateList('education', (l) => l.map((x) => (x.id === ed.id ? { ...x, institution: e.target.value } : x)))} />
                  )}
                </Field>
                <Field label="Título / Grado" required>
                  {(f) => (
                    <Input {...f} value={ed.degree} onChange={(e) => updateList('education', (l) => l.map((x) => (x.id === ed.id ? { ...x, degree: e.target.value } : x)))} />
                  )}
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={ed.inProgress}
                  onCheckedChange={(v) => updateList('education', (l) => l.map((x) => (x.id === ed.id ? { ...x, inProgress: v === true } : x)))}
                />
                En curso
              </label>
            </RepeatableItem>
          ))}
        </div>
      </Card>

      {/* Skills */}
      <Card className="gap-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Habilidades técnicas</CardTitle>
          <Button variant="outline" size="sm" onClick={() => updateList('technicalSkills', (l) => [...l, newSkill(l.length, 'technical')])}>
            <Plus className="h-4 w-4" aria-hidden />
            Agregar
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {cv.technicalSkills.map((skill, index) => (
            <div key={skill.id} className="flex items-end gap-2">
              <Field label="Habilidad" className="flex-1">
                {(f) => (
                  <Input {...f} value={skill.name} onChange={(e) => updateList('technicalSkills', (l) => l.map((x) => (x.id === skill.id ? { ...x, name: e.target.value } : x)))} />
                )}
              </Field>
              <div className="w-40">
                <Select
                  aria-label="Nivel"
                  options={PROFICIENCY_OPTIONS}
                  value={skill.level}
                  onChange={(e) => updateList('technicalSkills', (l) => l.map((x) => (x.id === skill.id ? { ...x, level: e.target.value as typeof skill.level } : x)))}
                />
              </div>
              <Button variant="ghost" size="icon" aria-label={`Eliminar habilidad ${index + 1}`} onClick={() => updateList('technicalSkills', (l) => l.filter((x) => x.id !== skill.id))}>
                ✕
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* General skills */}
      <Card className="gap-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Habilidades generales</CardTitle>
          <Button variant="outline" size="sm" onClick={() => updateList('generalSkills', (l) => [...l, newSkill(l.length, 'general')])}>
            <Plus className="h-4 w-4" aria-hidden />
            Agregar
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {cv.generalSkills.map((skill) => (
            <div key={skill.id} className="flex items-center gap-1 rounded-full border border-border bg-muted/50 py-1 pl-3 pr-1">
              <input
                aria-label="Habilidad general"
                className="bg-transparent text-sm outline-none"
                value={skill.name}
                placeholder="Ej.: Trabajo en equipo"
                onChange={(e) => updateList('generalSkills', (l) => l.map((x) => (x.id === skill.id ? { ...x, name: e.target.value } : x)))}
              />
              <button
                type="button"
                aria-label="Eliminar"
                className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                onClick={() => updateList('generalSkills', (l) => l.filter((x) => x.id !== skill.id))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Languages */}
      <Card className="gap-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Idiomas</CardTitle>
          <Button variant="outline" size="sm" onClick={() => updateList('languages', (l) => [...l, newLanguage(l.length)])}>
            <Plus className="h-4 w-4" aria-hidden />
            Agregar
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {cv.languages.map((lang, index) => (
            <div key={lang.id} className="flex items-end gap-2">
              <Field label="Idioma" className="flex-1">
                {(f) => (
                  <Input {...f} value={lang.name} onChange={(e) => updateList('languages', (l) => l.map((x) => (x.id === lang.id ? { ...x, name: e.target.value } : x)))} />
                )}
              </Field>
              <div className="w-40">
                <Select
                  aria-label="Nivel"
                  options={PROFICIENCY_OPTIONS}
                  value={lang.level}
                  onChange={(e) => updateList('languages', (l) => l.map((x) => (x.id === lang.id ? { ...x, level: e.target.value as typeof lang.level } : x)))}
                />
              </div>
              <Button variant="ghost" size="icon" aria-label={`Eliminar idioma ${index + 1}`} onClick={() => updateList('languages', (l) => l.filter((x) => x.id !== lang.id))}>
                ✕
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Certifications + references + extras */}
      <Card className="gap-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Certificaciones</CardTitle>
          <Button variant="outline" size="sm" onClick={() => updateList('certifications', (l) => [...l, newCertification(l.length)])}>
            <Plus className="h-4 w-4" aria-hidden />
            Agregar
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          {cv.certifications.map((cert, index) => (
            <RepeatableItem
              key={cert.id}
              title="Certificación"
              index={index}
              count={cv.certifications.length}
              onMoveUp={() => updateList('certifications', (l) => moveItem(l, index, -1))}
              onMoveDown={() => updateList('certifications', (l) => moveItem(l, index, 1))}
              onRemove={() => updateList('certifications', (l) => l.filter((x) => x.id !== cert.id))}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre">
                  {(f) => <Input {...f} value={cert.name} onChange={(e) => updateList('certifications', (l) => l.map((x) => (x.id === cert.id ? { ...x, name: e.target.value } : x)))} />}
                </Field>
                <Field label="Emisor">
                  {(f) => <Input {...f} value={cert.issuer} onChange={(e) => updateList('certifications', (l) => l.map((x) => (x.id === cert.id ? { ...x, issuer: e.target.value } : x)))} />}
                </Field>
              </div>
            </RepeatableItem>
          ))}
        </div>
      </Card>

      <Card className="gap-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Referencias (opcional)</CardTitle>
          <Button variant="outline" size="sm" onClick={() => updateList('references', (l) => [...l, newReference(l.length)])}>
            <Plus className="h-4 w-4" aria-hidden />
            Agregar
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          {cv.references.map((ref, index) => (
            <RepeatableItem
              key={ref.id}
              title="Referencia"
              index={index}
              count={cv.references.length}
              onMoveUp={() => updateList('references', (l) => moveItem(l, index, -1))}
              onMoveDown={() => updateList('references', (l) => moveItem(l, index, 1))}
              onRemove={() => updateList('references', (l) => l.filter((x) => x.id !== ref.id))}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre">
                  {(f) => <Input {...f} value={ref.name} onChange={(e) => updateList('references', (l) => l.map((x) => (x.id === ref.id ? { ...x, name: e.target.value } : x)))} />}
                </Field>
                <Field label="Relación / cargo">
                  {(f) => <Input {...f} value={ref.relationship} onChange={(e) => updateList('references', (l) => l.map((x) => (x.id === ref.id ? { ...x, relationship: e.target.value } : x)))} />}
                </Field>
              </div>
            </RepeatableItem>
          ))}
        </div>
      </Card>

      <Card className="gap-4">
        <CardTitle className="text-lg">Disponibilidad y enlaces</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Disponibilidad">
            {(f) => <Input {...f} value={cv.availability ?? ''} onChange={(e) => patch({ availability: e.target.value })} placeholder="Ej.: Inmediata" />}
          </Field>
          <Field label="Portafolio / LinkedIn (opcional)">
            {(f) => <Input {...f} type="url" value={cv.externalPortfolioUrl ?? ''} onChange={(e) => patch({ externalPortfolioUrl: e.target.value })} placeholder="https://…" />}
          </Field>
        </div>
      </Card>
    </div>
  );
}
