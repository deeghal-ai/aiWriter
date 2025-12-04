# YouTube Scraping Strategy: A Comprehensive Guide

## Problem Analysis

Your current scraper is showing these errors:
```
[Transcript] ⚠️ Could not parse transcript XML for IQSNSltXmG0
[Transcript] ⚠️ Transcript disabled for ByzXAMMjYzU
[Transcript] ⚠️ No captions found in page for ByzXAMMjYzU
```

**Root Causes:**
1. **No captions available** - Many Indian bike review videos are in Hindi/Hinglish without auto-generated captions
2. **XML parsing failures** - YouTube's transcript format changes frequently
3. **Caption disabled by uploader** - Some channels disable caption extraction
4. **Rate limiting** - Too many requests triggering YouTube blocks

---

## Recommended Multi-Layer Strategy

### Layer 1: YouTube Transcript API (Primary - Free)

**Best Library: `youtube-transcript-api`** (Python)

```python
# pip install youtube-transcript-api

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter

def get_transcript(video_id, languages=['en', 'hi', 'en-IN']):
    """
    Attempts to get transcript with fallback languages
    """
    try:
        # Try multiple language codes
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        # Priority: Manual > Auto-generated
        try:
            transcript = transcript_list.find_manually_created_transcript(languages)
        except:
            transcript = transcript_list.find_generated_transcript(languages)
        
        # Get the actual text
        formatter = TextFormatter()
        return formatter.format_transcript(transcript.fetch())
        
    except Exception as e:
        return None, str(e)
```

**For Node.js, use the Innertube API directly:**

```javascript
// This is the 2025 approach that works when libraries fail
const fetch = require('node-fetch');
const { parseStringPromise } = require('xml2js');

async function getYoutubeTranscript(videoId, lang = 'en') {
  // Step 1: Get Innertube API key from video page
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const html = await fetch(videoUrl).then(res => res.text());
  
  const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  if (!apiKeyMatch) throw new Error('Could not find API key');
  
  // Step 2: Get player response with caption tracks
  const playerResponse = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${apiKeyMatch[1]}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: {
          client: { clientName: 'WEB', clientVersion: '2.20240101' }
        },
        videoId
      })
    }
  ).then(res => res.json());
  
  // Step 3: Extract caption track URL
  const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks) return { error: 'No captions available' };
  
  // Find best track (prefer manual, then auto-generated)
  const track = tracks.find(t => t.languageCode === lang) || tracks[0];
  
  // Step 4: Fetch and parse transcript XML
  const captionUrl = track.baseUrl.replace(/&fmt=\w+$/, '');
  const xml = await fetch(captionUrl).then(res => res.text());
  const parsed = await parseStringPromise(xml);
  
  // Format output
  return parsed.transcript.text.map(entry => ({
    text: entry._,
    start: parseFloat(entry.$.start),
    duration: parseFloat(entry.$.dur)
  }));
}
```

---

### Layer 2: Audio Download + Speech-to-Text (Fallback for No Captions)

**When YouTube captions fail, download audio and transcribe with Whisper/Deepgram/AssemblyAI**

#### Option A: yt-dlp + OpenAI Whisper API (Recommended)

**Cost: ~$0.006/minute**

```javascript
// Node.js implementation using yt-dlp-nodejs
const { YtDlp } = require('ytdlp-nodejs');
const OpenAI = require('openai');
const fs = require('fs');

async function transcribeWithWhisper(videoUrl) {
  const ytDlp = new YtDlp();
  
  // Step 1: Download audio only (much faster than video)
  await ytDlp.downloadAsync(videoUrl, {
    format: 'bestaudio',
    output: './temp/%(id)s.%(ext)s',
    extractAudio: true,
    audioFormat: 'mp3'
  });
  
  // Step 2: Send to Whisper API
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  // Handle file size limit (25MB) - chunk if needed
  const audioPath = './temp/video_id.mp3';
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: 'whisper-1',
    language: 'en', // or 'hi' for Hindi
    response_format: 'text'
  });
  
  return transcription;
}
```

#### Option B: AssemblyAI (Better for Hindi/Multilingual)

**Cost: ~$0.015/minute (Best accuracy for Indian languages)**

```javascript
const { AssemblyAI } = require('assemblyai');

async function transcribeWithAssemblyAI(audioUrl) {
  const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
  
  const transcript = await client.transcripts.transcribe({
    audio: audioUrl,  // Can pass YouTube URL directly!
    language_detection: true,  // Auto-detect Hindi/English
    speaker_labels: true,  // Identify speakers
  });
  
  return transcript.text;
}
```

#### Option C: Deepgram (Fastest, Good Hindi Support)

**Cost: ~$0.0043/minute**

```javascript
const { createClient } = require('@deepgram/sdk');

async function transcribeWithDeepgram(audioUrl) {
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
  
  const { result } = await deepgram.listen.prerecorded.transcribeUrl(
    { url: audioUrl },
    {
      model: 'nova-2',
      language: 'hi',  // or 'en' or 'multi' for mixed
      detect_language: true,
      punctuate: true
    }
  );
  
  return result.results.channels[0].alternatives[0].transcript;
}
```

---

### Layer 3: Third-Party YouTube Transcript APIs (Easiest)

If you want a hassle-free solution, use dedicated APIs:

#### Supadata.ai

```javascript
// Simple REST API - no audio handling needed
const response = await fetch('https://api.supadata.ai/v1/youtube/transcript', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${process.env.SUPADATA_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ video_id: 'IQSNSltXmG0' })
});

const { transcript } = await response.json();
```

#### youtube-transcript.io

```javascript
const response = await fetch('https://www.youtube-transcript.io/api/transcripts', {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${process.env.YT_TRANSCRIPT_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ ids: ['IQSNSltXmG0', 'QvoFNiscgq4'] })  // Batch up to 50
});
```

---

## Recommended Implementation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    YouTube Scraper v2                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐                                           │
│   │ Video URL   │                                           │
│   └──────┬──────┘                                           │
│          ▼                                                  │
│   ┌─────────────────────────────────────┐                   │
│   │ Layer 1: YouTube Transcript API     │ ← FREE            │
│   │ (Innertube/youtube-transcript-api)  │                   │
│   └──────┬──────────────────────────────┘                   │
│          │                                                  │
│          ▼ (If fails)                                       │
│   ┌─────────────────────────────────────┐                   │
│   │ Layer 2: Audio + Whisper/Deepgram   │ ← $0.006/min      │
│   │ (yt-dlp download → transcribe)      │                   │
│   └──────┬──────────────────────────────┘                   │
│          │                                                  │
│          ▼ (If fails)                                       │
│   ┌─────────────────────────────────────┐                   │
│   │ Layer 3: External API (Supadata)    │ ← $$/API call     │
│   │ (Managed service, handles edge      │                   │
│   │  cases automatically)               │                   │
│   └─────────────────────────────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Complete Node.js Implementation

```javascript
// src/lib/scrapers/youtube-transcriber.ts

import { YouTubeTranscriptApi } from 'youtube-transcript-api'; // if using npm package
import OpenAI from 'openai';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface TranscriptResult {
  videoId: string;
  transcript: string;
  source: 'youtube_captions' | 'whisper' | 'assemblyai' | 'failed';
  language?: string;
  duration?: number;
}

export class YouTubeTranscriber {
  private openai: OpenAI;
  private tempDir: string;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.tempDir = path.join(process.cwd(), 'temp');
  }

  async transcribe(videoId: string): Promise<TranscriptResult> {
    // Layer 1: Try YouTube captions first (FREE)
    const captionResult = await this.tryYouTubeCaptions(videoId);
    if (captionResult) {
      return {
        videoId,
        transcript: captionResult.text,
        source: 'youtube_captions',
        language: captionResult.language
      };
    }

    // Layer 2: Download audio and use Whisper (PAID but reliable)
    const whisperResult = await this.tryWhisperTranscription(videoId);
    if (whisperResult) {
      return {
        videoId,
        transcript: whisperResult,
        source: 'whisper'
      };
    }

    // All methods failed
    return {
      videoId,
      transcript: '',
      source: 'failed'
    };
  }

  private async tryYouTubeCaptions(videoId: string): Promise<{ text: string; language: string } | null> {
    try {
      // Use Innertube API directly (more reliable than libraries)
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const html = await fetch(videoUrl).then(res => res.text());
      
      const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
      if (!apiKeyMatch) return null;

      const playerResponse = await fetch(
        `https://www.youtube.com/youtubei/v1/player?key=${apiKeyMatch[1]}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: { client: { clientName: 'WEB', clientVersion: '2.20240101' } },
            videoId
          })
        }
      ).then(res => res.json());

      const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!tracks || tracks.length === 0) return null;

      // Prefer Hindi or English
      const preferredLangs = ['hi', 'en', 'en-IN'];
      const track = tracks.find((t: any) => preferredLangs.includes(t.languageCode)) || tracks[0];
      
      const captionUrl = track.baseUrl;
      const xml = await fetch(captionUrl).then(res => res.text());
      
      // Parse XML to extract text
      const textMatches = xml.match(/<text[^>]*>([^<]*)<\/text>/g) || [];
      const fullText = textMatches
        .map(match => {
          const textContent = match.replace(/<[^>]+>/g, '');
          return this.decodeHtmlEntities(textContent);
        })
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      return { text: fullText, language: track.languageCode };
    } catch (error) {
      console.log(`[YouTube Captions] Failed for ${videoId}:`, error);
      return null;
    }
  }

  private async tryWhisperTranscription(videoId: string): Promise<string | null> {
    try {
      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });
      
      const audioPath = path.join(this.tempDir, `${videoId}.mp3`);
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // Download audio using yt-dlp
      await execAsync(
        `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${audioPath}" "${videoUrl}"`,
        { timeout: 120000 }  // 2 minute timeout
      );

      // Check file size (Whisper API limit is 25MB)
      const stats = await fs.stat(audioPath);
      if (stats.size > 25 * 1024 * 1024) {
        // File too large - would need to chunk
        console.log(`[Whisper] File too large for ${videoId}, skipping`);
        await fs.unlink(audioPath);
        return null;
      }

      // Transcribe with Whisper
      const transcription = await this.openai.audio.transcriptions.create({
        file: await fs.readFile(audioPath),
        model: 'whisper-1',
        response_format: 'text'
      });

      // Cleanup
      await fs.unlink(audioPath);

      return transcription;
    } catch (error) {
      console.log(`[Whisper] Failed for ${videoId}:`, error);
      return null;
    }
  }

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  // Batch processing for multiple videos
  async transcribeBatch(videoIds: string[]): Promise<TranscriptResult[]> {
    const results: TranscriptResult[] = [];
    
    // Process in parallel with concurrency limit
    const concurrency = 3;  // Don't overwhelm APIs
    for (let i = 0; i < videoIds.length; i += concurrency) {
      const batch = videoIds.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(id => this.transcribe(id))
      );
      results.push(...batchResults);
      
      // Rate limiting delay
      if (i + concurrency < videoIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}
```

---

## API Route Implementation

```typescript
// src/app/api/scrape/youtube/transcribe/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { YouTubeTranscriber } from '@/lib/scrapers/youtube-transcriber';

export async function POST(request: NextRequest) {
  try {
    const { videoIds } = await request.json();
    
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json(
        { error: 'videoIds array required' },
        { status: 400 }
      );
    }

    const transcriber = new YouTubeTranscriber();
    const results = await transcriber.transcribeBatch(videoIds);

    const successful = results.filter(r => r.source !== 'failed').length;
    
    return NextResponse.json({
      success: true,
      total: results.length,
      successful,
      failed: results.length - successful,
      transcripts: results
    });

  } catch (error) {
    console.error('YouTube transcription error:', error);
    return NextResponse.json(
      { error: 'Transcription failed', details: error },
      { status: 500 }
    );
  }
}
```

---

## Cost Comparison

| Method | Cost | Speed | Hindi Support | Reliability |
|--------|------|-------|---------------|-------------|
| YouTube Captions | FREE | Instant | ⭐⭐⭐ | ⭐⭐ (50% success) |
| OpenAI Whisper | $0.006/min | ~1x realtime | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Deepgram Nova-2 | $0.0043/min | 5-40x faster | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| AssemblyAI | $0.015/min | 1-2x realtime | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Supadata API | ~$0.01/video | Instant | ⭐⭐⭐ | ⭐⭐⭐⭐ |

**For your use case (Indian bike reviews, Hindi/Hinglish content):**

**Recommended: Deepgram or AssemblyAI** for audio transcription fallback, as they have the best Hindi language support.

---

## For Your Specific Error Cases

Looking at your logs:

```
[Transcript] ⚠️ Could not parse transcript XML for IQSNSltXmG0
```
**Solution:** Use Innertube API approach (handles XML format changes better)

```
[Transcript] ⚠️ Transcript disabled for ByzXAMMjYzU
```
**Solution:** Fall back to audio download + Whisper (the only way to get content)

```
[Transcript] ⚠️ No captions found in page for zkVGAEFerNo
```
**Solution:** Same as above - audio download + transcription

---

## Quick Wins to Implement Now

1. **Add language detection** - Try `hi`, `en`, `en-IN` in that order
2. **Use Innertube API** - More reliable than XML parsing
3. **Add yt-dlp + Whisper fallback** - Catches 90%+ of failures
4. **Cache transcripts** - Store in Supabase to avoid re-transcribing

Would you like me to help implement any specific part of this strategy?
