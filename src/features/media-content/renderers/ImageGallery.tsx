import type { MediaAsset } from '@/shared/types/domain';
import { InteractiveImage } from '../components/InteractiveImage';

/** Responsive, art-directed image gallery. Each item keeps its alt text. */
export function ImageGallery({ assets }: { assets: MediaAsset[] }) {
  const visible = assets.filter((a) => a.publicPreviewURL);
  if (visible.length === 0) return null;

  return (
    <ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((asset) => (
        <li key={asset.id}>
          <figure className="flex flex-col gap-2">
            <InteractiveImage
              src={asset.publicPreviewURL as string}
              alt={asset.altText}
              className="aspect-[4/3] w-full rounded-2xl"
              sizes="(max-width: 640px) 100vw, 33vw"
              focalPointX={asset.focalPointX}
              focalPointY={asset.focalPointY}
            />
            {asset.caption && (
              <figcaption className="text-sm text-muted-foreground">{asset.caption}</figcaption>
            )}
          </figure>
        </li>
      ))}
    </ul>
  );
}
