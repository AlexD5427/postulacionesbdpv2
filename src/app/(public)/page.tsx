import { getDataProvider } from '@/infrastructure/providers/factory';
import { LandingView } from '@/features/landing/components/LandingView';

// Public content page — data fetched on the server; the view is a client
// component so it can localise copy and drive the motion language.
export default async function LandingPage() {
  const provider = getDataProvider();
  const featured = await provider.jobs.getFeatured(3).catch(() => []);

  return <LandingView featured={featured} />;
}
