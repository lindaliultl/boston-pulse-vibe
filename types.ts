
export interface NewsExcerpt {
  id: string;
  source: string;
  sourceKey: string;
  title: string;
  excerpt: string; // Original RSS fallback
  editorialExcerpt: string; // The high-quality, validated text
  link: string;
  pubDate: string;
  extractionMethod?: string;
  paragraphCount?: number;
  isFromCache?: boolean;
}

export type FeedStatus = 'direct' | 'gateway' | 'failed' | 'pending';

export interface FeedDiagnostic {
  name: string;
  status: FeedStatus;
  error?: string;
  itemCount: number;
}

export interface AppSettings {
  voiceName: string;
  useGemini: boolean;
  playbackRate: number;
}

export type PlaybackState = 'IDLE' | 'PLAYING' | 'PAUSED' | 'FINISHED';
