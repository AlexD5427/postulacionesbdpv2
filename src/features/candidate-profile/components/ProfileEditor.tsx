'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useProfile, useUpdateProfile } from '../hooks/use-profile';
import { useJobFacets } from '@/features/jobs/hooks/use-jobs';
import { profileSchema, type ProfileFormValues } from '../schemas/profile-schema';
import { ProfilePhoto } from './ProfilePhoto';
import { Card, CardTitle, CardDescription } from '@/design-system/primitives/Card';
import { Field } from '@/design-system/primitives/Field';
import { Input, Textarea } from '@/design-system/primitives/Input';
import { Button } from '@/design-system/primitives/Button';
import { Switch } from '@/design-system/primitives/Switch';
import { ChipMultiSelect } from '@/design-system/primitives/ChipMultiSelect';
import { Skeleton } from '@/design-system/primitives/Skeleton';
import { Alert } from '@/shared/components/Alert';
import { WORK_MODE_LABELS, EMPLOYMENT_TYPE_LABELS } from '@/features/jobs/lib/labels';

export function ProfileEditor() {
  const { data: profile, isLoading } = useProfile();
  const { data: facets } = useJobFacets();
  const update = useUpdateProfile();
  const [photo, setPhoto] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      openToRelocation: false,
      preferredAreas: [],
      workModes: [],
      employmentTypes: [],
    },
  });

  useEffect(() => {
    if (!profile) return;
    setPhoto(profile.photoAssetId);
    reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      headline: profile.headline ?? '',
      professionalSummary: profile.professionalSummary ?? '',
      phone: profile.contact.phone ?? '',
      city: profile.contact.city ?? '',
      linkedInUrl: profile.contact.linkedInUrl ?? '',
      portfolioUrl: profile.contact.portfolioUrl ?? '',
      availability: profile.preferences.availability ?? '',
      openToRelocation: profile.preferences.openToRelocation,
      preferredAreas: profile.preferences.preferredAreas,
      workModes: profile.preferences.workModes,
      employmentTypes: profile.preferences.employmentTypes,
    });
  }, [profile, reset]);

  async function onSubmit(values: ProfileFormValues) {
    setSaved(false);
    await update.mutateAsync({
      firstName: values.firstName,
      lastName: values.lastName,
      headline: values.headline || undefined,
      professionalSummary: values.professionalSummary || undefined,
      photoAssetId: photo,
      contact: {
        phone: values.phone || undefined,
        city: values.city || undefined,
        linkedInUrl: values.linkedInUrl || undefined,
        portfolioUrl: values.portfolioUrl || undefined,
        country: 'Bolivia',
      },
      preferences: {
        preferredAreas: values.preferredAreas,
        workModes: values.workModes,
        employmentTypes: values.employmentTypes,
        availability: values.availability || undefined,
        openToRelocation: values.openToRelocation,
      },
    });
    setSaved(true);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  const areaOptions = (facets?.areas ?? []).map((a) => ({ value: a, label: a }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      {saved && !isDirty && (
        <Alert tone="success" title="Cambios guardados">
          Tu perfil se actualizó correctamente.
        </Alert>
      )}

      <Card className="gap-4">
        <CardTitle className="text-lg">Foto de perfil</CardTitle>
        <ProfilePhoto
          value={photo}
          displayName={`${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`}
          onChange={(v) => {
            setPhoto(v);
            setSaved(false);
          }}
        />
      </Card>

      <Card className="gap-4">
        <CardTitle className="text-lg">Información personal</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required error={errors.firstName?.message}>
            {(f) => <Input {...f} {...register('firstName')} autoComplete="given-name" />}
          </Field>
          <Field label="Apellidos" required error={errors.lastName?.message}>
            {(f) => <Input {...f} {...register('lastName')} autoComplete="family-name" />}
          </Field>
        </div>
        <Field label="Titular profesional" description="Ej.: Analista financiero con 5 años de experiencia" error={errors.headline?.message}>
          {(f) => <Input {...f} {...register('headline')} />}
        </Field>
        <Field label="Resumen profesional" error={errors.professionalSummary?.message}>
          {(f) => <Textarea {...f} {...register('professionalSummary')} rows={5} />}
        </Field>
      </Card>

      <Card className="gap-4">
        <CardTitle className="text-lg">Contacto</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teléfono" error={errors.phone?.message}>
            {(f) => <Input {...f} {...register('phone')} type="tel" autoComplete="tel" inputMode="tel" />}
          </Field>
          <Field label="Ciudad" error={errors.city?.message}>
            {(f) => <Input {...f} {...register('city')} autoComplete="address-level2" />}
          </Field>
          <Field label="LinkedIn (opcional)" error={errors.linkedInUrl?.message}>
            {(f) => <Input {...f} {...register('linkedInUrl')} type="url" placeholder="https://linkedin.com/in/…" />}
          </Field>
          <Field label="Portafolio (opcional)" error={errors.portfolioUrl?.message}>
            {(f) => <Input {...f} {...register('portfolioUrl')} type="url" placeholder="https://…" />}
          </Field>
        </div>
      </Card>

      <Card className="gap-4">
        <CardTitle className="text-lg">Preferencias laborales</CardTitle>
        <CardDescription>Nos ayudan a mostrarte oportunidades relevantes. No se usan para calcular afinidad.</CardDescription>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Áreas de interés</span>
          <Controller
            control={control}
            name="preferredAreas"
            render={({ field }) => (
              <ChipMultiSelect options={areaOptions} value={field.value} onChange={field.onChange} label="Áreas de interés" />
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Modalidad</span>
          <Controller
            control={control}
            name="workModes"
            render={({ field }) => (
              <ChipMultiSelect
                options={Object.entries(WORK_MODE_LABELS).map(([value, label]) => ({ value: value as 'on_site', label }))}
                value={field.value}
                onChange={field.onChange}
                label="Modalidad"
              />
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Tipo de contrato</span>
          <Controller
            control={control}
            name="employmentTypes"
            render={({ field }) => (
              <ChipMultiSelect
                options={Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => ({ value: value as 'full_time', label }))}
                value={field.value}
                onChange={field.onChange}
                label="Tipo de contrato"
              />
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Disponibilidad" description="Ej.: Inmediata, 15 días" error={errors.availability?.message}>
            {(f) => <Input {...f} {...register('availability')} />}
          </Field>
          <div className="flex items-center justify-between gap-3 pt-6">
            <label htmlFor="relocation" className="text-sm font-medium">
              Disponible para reubicarme
            </label>
            <Controller
              control={control}
              name="openToRelocation"
              render={({ field }) => (
                <Switch id="relocation" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        </div>
      </Card>

      <div className="sticky bottom-24 flex justify-end lg:bottom-4">
        <Button type="submit" loading={update.isPending} size="lg" className="shadow-glass-lg">
          <Save className="h-5 w-5" aria-hidden />
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
