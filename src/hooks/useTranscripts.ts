import { useQuery } from '@tanstack/react-query';

/**
 * Team radio transcripts, made by the scheduled "Transcribe team radio"
 * GitHub Action and published as one JSON file per session.
 */
const BASE =
  (import.meta.env.VITE_TRANSCRIPTS_BASE as string | undefined) ?? 'https://raw.githubusercontent.com/Sarthak125/Sarthak125/transcripts/radio';

export interface Transcript {
  text: string;
  status: 'ok' | 'no_speech' | 'error';
}

interface TranscriptFile {
  model?: string;
  clips: Record<string, Transcript>;
}

export function useTranscripts(sessionKey: number | undefined, live: boolean) {
  return useQuery({
    queryKey: ['transcripts', sessionKey],
    enabled: !!sessionKey,
    // Transcripts arrive in batches every 10 minutes or so while a session is on.
    refetchInterval: live ? 120_000 : false,
    staleTime: live ? 60_000 : 10 * 60_000,
    retry: false,
    queryFn: async (): Promise<TranscriptFile> => {
      const res = await fetch(`${BASE}/${sessionKey}.json`);
      if (res.status === 404) return { clips: {} };
      if (!res.ok) throw new Error(`Transcripts unavailable (${res.status})`);
      return (await res.json()) as TranscriptFile;
    },
  });
}
