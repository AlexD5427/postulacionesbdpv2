import type { DigitalCV } from '@/shared/types/domain';
import { PROFICIENCY_LABELS } from '../lib/labels';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';

/**
 * Print-friendly CV preview. This is the boundary a future PDF export would
 * render; for now candidates can use the browser's "Print / Save as PDF". No AI
 * processing is applied.
 */
export function CVPreview({ cv, name }: { cv: DigitalCV; name?: string }) {
  return (
    <GlassSurface
      variant="standard"
      radius="2xl"
      padding="lg"
      className="print:bg-white print:shadow-none print:backdrop-blur-none"
    >
      <article className="cv-print mx-auto flex max-w-2xl flex-col gap-6">
        {name && <h1 className="text-3xl font-bold">{name}</h1>}

        {cv.professionalSummary && (
          <section>
            <h2 className="mb-1 text-lg font-semibold text-primary">Resumen profesional</h2>
            <p className="text-muted-foreground">{cv.professionalSummary}</p>
          </section>
        )}

        {cv.experiences.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold text-primary">Experiencia</h2>
            <ul className="flex flex-col gap-3">
              {cv.experiences.map((exp) => (
                <li key={exp.id}>
                  <p className="font-medium">
                    {exp.role} · {exp.organization}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {exp.startDate || '—'} – {exp.current ? 'Actual' : exp.endDate || '—'}
                  </p>
                  {exp.description && <p className="mt-1 text-sm text-muted-foreground">{exp.description}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {cv.education.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold text-primary">Formación</h2>
            <ul className="flex flex-col gap-2">
              {cv.education.map((ed) => (
                <li key={ed.id}>
                  <p className="font-medium">{ed.degree}</p>
                  <p className="text-sm text-muted-foreground">
                    {ed.institution}
                    {ed.inProgress ? ' · En curso' : ''}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(cv.technicalSkills.length > 0 || cv.generalSkills.length > 0) && (
          <section>
            <h2 className="mb-2 text-lg font-semibold text-primary">Habilidades</h2>
            <div className="flex flex-wrap gap-2">
              {[...cv.technicalSkills, ...cv.generalSkills]
                .filter((s) => s.name)
                .map((s) => (
                  <span key={s.id} className="rounded-full border border-border px-3 py-0.5 text-sm">
                    {s.name}
                    {s.category === 'technical' ? ` · ${PROFICIENCY_LABELS[s.level]}` : ''}
                  </span>
                ))}
            </div>
          </section>
        )}

        {cv.languages.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold text-primary">Idiomas</h2>
            <ul className="flex flex-wrap gap-3 text-sm">
              {cv.languages.map((l) => (
                <li key={l.id}>
                  {l.name} — {PROFICIENCY_LABELS[l.level]}
                </li>
              ))}
            </ul>
          </section>
        )}

        {cv.certifications.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold text-primary">Certificaciones</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {cv.certifications.map((c) => (
                <li key={c.id}>
                  {c.name} — {c.issuer}
                </li>
              ))}
            </ul>
          </section>
        )}

        {cv.availability && (
          <p className="text-sm text-muted-foreground">Disponibilidad: {cv.availability}</p>
        )}
      </article>
    </GlassSurface>
  );
}
