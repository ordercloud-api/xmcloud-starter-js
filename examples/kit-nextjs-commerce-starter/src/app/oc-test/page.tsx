import client from 'lib/sitecore-client';
import scConfig from 'sitecore.config';
import Providers from 'src/Providers';
import { MeProbe } from './MeProbe';

export const dynamic = 'force-dynamic';

export default async function OcTestPage() {
  const page = await client.getPage('/', {
    site: scConfig.defaultSite,
    locale: scConfig.defaultLanguage,
  });
  if (!page) return <p>Could not load the home page layout.</p>;

  return (
    <Providers page={page}>
      <MeProbe />
    </Providers>
  );
}