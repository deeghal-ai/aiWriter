/**
 * Enhanced YouTube Transcriber - Multi-Layer Transcription Strategy
 * 
 * Layer 1: YouTube's built-in captions via Innertube API (FREE)
 * Layer 2: OpenAI Whisper API (fallback, ~$0.006/min)
 * Layer 3: Deepgram Nova-2 (fallback, ~$0.0043/min, better Hindi support)
 * 
 * Features:
 * - Automatic retry with exponential backoff
 * - Audio chunking for files > 25MB
 * - Rate limiting protection
 * - Detailed logging and error reporting
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

export interface VideoInfo {
  id: string;
  title: string;
  channel: string;
  duration: number;
  viewCount?: number;
  publishedAt?: string;
}

export interface TranscriptResult {
  videoId: string;
  title?: string;
  transcript: string | null;
  source: 'youtube_captions' | 'whisper' | 'deepgram' | 'failed';
  language?: string;
  confidence?: number;
  duration?: number;
  error?: string;
  costEstimate?: number; // in USD
}

export interface TranscriptionStats {
  total: number;
  successful: number;
  bySource: {
    youtube_captions: number;
    whisper: number;
    deepgram: number;
    failed: number;
  };
  totalCost: number;
  processingTimeMs: number;
}

export interface YouTubeSearchResult {
  videos: VideoInfo[];
  transcripts: TranscriptResult[];
  stats: TranscriptionStats;
}

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name: { simpleText: string };
  kind?: string; // 'asr' for auto-generated
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  TEMP_DIR: path.join(process.cwd(), 'temp', 'youtube-audio'),
  MAX_VIDEO_DURATION: 30 * 60, // 30 minutes max
  MAX_AUDIO_FILE_SIZE: 25 * 1024 * 1024, // 25MB Whisper API limit
  RATE_LIMIT_DELAY: 1500, // 1.5 second between requests
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY: 2000, // 2 seconds base delay for retries
  PREFERRED_LANGUAGES: ['hi', 'en', 'en-IN', 'hi-IN', 'en-US'],
  CONCURRENCY: 2, // Process 2 videos at a time
  // Cost estimates per minute
  COSTS: {
    whisper: 0.006,
    deepgram: 0.0043,
  },
  // User agent for requests
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// ============================================================================
// Main Class
// ============================================================================

/**
 * Enhanced YouTube scraper with multi-layer transcript extraction
 */
export class EnhancedYouTubeScraper {
  private openaiApiKey?: string;
  private deepgramApiKey?: string;
  private enableWhisper: boolean;
  private enableDeepgram: boolean;
  private logger: (message: string) => void;

  constructor(options?: {
    openaiApiKey?: string;
    deepgramApiKey?: string;
    enableWhisper?: boolean;
    enableDeepgram?: boolean;
    logger?: (message: string) => void;
  }) {
    this.openaiApiKey = options?.openaiApiKey || process.env.OPENAI_API_KEY;
    this.deepgramApiKey = options?.deepgramApiKey || process.env.DEEPGRAM_API_KEY;
    this.enableWhisper = options?.enableWhisper ?? true;
    this.enableDeepgram = options?.enableDeepgram ?? true;
    this.logger = options?.logger || console.log;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Main entry point - search and transcribe videos for bike comparison
   */
  async scrapeForComparison(
    bike1: string,
    bike2: string,
    options?: { maxVideos?: number; includeIndividual?: boolean }
  ): Promise<YouTubeSearchResult> {
    const startTime = Date.now();
    const maxVideos = options?.maxVideos ?? 10;
    const includeIndividual = options?.includeIndividual ?? true;

    // Build search queries
    const searchQueries = [
      `${bike1} vs ${bike2} comparison review`,
      `${bike1} vs ${bike2} hindi`,
      `${bike2} vs ${bike1} comparison`,
    ];

    // Add individual bike queries if requested
    if (includeIndividual) {
      searchQueries.push(
        `${bike1} review India`,
        `${bike2} review India`,
        `${bike1} owner review long term`,
        `${bike2} owner review long term`
      );
    }

    const allVideoIds = new Set<string>();
    const videoInfoMap = new Map<string, VideoInfo>();

    // Search for videos
    for (const query of searchQueries) {
      try {
        this.log(`[Search] Querying: "${query}"`);
        const results = await this.searchYouTube(query, 5);
        
        results.forEach(video => {
          if (!allVideoIds.has(video.id) && video.duration <= CONFIG.MAX_VIDEO_DURATION) {
            allVideoIds.add(video.id);
            videoInfoMap.set(video.id, video);
          }
        });
        
        await this.delay(CONFIG.RATE_LIMIT_DELAY);
      } catch (error: any) {
        this.log(`[Search] ⚠️ Failed for "${query}": ${error.message}`);
      }
    }

    const videoIds = Array.from(allVideoIds).slice(0, maxVideos);
    this.log(`[YouTube] Found ${videoIds.length} unique videos to transcribe`);

    // Transcribe all videos
    const transcripts = await this.transcribeBatch(videoIds);

    // Calculate stats
    const stats = this.calculateStats(transcripts, Date.now() - startTime);

    return {
      videos: videoIds.map(id => videoInfoMap.get(id)!).filter(Boolean),
      transcripts,
      stats,
    };
  }

  /**
   * Transcribe a single video by ID
   */
  async transcribeSingle(videoId: string): Promise<TranscriptResult> {
    return this._transcribeSingle(videoId);
  }

  /**
   * Transcribe multiple videos with configurable concurrency
   */
  async transcribeBatch(
    videoIds: string[],
    options?: { concurrency?: number }
  ): Promise<TranscriptResult[]> {
    const concurrency = options?.concurrency ?? CONFIG.CONCURRENCY;
    const results: TranscriptResult[] = [];

    // Process in batches for controlled concurrency
    for (let i = 0; i < videoIds.length; i += concurrency) {
      const batch = videoIds.slice(i, i + concurrency);
      
      this.log(`[Batch] Processing videos ${i + 1}-${Math.min(i + concurrency, videoIds.length)} of ${videoIds.length}`);
      
      const batchResults = await Promise.all(
        batch.map(async (videoId) => {
          const result = await this._transcribeSingle(videoId);
          
          // Log result
          if (result.source !== 'failed') {
            const charCount = result.transcript?.length || 0;
            const cost = result.costEstimate ? `$${result.costEstimate.toFixed(4)}` : 'FREE';
            this.log(`[Transcribe] ✅ ${videoId} via ${result.source} (${charCount} chars) [${cost}]`);
          } else {
            this.log(`[Transcribe] ❌ ${videoId} failed: ${result.error}`);
          }
          
          return result;
        })
      );
      
      results.push(...batchResults);

      // Rate limiting between batches
      if (i + concurrency < videoIds.length) {
        await this.delay(CONFIG.RATE_LIMIT_DELAY);
      }
    }

    return results;
  }

  // ==========================================================================
  // Layer 1: YouTube Captions (FREE)
  // ==========================================================================

  /**
   * Fetch captions directly from YouTube's Innertube API
   */
  private async tryYouTubeCaptions(videoId: string): Promise<TranscriptResult> {
    const errors: string[] = [];

    for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
      try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Fetch video page with proper headers
        const response = await fetch(videoUrl, {
          headers: {
            'User-Agent': CONFIG.USER_AGENT,
            'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();

        // Extract Innertube API key
        const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
        if (!apiKeyMatch) {
          throw new Error('Could not find Innertube API key');
        }

        // Get player response with caption tracks
        const playerResponse = await this.fetchPlayerResponse(videoId, apiKeyMatch[1]);
        
        if (!playerResponse) {
          throw new Error('Invalid player response');
        }

        // Extract caption tracks
        const tracks: CaptionTrack[] = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        
        if (!tracks || tracks.length === 0) {
          return {
            videoId,
            transcript: null,
            source: 'failed',
            error: 'No captions available for this video',
          };
        }

        // Select best caption track (prefer manual over auto-generated)
        const selectedTrack = this.selectBestCaptionTrack(tracks);
        
        // Fetch and parse caption XML
        const transcript = await this.fetchCaptionXml(selectedTrack.baseUrl);
        
        if (!transcript || transcript.length < 50) {
          throw new Error('Caption content too short or empty');
        }

        return {
          videoId,
          transcript,
          source: 'youtube_captions',
          language: selectedTrack.languageCode,
          costEstimate: 0,
        };

      } catch (error: any) {
        errors.push(`Attempt ${attempt}: ${error.message}`);
        
        if (attempt < CONFIG.MAX_RETRIES) {
          const delay = CONFIG.RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
          await this.delay(delay);
        }
      }
    }

    return {
      videoId,
      transcript: null,
      source: 'failed',
      error: `YouTube captions failed: ${errors.join('; ')}`,
    };
  }

  private async fetchPlayerResponse(videoId: string, apiKey: string): Promise<any> {
    const response = await fetch(
      `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': CONFIG.USER_AGENT,
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20241201.00.00',
              hl: 'en',
              gl: 'IN',
              timeZone: 'Asia/Kolkata',
            },
          },
          videoId,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Player API error: ${response.status}`);
    }

    return response.json();
  }

  private selectBestCaptionTrack(tracks: CaptionTrack[]): CaptionTrack {
    // First, try to find manual captions in preferred languages
    for (const lang of CONFIG.PREFERRED_LANGUAGES) {
      const manual = tracks.find(t => t.languageCode === lang && t.kind !== 'asr');
      if (manual) return manual;
    }

    // Then try auto-generated in preferred languages
    for (const lang of CONFIG.PREFERRED_LANGUAGES) {
      const auto = tracks.find(t => t.languageCode === lang);
      if (auto) return auto;
    }

    // Fall back to first available
    return tracks[0];
  }

  private async fetchCaptionXml(baseUrl: string): Promise<string> {
    const response = await fetch(baseUrl, {
      headers: {
        'User-Agent': CONFIG.USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Caption fetch failed: ${response.status}`);
    }

    const xml = await response.text();
    this.log(`[Captions] Fetched XML: ${xml.length} chars`);
    
    const transcript = this.parseTranscriptXml(xml);
    this.log(`[Captions] Parsed transcript: ${transcript.length} chars`);
    
    // Log first 200 chars for debugging
    if (transcript.length > 0) {
      this.log(`[Captions] Preview: "${transcript.substring(0, 200)}..."`);
    }
    
    return transcript;
  }

  private parseTranscriptXml(xml: string): string {
    // Try multiple XML formats that YouTube uses
    
    // Log XML format detection
    const hasTextTags = xml.includes('<text');
    const hasPTags = xml.includes('<p t=');
    const hasWireMagic = xml.includes('wireMagic');
    this.log(`[Captions] XML format detection - text tags: ${hasTextTags}, p tags: ${hasPTags}, JSON: ${hasWireMagic}`);

    // Format 1: <text start="X" dur="Y">content</text>
    // Also handle: <text start="X" dur="Y" ...>content</text>
    let matches = [...xml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)];
    
    if (matches.length > 0) {
      this.log(`[Captions] Found ${matches.length} text segments (format 1)`);
      const result = matches
        .map(m => this.decodeHtmlEntities(m[1]))
        .filter(t => t.trim().length > 0)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      return result;
    }

    // Format 2: <p t="X" d="Y">content</p>
    matches = [...xml.matchAll(/<p[^>]*>([^<]*)<\/p>/g)];
    
    if (matches.length > 0) {
      this.log(`[Captions] Found ${matches.length} p segments (format 2)`);
      const result = matches
        .map(m => this.decodeHtmlEntities(m[1]))
        .filter(t => t.trim().length > 0)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      return result;
    }

    // Format 3: JSON3 format (for newer YouTube responses)
    try {
      const jsonMatch = xml.match(/\{"wireMagic".*\}/s); // 's' flag for dotall
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.events) {
          this.log(`[Captions] Found JSON3 format with ${data.events.length} events`);
          const texts = data.events
            .filter((e: any) => e.segs)
            .flatMap((e: any) => e.segs.map((s: any) => s.utf8 || ''))
            .filter((t: string) => t.trim().length > 0);
          return texts.join(' ').replace(/\s+/g, ' ').trim();
        }
      }
    } catch (e: any) {
      this.log(`[Captions] JSON3 parse failed: ${e.message}`);
    }
    
    // Format 4: Try extracting any text content between tags
    const fallbackMatches = [...xml.matchAll(/>([^<]+)</g)];
    if (fallbackMatches.length > 0) {
      const texts = fallbackMatches
        .map(m => this.decodeHtmlEntities(m[1]))
        .filter(t => t.trim().length > 3 && !/^\d+$/.test(t.trim())); // Filter out numbers
      if (texts.length > 10) {
        this.log(`[Captions] Used fallback extraction: ${texts.length} segments`);
        return texts.join(' ').replace(/\s+/g, ' ').trim();
      }
    }

    this.log(`[Captions] ⚠️ No matching format found in XML`);
    // Log a sample of the XML for debugging
    this.log(`[Captions] XML sample: ${xml.substring(0, 500)}`);
    
    return '';
  }

  // ==========================================================================
  // Layer 2: OpenAI Whisper API
  // ==========================================================================

  private async tryWhisperTranscription(videoId: string): Promise<TranscriptResult> {
    if (!this.openaiApiKey || !this.enableWhisper) {
      return {
        videoId,
        transcript: null,
        source: 'failed',
        error: 'Whisper not configured or disabled',
      };
    }

    let audioPath: string | null = null;

    try {
      // Ensure temp directory exists
      await fs.mkdir(CONFIG.TEMP_DIR, { recursive: true });

      // Download audio
      audioPath = await this.downloadAudio(videoId);
      
      if (!audioPath) {
        return {
          videoId,
          transcript: null,
          source: 'failed',
          error: 'Audio download failed - could not download audio from YouTube',
        };
      }

      // Check file size
      const stats = await fs.stat(audioPath);
      const fileSizeMB = stats.size / (1024 * 1024);
      this.log(`[Whisper] Audio downloaded: ${fileSizeMB.toFixed(2)}MB for ${videoId}`);
      
      // Skip audio files < 500KB - likely shorts/music-only videos
      // Pattern: 0.37MB → 18 chars, 0.07MB → 4 chars (music-only content)
      if (stats.size < 500 * 1024) { // Less than 500KB
        this.log(`[Whisper] ⚠️ Audio too small (${fileSizeMB.toFixed(2)}MB), skipping - likely music/shorts video`);
        return {
          videoId,
          transcript: null,
          source: 'failed',
          error: 'Audio too small - likely music/shorts video',
        };
      }

      // Handle large files by chunking
      if (stats.size > CONFIG.MAX_AUDIO_FILE_SIZE) {
        this.log(`[Whisper] File too large (${fileSizeMB.toFixed(2)}MB), chunking audio for ${videoId}...`);
        return await this.transcribeWithChunking(videoId, audioPath, 'whisper');
      }

      // Transcribe with Whisper
      this.log(`[Whisper] Starting transcription for ${videoId}...`);
      const transcript = await this.callWhisperApi(audioPath);
      
      // Estimate cost based on file duration (rough estimate: 1MB ≈ 1 min for mp3)
      const durationMinutes = fileSizeMB; // rough estimate
      const cost = durationMinutes * CONFIG.COSTS.whisper;

      return {
        videoId,
        transcript,
        source: 'whisper',
        costEstimate: cost,
      };

    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      this.log(`[Whisper] ❌ Error for ${videoId}: ${errorMessage}`);
      return {
        videoId,
        transcript: null,
        source: 'failed',
        error: `Whisper failed: ${errorMessage}`,
      };
    }
    // Note: Audio cleanup is handled centrally in _transcribeSingle to allow Deepgram reuse
  }

  private async callWhisperApi(audioPath: string): Promise<string> {
    const audioBuffer = await fs.readFile(audioPath);
    const filename = path.basename(audioPath);
    
    this.log(`[Whisper] Sending ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB to Whisper API...`);

    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: 'audio/mpeg' }), filename);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');
    // Let Whisper auto-detect language for better Hindi/Hinglish support

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openaiApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.log(`[Whisper] API error response: ${errorText}`);
      throw new Error(`Whisper API error ${response.status}: ${errorText}`);
    }

    const transcript = await response.text();
    this.log(`[Whisper] Got transcript: ${transcript.length} chars`);
    
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Whisper returned empty transcript');
    }
    
    // Whisper returns text that's too short - likely a music-only video
    if (transcript.trim().length < 50) {
      this.log(`[Whisper] Transcript too short (${transcript.trim().length} chars), likely music-only video`);
      throw new Error(`Transcript too short (${transcript.trim().length} chars) - likely music/sound-only video`);
    }
    
    return transcript.trim();
  }

  // ==========================================================================
  // Layer 3: Deepgram Nova-2 API
  // ==========================================================================

  private async tryDeepgramTranscription(videoId: string): Promise<TranscriptResult> {
    if (!this.deepgramApiKey || !this.enableDeepgram) {
      return {
        videoId,
        transcript: null,
        source: 'failed',
        error: 'Deepgram not configured or disabled',
      };
    }

    let audioPath: string | null = null;

    try {
      // Ensure temp directory exists
      await fs.mkdir(CONFIG.TEMP_DIR, { recursive: true });

      // Check if audio already exists (might be downloaded by Whisper attempt)
      const potentialPath = path.join(CONFIG.TEMP_DIR, `${videoId}.mp3`);
      try {
        await fs.access(potentialPath);
        audioPath = potentialPath;
        this.log(`[Deepgram] Reusing existing audio for ${videoId}`);
      } catch {
        audioPath = await this.downloadAudio(videoId);
      }

      if (!audioPath) {
        return {
          videoId,
          transcript: null,
          source: 'failed',
          error: 'Audio download failed',
        };
      }

      // Check file size
      const stats = await fs.stat(audioPath);
      const fileSizeMB = stats.size / (1024 * 1024);
      this.log(`[Deepgram] Audio ready: ${fileSizeMB.toFixed(2)}MB for ${videoId}`);

      // Deepgram has higher limits, but chunk if very large (>100MB)
      if (stats.size > 100 * 1024 * 1024) {
        this.log(`[Deepgram] File very large, chunking audio for ${videoId}...`);
        return await this.transcribeWithChunking(videoId, audioPath, 'deepgram');
      }

      // Transcribe with Deepgram
      const result = await this.callDeepgramApi(audioPath);
      
      // Estimate cost
      const durationMinutes = fileSizeMB;
      const cost = durationMinutes * CONFIG.COSTS.deepgram;

      return {
        videoId,
        transcript: result.transcript,
        source: 'deepgram',
        language: result.language,
        confidence: result.confidence,
        costEstimate: cost,
      };

    } catch (error: any) {
      return {
        videoId,
        transcript: null,
        source: 'failed',
        error: `Deepgram failed: ${error.message}`,
      };
    }
    // Note: Audio cleanup is handled centrally in _transcribeSingle
  }

  private async callDeepgramApi(audioPath: string): Promise<{
    transcript: string;
    language?: string;
    confidence?: number;
  }> {
    const audioBuffer = await fs.readFile(audioPath);
    
    this.log(`[Deepgram] Sending ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB to Deepgram API...`);

    // Deepgram API with Nova-2 model and language detection
    const params = new URLSearchParams({
      model: 'nova-2',
      detect_language: 'true',
      punctuate: 'true',
      smart_format: 'true',
      paragraphs: 'true',
    });

    const response = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.deepgramApiKey}`,
        'Content-Type': 'audio/mpeg',
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.log(`[Deepgram] API error response: ${errorText}`);
      throw new Error(`Deepgram API error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    this.log(`[Deepgram] Response structure: ${JSON.stringify(Object.keys(result))}`);
    
    const channel = result.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];

    if (!alternative?.transcript) {
      this.log(`[Deepgram] Response had no transcript. Full response: ${JSON.stringify(result).substring(0, 500)}`);
      throw new Error('No transcript in Deepgram response');
    }

    this.log(`[Deepgram] Got transcript: ${alternative.transcript.length} chars, language: ${channel?.detected_language}, confidence: ${alternative.confidence}`);

    return {
      transcript: alternative.transcript,
      language: channel?.detected_language,
      confidence: alternative.confidence,
    };
  }

  // ==========================================================================
  // Audio Handling
  // ==========================================================================

  private async downloadAudio(videoId: string): Promise<string | null> {
    const audioPath = path.join(CONFIG.TEMP_DIR, `${videoId}.mp3`);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
      this.log(`[Audio] Downloading audio for ${videoId}...`);
      
      // Delete existing file if present to avoid issues
      await fs.unlink(audioPath).catch(() => {});
      
      // Use yt-dlp to download audio only
      // -f bestaudio = get best audio quality
      // --extract-audio = extract audio from video
      // --audio-format mp3 = convert to mp3
      // --audio-quality 0 = best quality (0-9, lower is better)
      // --postprocessor-args = ensure proper encoding
      const command = `yt-dlp -f "bestaudio[ext=m4a]/bestaudio/best" --extract-audio --audio-format mp3 --audio-quality 0 -o "${audioPath}" "${videoUrl}" --no-playlist --no-warnings --socket-timeout 60 --retries 3`;
      
      this.log(`[Audio] Running: yt-dlp for ${videoId}`);
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000, // 5 minute timeout for longer videos
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      });
      
      if (stderr && stderr.length > 0) {
        this.log(`[Audio] yt-dlp stderr: ${stderr.substring(0, 500)}`);
      }

      // Verify file exists and check size
      const stats = await fs.stat(audioPath);
      const sizeMB = stats.size / (1024 * 1024);
      
      this.log(`[Audio] Downloaded ${sizeMB.toFixed(2)}MB for ${videoId}`);
      
      // Sanity check - audio should be at least 100KB for any real video
      if (stats.size < 100 * 1024) {
        this.log(`[Audio] ⚠️ File suspiciously small (${stats.size} bytes), might be corrupted`);
        // Try alternate format
        const altPath = await this.downloadAudioAlternate(videoId);
        if (altPath) return altPath;
      }
      
      return audioPath;

    } catch (error: any) {
      this.log(`[Audio] ❌ Download failed for ${videoId}: ${error.message}`);
      if (error.stderr) {
        this.log(`[Audio] stderr: ${error.stderr.substring(0, 500)}`);
      }
      
      // Cleanup partial file if exists
      await fs.unlink(audioPath).catch(() => {});
      
      return null;
    }
  }
  
  /**
   * Alternate download method using different format selection
   */
  private async downloadAudioAlternate(videoId: string): Promise<string | null> {
    const audioPath = path.join(CONFIG.TEMP_DIR, `${videoId}_alt.mp3`);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    try {
      this.log(`[Audio] Trying alternate download method for ${videoId}...`);
      
      // Try downloading video and extracting audio (more reliable for some videos)
      const command = `yt-dlp -f "best[height<=480]" --extract-audio --audio-format mp3 -o "${audioPath}" "${videoUrl}" --no-playlist --socket-timeout 60`;
      
      await execAsync(command, {
        timeout: 300000,
        maxBuffer: 50 * 1024 * 1024,
      });
      
      const stats = await fs.stat(audioPath);
      this.log(`[Audio] Alternate method got ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
      
      if (stats.size > 100 * 1024) {
        return audioPath;
      }
      
      await fs.unlink(audioPath).catch(() => {});
      return null;
      
    } catch (error: any) {
      this.log(`[Audio] Alternate method also failed: ${error.message}`);
      await fs.unlink(audioPath).catch(() => {});
      return null;
    }
  }

  /**
   * Handle large audio files by splitting and transcribing in chunks
   */
  private async transcribeWithChunking(
    videoId: string,
    audioPath: string,
    service: 'whisper' | 'deepgram'
  ): Promise<TranscriptResult> {
    try {
      // Split audio into 10-minute chunks using ffmpeg
      const chunkPrefix = path.join(CONFIG.TEMP_DIR, `${videoId}_chunk`);
      
      await execAsync(
        `ffmpeg -i "${audioPath}" -f segment -segment_time 600 -c copy "${chunkPrefix}_%03d.mp3" -y`,
        { timeout: 120000 }
      );

      // Find all chunks
      const tempFiles = await fs.readdir(CONFIG.TEMP_DIR);
      const chunks = tempFiles
        .filter(f => f.startsWith(`${videoId}_chunk`) && f.endsWith('.mp3'))
        .sort();

      if (chunks.length === 0) {
        throw new Error('No audio chunks created');
      }

      this.log(`[Chunking] Created ${chunks.length} chunks for ${videoId}`);

      // Transcribe each chunk
      const transcriptParts: string[] = [];
      let totalCost = 0;

      for (const chunk of chunks) {
        const chunkPath = path.join(CONFIG.TEMP_DIR, chunk);
        
        let result: string;
        const stats = await fs.stat(chunkPath);
        const durationMinutes = stats.size / (1024 * 1024);

        if (service === 'whisper') {
          result = await this.callWhisperApi(chunkPath);
          totalCost += durationMinutes * CONFIG.COSTS.whisper;
        } else {
          const deepgramResult = await this.callDeepgramApi(chunkPath);
          result = deepgramResult.transcript;
          totalCost += durationMinutes * CONFIG.COSTS.deepgram;
        }

        transcriptParts.push(result);
        
        // Cleanup chunk
        await fs.unlink(chunkPath).catch(() => {});
      }

      const fullTranscript = transcriptParts.join(' ').replace(/\s+/g, ' ').trim();

      return {
        videoId,
        transcript: fullTranscript,
        source: service,
        costEstimate: totalCost,
      };

    } catch (error: any) {
      // Cleanup any remaining chunks
      try {
        const tempFiles = await fs.readdir(CONFIG.TEMP_DIR);
        for (const f of tempFiles) {
          if (f.startsWith(`${videoId}_chunk`)) {
            await fs.unlink(path.join(CONFIG.TEMP_DIR, f)).catch(() => {});
          }
        }
      } catch {}

      return {
        videoId,
        transcript: null,
        source: 'failed',
        error: `Chunked transcription failed: ${error.message}`,
      };
    }
  }

  // ==========================================================================
  // Search
  // ==========================================================================

  /**
   * Search YouTube using yt-dlp (no API key needed)
   */
  private async searchYouTube(query: string, maxResults: number = 5): Promise<VideoInfo[]> {
    try {
      // Escape quotes in query
      const escapedQuery = query.replace(/"/g, '\\"');
      
      const { stdout } = await execAsync(
        `yt-dlp "ytsearch${maxResults}:${escapedQuery}" --dump-json --flat-playlist --no-warnings --socket-timeout 20`,
        { timeout: 45000, maxBuffer: 5 * 1024 * 1024 }
      );

      const videos: VideoInfo[] = [];
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const data = JSON.parse(line);
          videos.push({
            id: data.id,
            title: data.title || 'Unknown',
            channel: data.channel || data.uploader || 'Unknown',
            duration: data.duration || 0,
            viewCount: data.view_count,
            publishedAt: data.upload_date,
          });
        } catch {
          // Skip malformed JSON lines
        }
      }

      return videos;
    } catch (error: any) {
      this.log(`[Search] ❌ Error: ${error.message}`);
      return [];
    }
  }

  // ==========================================================================
  // Core Transcription Logic
  // ==========================================================================

  private async _transcribeSingle(videoId: string): Promise<TranscriptResult> {
    this.log(`[Transcribe] Starting ${videoId}...`);

    try {
      // Layer 1: Try YouTube captions first (FREE)
      const captionResult = await this.tryYouTubeCaptions(videoId);
      if (captionResult.transcript && captionResult.transcript.length > 100) {
        return captionResult;
      }

      const captionError = captionResult.error || 'No usable captions';
      this.log(`[Transcribe] YouTube captions unavailable for ${videoId}: ${captionError}`);

      // Layer 2: Try Whisper API (if configured)
      if (this.openaiApiKey && this.enableWhisper) {
        this.log(`[Transcribe] Trying Whisper for ${videoId}...`);
        const whisperResult = await this.tryWhisperTranscription(videoId);
        if (whisperResult.transcript && whisperResult.transcript.length > 100) {
          return whisperResult;
        }
        this.log(`[Transcribe] Whisper failed for ${videoId}: ${whisperResult.error}`);
      }

      // Layer 3: Try Deepgram API (if configured)
      if (this.deepgramApiKey && this.enableDeepgram) {
        this.log(`[Transcribe] Trying Deepgram for ${videoId}...`);
        const deepgramResult = await this.tryDeepgramTranscription(videoId);
        if (deepgramResult.transcript && deepgramResult.transcript.length > 100) {
          return deepgramResult;
        }
        this.log(`[Transcribe] Deepgram failed for ${videoId}: ${deepgramResult.error}`);
      }

      // All methods failed
      return {
        videoId,
        transcript: null,
        source: 'failed',
        error: `All transcription methods failed. Caption: ${captionError}`,
      };
    } finally {
      // Centralized audio cleanup - runs after ALL transcription attempts
      // This allows Deepgram to reuse audio downloaded by Whisper
      const audioPath = path.join(CONFIG.TEMP_DIR, `${videoId}.mp3`);
      const altAudioPath = path.join(CONFIG.TEMP_DIR, `${videoId}_alt.mp3`);
      await fs.unlink(audioPath).catch(() => {});
      await fs.unlink(altAudioPath).catch(() => {});
    }
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
      .replace(/\\n/g, ' ')
      .replace(/\n/g, ' ');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(message: string): void {
    this.logger(message);
  }

  private calculateStats(
    transcripts: TranscriptResult[],
    processingTimeMs: number
  ): TranscriptionStats {
    const stats: TranscriptionStats = {
      total: transcripts.length,
      successful: 0,
      bySource: {
        youtube_captions: 0,
        whisper: 0,
        deepgram: 0,
        failed: 0,
      },
      totalCost: 0,
      processingTimeMs,
    };

    for (const t of transcripts) {
      stats.bySource[t.source]++;
      if (t.source !== 'failed') {
        stats.successful++;
      }
      if (t.costEstimate) {
        stats.totalCost += t.costEstimate;
      }
    }

    return stats;
  }

  /**
   * Cleanup temp directory
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(CONFIG.TEMP_DIR, { recursive: true, force: true });
      this.log('[Cleanup] Temp directory cleared');
    } catch {
      // Ignore cleanup errors
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

// Export singleton instance for easy use
export const youtubeTranscriber = new EnhancedYouTubeScraper();

// Export config for external use
export { CONFIG as YOUTUBE_TRANSCRIBER_CONFIG };

// Usage examples:
// 
// 1. Simple transcription:
//    const result = await youtubeTranscriber.transcribeSingle('videoId');
//
// 2. Batch transcription:
//    const results = await youtubeTranscriber.transcribeBatch(['id1', 'id2', 'id3']);
//
// 3. Full comparison scrape:
//    const results = await youtubeTranscriber.scrapeForComparison('Royal Enfield Guerrilla 450', 'Triumph Speed 400');
//
// 4. Custom instance with specific keys:
//    const scraper = new EnhancedYouTubeScraper({
//      openaiApiKey: 'sk-...',
//      deepgramApiKey: '...',
//      enableWhisper: true,
//      enableDeepgram: true,
//    });
