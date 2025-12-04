// Enhanced YouTube Transcriber - Ready to use implementation
// Save this as: src/lib/scrapers/youtube-enhanced.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Types
interface VideoInfo {
  id: string;
  title: string;
  channel: string;
  duration: number;
}

interface TranscriptResult {
  videoId: string;
  title?: string;
  transcript: string | null;
  source: 'youtube_captions' | 'whisper' | 'deepgram' | 'failed';
  language?: string;
  error?: string;
}

interface YouTubeSearchResult {
  videos: VideoInfo[];
  transcripts: TranscriptResult[];
}

// Configuration
const CONFIG = {
  TEMP_DIR: path.join(process.cwd(), 'temp', 'youtube'),
  MAX_VIDEO_DURATION: 20 * 60, // 20 minutes max
  RATE_LIMIT_DELAY: 1000, // 1 second between requests
  PREFERRED_LANGUAGES: ['hi', 'en', 'en-IN', 'hi-IN'],
};

/**
 * Enhanced YouTube scraper with multi-layer transcript extraction
 */
export class EnhancedYouTubeScraper {
  private openaiApiKey?: string;
  private deepgramApiKey?: string;

  constructor(options?: { openaiApiKey?: string; deepgramApiKey?: string }) {
    this.openaiApiKey = options?.openaiApiKey || process.env.OPENAI_API_KEY;
    this.deepgramApiKey = options?.deepgramApiKey || process.env.DEEPGRAM_API_KEY;
  }

  /**
   * Main entry point - search and transcribe videos for bike comparison
   */
  async scrapeForComparison(bike1: string, bike2: string): Promise<YouTubeSearchResult> {
    // Search queries for comparison videos
    const searchQueries = [
      `${bike1} vs ${bike2} review`,
      `${bike1} vs ${bike2} comparison`,
      `${bike1} review India`,
      `${bike2} review India`,
      `${bike1} ownership review`,
      `${bike2} ownership review`,
    ];

    const allVideoIds: Set<string> = new Set();
    const videoInfoMap: Map<string, VideoInfo> = new Map();

    // Search for videos
    for (const query of searchQueries) {
      try {
        const results = await this.searchYouTube(query, 5);
        results.forEach(video => {
          if (!allVideoIds.has(video.id) && video.duration <= CONFIG.MAX_VIDEO_DURATION) {
            allVideoIds.add(video.id);
            videoInfoMap.set(video.id, video);
          }
        });
      } catch (error) {
        console.log(`[Search] Failed for "${query}":`, error);
      }
      await this.delay(CONFIG.RATE_LIMIT_DELAY);
    }

    const videoIds = Array.from(allVideoIds).slice(0, 10); // Limit to 10 videos
    console.log(`[YouTube] Found ${videoIds.length} unique videos to transcribe`);

    // Transcribe all videos
    const transcripts = await this.transcribeBatch(videoIds);

    return {
      videos: videoIds.map(id => videoInfoMap.get(id)!).filter(Boolean),
      transcripts,
    };
  }

  /**
   * Search YouTube using yt-dlp (no API key needed)
   */
  private async searchYouTube(query: string, maxResults: number = 5): Promise<VideoInfo[]> {
    try {
      const { stdout } = await execAsync(
        `yt-dlp "ytsearch${maxResults}:${query}" --dump-json --flat-playlist --no-warnings`,
        { timeout: 30000 }
      );

      const videos: VideoInfo[] = [];
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          videos.push({
            id: data.id,
            title: data.title,
            channel: data.channel || data.uploader || 'Unknown',
            duration: data.duration || 0,
          });
        } catch {
          // Skip malformed JSON
        }
      }

      return videos;
    } catch (error) {
      console.error(`[Search] Error searching YouTube:`, error);
      return [];
    }
  }

  /**
   * Transcribe multiple videos with fallback layers
   */
  async transcribeBatch(videoIds: string[]): Promise<TranscriptResult[]> {
    const results: TranscriptResult[] = [];

    for (const videoId of videoIds) {
      console.log(`[Transcribe] Processing ${videoId}...`);
      const result = await this.transcribeSingle(videoId);
      results.push(result);

      // Log success/failure
      if (result.source !== 'failed') {
        console.log(`[Transcribe] ✓ ${videoId} via ${result.source} (${result.transcript?.length || 0} chars)`);
      } else {
        console.log(`[Transcribe] ✗ ${videoId} failed: ${result.error}`);
      }

      await this.delay(CONFIG.RATE_LIMIT_DELAY);
    }

    return results;
  }

  /**
   * Single video transcription with fallback layers
   */
  private async transcribeSingle(videoId: string): Promise<TranscriptResult> {
    // Layer 1: Try YouTube's built-in captions (FREE)
    const captionResult = await this.tryYouTubeCaptions(videoId);
    if (captionResult.transcript) {
      return captionResult;
    }

    // Layer 2: Try audio download + Whisper API (if configured)
    if (this.openaiApiKey) {
      const whisperResult = await this.tryWhisperTranscription(videoId);
      if (whisperResult.transcript) {
        return whisperResult;
      }
    }

    // Layer 3: Try Deepgram (if configured)
    if (this.deepgramApiKey) {
      const deepgramResult = await this.tryDeepgramTranscription(videoId);
      if (deepgramResult.transcript) {
        return deepgramResult;
      }
    }

    // All methods failed
    return {
      videoId,
      transcript: null,
      source: 'failed',
      error: captionResult.error || 'All transcription methods failed',
    };
  }

  /**
   * Layer 1: YouTube's built-in captions via Innertube API
   */
  private async tryYouTubeCaptions(videoId: string): Promise<TranscriptResult> {
    try {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // Get page HTML to extract API key
      const response = await fetch(videoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
        },
      });
      const html = await response.text();

      // Extract Innertube API key
      const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
      if (!apiKeyMatch) {
        return { videoId, transcript: null, source: 'failed', error: 'No API key found' };
      }

      // Get player response
      const playerResponse = await fetch(
        `https://www.youtube.com/youtubei/v1/player?key=${apiKeyMatch[1]}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: {
              client: {
                clientName: 'WEB',
                clientVersion: '2.20240101.00.00',
                hl: 'en',
                gl: 'IN',
              },
            },
            videoId,
          }),
        }
      ).then(res => res.json());

      // Check for captions
      const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!tracks || tracks.length === 0) {
        return { videoId, transcript: null, source: 'failed', error: 'No captions available' };
      }

      // Find best language track
      let selectedTrack = tracks[0];
      for (const lang of CONFIG.PREFERRED_LANGUAGES) {
        const match = tracks.find((t: any) => t.languageCode === lang);
        if (match) {
          selectedTrack = match;
          break;
        }
      }

      // Fetch caption XML
      const captionUrl = selectedTrack.baseUrl;
      const xmlResponse = await fetch(captionUrl);
      const xml = await xmlResponse.text();

      // Parse transcript from XML
      const textMatches = [...xml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)];
      if (textMatches.length === 0) {
        return { videoId, transcript: null, source: 'failed', error: 'Failed to parse captions' };
      }

      const transcript = textMatches
        .map(match => this.decodeHtmlEntities(match[1]))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        videoId,
        transcript,
        source: 'youtube_captions',
        language: selectedTrack.languageCode,
      };
    } catch (error: any) {
      return {
        videoId,
        transcript: null,
        source: 'failed',
        error: `Caption extraction failed: ${error.message}`,
      };
    }
  }

  /**
   * Layer 2: Download audio + OpenAI Whisper API
   */
  private async tryWhisperTranscription(videoId: string): Promise<TranscriptResult> {
    if (!this.openaiApiKey) {
      return { videoId, transcript: null, source: 'failed', error: 'No OpenAI API key' };
    }

    try {
      await fs.mkdir(CONFIG.TEMP_DIR, { recursive: true });
      const audioPath = path.join(CONFIG.TEMP_DIR, `${videoId}.mp3`);
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // Download audio only (much faster than full video)
      console.log(`[Whisper] Downloading audio for ${videoId}...`);
      await execAsync(
        `yt-dlp -x --audio-format mp3 --audio-quality 5 -o "${audioPath}" "${videoUrl}" --no-warnings`,
        { timeout: 120000 }
      );

      // Check file exists and size
      const stats = await fs.stat(audioPath);
      console.log(`[Whisper] Audio downloaded: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);

      if (stats.size > 25 * 1024 * 1024) {
        await fs.unlink(audioPath);
        return { videoId, transcript: null, source: 'failed', error: 'Audio file too large (>25MB)' };
      }

      // Read file as buffer and create form data
      const audioBuffer = await fs.readFile(audioPath);
      const formData = new FormData();
      formData.append('file', new Blob([audioBuffer], { type: 'audio/mp3' }), `${videoId}.mp3`);
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'text');

      console.log(`[Whisper] Transcribing ${videoId}...`);
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Whisper API error: ${error}`);
      }

      const transcript = await response.text();

      // Cleanup
      await fs.unlink(audioPath).catch(() => {});

      return {
        videoId,
        transcript,
        source: 'whisper',
      };
    } catch (error: any) {
      return {
        videoId,
        transcript: null,
        source: 'failed',
        error: `Whisper failed: ${error.message}`,
      };
    }
  }

  /**
   * Layer 3: Deepgram API (better for Hindi)
   */
  private async tryDeepgramTranscription(videoId: string): Promise<TranscriptResult> {
    if (!this.deepgramApiKey) {
      return { videoId, transcript: null, source: 'failed', error: 'No Deepgram API key' };
    }

    try {
      await fs.mkdir(CONFIG.TEMP_DIR, { recursive: true });
      const audioPath = path.join(CONFIG.TEMP_DIR, `${videoId}.mp3`);
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // Download audio if not already present
      try {
        await fs.access(audioPath);
      } catch {
        await execAsync(
          `yt-dlp -x --audio-format mp3 --audio-quality 5 -o "${audioPath}" "${videoUrl}" --no-warnings`,
          { timeout: 120000 }
        );
      }

      // Read audio file
      const audioBuffer = await fs.readFile(audioPath);

      console.log(`[Deepgram] Transcribing ${videoId}...`);
      const response = await fetch(
        'https://api.deepgram.com/v1/listen?model=nova-2&detect_language=true&punctuate=true',
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${this.deepgramApiKey}`,
            'Content-Type': 'audio/mp3',
          },
          body: audioBuffer,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Deepgram API error: ${error}`);
      }

      const result = await response.json();
      const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;

      // Cleanup
      await fs.unlink(audioPath).catch(() => {});

      if (!transcript) {
        return { videoId, transcript: null, source: 'failed', error: 'No transcript in Deepgram response' };
      }

      return {
        videoId,
        transcript,
        source: 'deepgram',
        language: result.results?.channels?.[0]?.detected_language,
      };
    } catch (error: any) {
      return {
        videoId,
        transcript: null,
        source: 'failed',
        error: `Deepgram failed: ${error.message}`,
      };
    }
  }

  /**
   * Utility: Decode HTML entities
   */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
  }

  /**
   * Utility: Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export a singleton for easy use
export const youtubeTranscriber = new EnhancedYouTubeScraper();

// Usage example:
// const results = await youtubeTranscriber.scrapeForComparison('Royal Enfield Guerrilla 450', 'Triumph Speed 400');
