import { useQuery } from '@tanstack/react-query';
import { commonsPage, getSummary } from '../api/wikipedia';

/**
 * "About" text and photo from Wikipedia for a driver, team or circuit, with credit. Renders nothing if the article
 * has no summary or Wikipedia cannot be reached, so it never gets in the way of the page.
 */
export function WikiAbout({ url, heading, photo = true, bare = false }: { url?: string; heading: string; photo?: boolean; bare?: boolean }) {
  const q = useQuery({ queryKey: ['wiki', url], enabled: !!url, staleTime: 24 * 3_600_000, retry: false, queryFn: ({ signal }) => getSummary(url!, signal) });
  const s = q.data;
  if (!s) return null;
  const page = s.content_urls?.desktop?.page ?? url;
  // Only photos from Wikimedia Commons, which are freely licensed; logos and other non-free images that Wikipedia
  // keeps under fair use are left out.
  const credit = photo && s.thumbnail ? commonsPage(s.thumbnail.source) : null;
  const img = credit ? s.thumbnail! : null;
  const body = (
    <div className="wiki">
      {img && (
        <figure className="wiki-photo">
          <img src={img.source} alt={s.title} loading="lazy" width={img.width} height={img.height} />
          <figcaption><a className="link" href={credit!} target="_blank" rel="noreferrer">Photo: Wikimedia Commons ↗</a></figcaption>
        </figure>
      )}
      <div style={{ minWidth: 0 }}>
        <p className="wiki-text">{s.extract}</p>
        <p className="faint" style={{ fontSize: 12, margin: '8px 0 0' }}>
          From <a className="link" style={{ display: 'inline' }} href={page} target="_blank" rel="noreferrer">Wikipedia ↗</a>, text under CC BY-SA 4.0. It may not include the latest results.
        </p>
      </div>
    </div>
  );
  if (bare) {
    return (
      <div style={{ marginTop: 16 }}>
        {/* The linked article can be the race rather than the circuit, so it is named by its own title. */}
        <h3 className="h2 sm" style={{ marginBottom: 8 }}>{heading.replace('{title}', s.title)}</h3>
        {body}
      </div>
    );
  }
  return (
    <section className="card" aria-labelledby={`wiki-${heading}`}>
      <h2 className="h2" id={`wiki-${heading}`}>{heading}</h2>
      {body}
    </section>
  );
}
