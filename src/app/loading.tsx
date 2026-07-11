import { Spinner } from '@/design-system/primitives/Spinner';

export default function Loading() {
  return (
    <div className="container-page grid min-h-[60dvh] place-items-center py-16">
      <Spinner label="Cargando contenido…" />
    </div>
  );
}
