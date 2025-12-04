/**
 * Type definitions for YouTube Enhanced Transcriber
 */

// ============================================================================
// Video & Search Types
// ============================================================================

export interface VideoInfo {
  id: string;
  title: string;
  channel: string;
  duration: number;
  viewCount?: number;
  publishedAt?: string;
  thumbnailUrl?: string;
}

export interface YouTubeSearchOptions {
  maxResults?: number;
  language?: string;
  regionCode?: string;
}

// ============================================================================
// Transcript Types
// ============================================================================

export type TranscriptSource = 'youtube_captions' | 'whisper' | 'deepgram' | 'failed';

export interface TranscriptResult {
  videoId: string;
  title?: string;
  transcript: string | null;
  source: TranscriptSource;
  language?: string;
  confidence?: number;
  duration?: number;
  error?: string;
  costEstimate?: number;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface ProcessedTranscript {
  fullText: string;
  segments: TranscriptSegment[];
  duration: number;
  language: string;
  keyMoments: KeyMoment[];
}

export interface KeyMoment {
  timestamp: number;
  topic: string;
  text: string;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface TranscriptionStats {
  total: number;
  successful: number;
  bySource: Record<TranscriptSource, number>;
  totalCost: number;
  processingTimeMs: number;
}

// ============================================================================
// Search Result Types
// ============================================================================

export interface YouTubeSearchResult {
  videos: VideoInfo[];
  transcripts: TranscriptResult[];
  stats: TranscriptionStats;
}

export interface BikeComparisonResult extends YouTubeSearchResult {
  bike1: string;
  bike2: string;
}

// ============================================================================
// Caption Types (Internal)
// ============================================================================

export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name: { simpleText: string };
  kind?: 'asr'; // 'asr' = auto-generated
  isTranslatable?: boolean;
}

export interface InnertubePlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
      audioTracks?: Array<{
        captionTrackIndices: number[];
      }>;
    };
  };
  videoDetails?: {
    videoId: string;
    title: string;
    lengthSeconds: string;
    channelId: string;
    shortDescription: string;
    viewCount: string;
  };
}

// ============================================================================
// API Response Types
// ============================================================================

export interface TranscribeAPIResponse {
  success: boolean;
  mode: 'batch' | 'comparison';
  videos?: VideoInfo[];
  transcripts: TranscriptResult[];
  stats: TranscriptionStats & {
    processingTimeMs: number;
  };
  bikes?: {
    bike1: string;
    bike2: string;
  };
}

export interface TranscribeAPIError {
  error: string;
  message: string;
  processingTimeMs: number;
}

export interface ServiceStatus {
  status: 'ok' | 'error';
  services: {
    youtubeCaptions: {
      enabled: boolean;
      note: string;
    };
    whisper: {
      enabled: boolean;
      configured: boolean;
      cost: string;
      note: string;
    };
    deepgram: {
      enabled: boolean;
      configured: boolean;
      cost: string;
      note: string;
    };
  };
  dependencies: {
    ytdlp: {
      available: boolean;
      version: string;
      note: string;
    };
    ffmpeg: {
      available: boolean;
      note: string;
    };
  };
  fallbackChain: string[];
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface TranscriberConfig {
  tempDir: string;
  maxVideoDuration: number;
  maxAudioFileSize: number;
  rateLimitDelay: number;
  maxRetries: number;
  retryBaseDelay: number;
  preferredLanguages: string[];
  concurrency: number;
  costs: {
    whisper: number;
    deepgram: number;
  };
  userAgent: string;
}

export interface TranscriberOptions {
  openaiApiKey?: string;
  deepgramApiKey?: string;
  enableWhisper?: boolean;
  enableDeepgram?: boolean;
  logger?: (message: string) => void;
  config?: Partial<TranscriberConfig>;
}

