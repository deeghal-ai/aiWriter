// YouTube transcript fetching and processing

interface TranscriptSegment {
  text: string;
  start: number;  // seconds
  duration: number;
}

interface ProcessedTranscript {
  fullText: string;
  segments: TranscriptSegment[];
  duration: number;
  language: string;
  keyMoments: KeyMoment[];
}

interface KeyMoment {
  timestamp: number;
  topic: string;
  text: string;
}

/**
 * Fetches YouTube video transcript directly from YouTube
 * Custom implementation that handles various transcript formats
 */
export async function fetchTranscriptWithLibrary(
  videoId: string
): Promise<ProcessedTranscript | null> {
  try {
    // First try the library
    const libraryResult = await fetchWithLibrary(videoId);
    if (libraryResult) return libraryResult;
    
    // Fallback to direct fetch
    const directResult = await fetchTranscriptDirect(videoId);
    if (directResult) return directResult;
    
    return null;
  } catch (error: any) {
    console.error(`[Transcript] ❌ Unexpected error for ${videoId}:`, error?.message || error);
    return null;
  }
}

/**
 * Try fetching with the youtube-transcript library
 */
async function fetchWithLibrary(videoId: string): Promise<ProcessedTranscript | null> {
  try {
    const { YoutubeTranscript } = await import('youtube-transcript');
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcript || transcript.length === 0) {
      return null; // Silent fail, we'll try direct fetch
    }
    
    console.log(`[Transcript] ✅ Library got ${transcript.length} segments for ${videoId}`);
    
    const segments: TranscriptSegment[] = transcript.map((item: any) => ({
      text: decodeHtmlEntities(item.text || ''),
      start: (item.offset || 0) / 1000,
      duration: (item.duration || 0) / 1000
    }));
    
    const fullText = segments.map(s => s.text).join(' ');
    const duration = segments.length > 0 
      ? segments[segments.length - 1].start + segments[segments.length - 1].duration
      : 0;
    
    return {
      fullText,
      segments,
      duration,
      language: 'auto',
      keyMoments: extractKeyMoments(segments)
    };
  } catch (error: any) {
    const errorMsg = error?.message || '';
    if (errorMsg.includes('disabled')) {
      console.log(`[Transcript] ⚠️ Transcript disabled for ${videoId}`);
      return null;
    }
    // Don't log - we'll try direct fetch
    return null;
  }
}

/**
 * Direct fetch from YouTube's timedtext API
 */
async function fetchTranscriptDirect(videoId: string): Promise<ProcessedTranscript | null> {
  try {
    // Fetch the video page to get caption tracks
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(videoPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    if (!pageResponse.ok) {
      return null;
    }
    
    const pageHtml = await pageResponse.text();
    
    // Extract captions data from the page
    const captionsMatch = pageHtml.match(/"captions":\s*(\{[^}]+\}[^}]+\})/);
    if (!captionsMatch) {
      console.log(`[Transcript] ⚠️ No captions found in page for ${videoId}`);
      return null;
    }
    
    // Try to find the caption track URL
    const baseUrlMatch = pageHtml.match(/"baseUrl":\s*"([^"]+)"/);
    if (!baseUrlMatch) {
      console.log(`[Transcript] ⚠️ No caption URL found for ${videoId}`);
      return null;
    }
    
    // Unescape the URL
    const captionUrl = baseUrlMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
    
    // Fetch the transcript
    const transcriptResponse = await fetch(captionUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!transcriptResponse.ok) {
      return null;
    }
    
    const transcriptXml = await transcriptResponse.text();
    
    // Parse both old and new XML formats
    const segments = parseTranscriptXml(transcriptXml);
    
    if (segments.length === 0) {
      console.log(`[Transcript] ⚠️ Could not parse transcript XML for ${videoId}`);
      return null;
    }
    
    console.log(`[Transcript] ✅ Direct fetch got ${segments.length} segments for ${videoId}`);
    
    const fullText = segments.map(s => s.text).join(' ');
    const duration = segments[segments.length - 1].start + segments[segments.length - 1].duration;
    
    return {
      fullText,
      segments,
      duration,
      language: 'auto',
      keyMoments: extractKeyMoments(segments)
    };
    
  } catch (error: any) {
    console.log(`[Transcript] ⚠️ Direct fetch failed for ${videoId}: ${error?.message?.substring(0, 50) || 'Unknown'}`);
    return null;
  }
}

/**
 * Parse transcript XML with multiple format support
 */
function parseTranscriptXml(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  
  // Try format 1: <text start="X" dur="Y">content</text>
  const format1Regex = /<text start="([^"]*)" dur="([^"]*)"[^>]*>([^<]*)<\/text>/g;
  let match;
  
  while ((match = format1Regex.exec(xml)) !== null) {
    segments.push({
      text: decodeHtmlEntities(match[3]),
      start: parseFloat(match[1]),
      duration: parseFloat(match[2])
    });
  }
  
  if (segments.length > 0) return segments;
  
  // Try format 2: <p t="X" d="Y">content</p> (newer format)
  const format2Regex = /<p t="(\d+)" d="(\d+)"[^>]*>([^<]*)<\/p>/g;
  
  while ((match = format2Regex.exec(xml)) !== null) {
    segments.push({
      text: decodeHtmlEntities(match[3]),
      start: parseInt(match[1]) / 1000, // milliseconds to seconds
      duration: parseInt(match[2]) / 1000
    });
  }
  
  if (segments.length > 0) return segments;
  
  // Try format 3: JSON3 format (sometimes YouTube returns JSON)
  try {
    const jsonMatch = xml.match(/\{"wireMagic".*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      if (data.events) {
        for (const event of data.events) {
          if (event.segs) {
            const text = event.segs.map((s: any) => s.utf8 || '').join('');
            if (text.trim()) {
              segments.push({
                text: decodeHtmlEntities(text),
                start: (event.tStartMs || 0) / 1000,
                duration: (event.dDurationMs || 0) / 1000
              });
            }
          }
        }
      }
    }
  } catch {
    // Not JSON format
  }
  
  return segments;
}

/**
 * Decode HTML entities in transcript text
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/\n/g, ' ')
    .trim();
}

/**
 * Extract key moments from transcript based on topic keywords
 */
function extractKeyMoments(segments: TranscriptSegment[]): KeyMoment[] {
  const keyMoments: KeyMoment[] = [];
  
  const topicKeywords: Record<string, string[]> = {
    'Engine & Performance': ['engine', 'power', 'torque', 'rpm', 'acceleration', 'pickup', 'refinement', 'vibration'],
    'Ride Quality': ['ride', 'suspension', 'comfort', 'handling', 'stability', 'cornering', 'braking'],
    'Features': ['features', 'display', 'abs', 'lights', 'bluetooth', 'usb', 'modes'],
    'Build Quality': ['build', 'quality', 'finish', 'paint', 'plastics', 'fit'],
    'Mileage': ['mileage', 'fuel', 'economy', 'kmpl', 'tank', 'range'],
    'Negatives': ['problem', 'issue', 'complaint', 'negative', 'dont like', 'disappointed', 'bad'],
    'Price & Value': ['price', 'value', 'worth', 'expensive', 'affordable', 'cost', 'emi'],
    'Comparison': ['compared', 'versus', 'vs', 'better than', 'competitor'],
    'Long Term': ['months', 'years', 'ownership', 'long term', 'service', 'maintenance']
  };
  
  // Scan through segments looking for topic transitions
  let currentText = '';
  let currentStart = 0;
  
  segments.forEach((segment, idx) => {
    currentText += ' ' + segment.text.toLowerCase();
    
    // Check every ~30 seconds of content
    if (idx % 10 === 0 || idx === segments.length - 1) {
      for (const [topic, keywords] of Object.entries(topicKeywords)) {
        const hasKeyword = keywords.some(kw => currentText.includes(kw));
        
        if (hasKeyword && !keyMoments.some(km => km.topic === topic && Math.abs(km.timestamp - currentStart) < 60)) {
          // Extract the relevant sentence
          const relevantText = extractRelevantSentence(currentText, keywords);
          
          keyMoments.push({
            timestamp: currentStart,
            topic,
            text: relevantText
          });
        }
      }
      
      currentText = '';
      currentStart = segment.start;
    }
  });
  
  return keyMoments.slice(0, 10);  // Limit to 10 key moments
}

/**
 * Extract the most relevant sentence containing keywords
 */
function extractRelevantSentence(text: string, keywords: string[]): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  for (const sentence of sentences) {
    if (keywords.some(kw => sentence.includes(kw))) {
      return sentence.trim().substring(0, 200);
    }
  }
  
  return sentences[0]?.trim().substring(0, 200) || '';
}

/**
 * Summarize transcript for token efficiency
 * Extract only the most relevant parts
 */
export function summarizeTranscript(
  transcript: ProcessedTranscript,
  maxLength: number = 1500
): string {
  // If transcript is short, return as-is
  if (transcript.fullText.length <= maxLength) {
    return transcript.fullText;
  }
  
  // Build summary from key moments
  let summary = '';
  
  // Add key moments
  transcript.keyMoments.forEach(km => {
    summary += `[${km.topic}]: ${km.text}\n`;
  });
  
  // If still have room, add beginning and end
  const remaining = maxLength - summary.length;
  if (remaining > 200) {
    const intro = transcript.fullText.substring(0, remaining / 2);
    const outro = transcript.fullText.substring(transcript.fullText.length - remaining / 2);
    summary = intro + '\n...\n' + summary + '\n...\n' + outro;
  }
  
  return summary.substring(0, maxLength);
}

