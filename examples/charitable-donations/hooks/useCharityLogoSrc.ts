import { useEffect, useState } from 'react';
import { getCachedLogoSrc } from '../lib/logoCache.js';
import { resolveCharityLogoSrc } from '../lib/charityLogo.js';

export function useCharityLogoSrc(
  logoId: string | undefined,
  options?: { previewSrc?: string | null; fileName?: string }
): { src: string | null; loading: boolean } {
  const previewSrc = options?.previewSrc;
  const fileName = options?.fileName;
  const [src, setSrc] = useState<string | null>(previewSrc ?? null);
  const [loading, setLoading] = useState(Boolean(logoId && !previewSrc));

  useEffect(() => {
    if (previewSrc) {
      setSrc(previewSrc);
      setLoading(false);
      return;
    }

    if (!logoId) {
      setSrc(null);
      setLoading(false);
      return;
    }

    const cached = getCachedLogoSrc(logoId);
    if (cached) {
      setSrc(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void resolveCharityLogoSrc(logoId, fileName).then((resolved) => {
      if (cancelled) return;
      setSrc(resolved);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [logoId, previewSrc, fileName]);

  return { src, loading };
}
