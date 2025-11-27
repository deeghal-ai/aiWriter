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
 * Fetches YouTube video transcript using the youtube-transcript library
 * Works without authentication for most Indian motorcycle videos
 */
export async function fetchTranscriptWithLibrary(
  videoId: string
): Promise<ProcessedTranscript | null> {
  try {
    // Using dynamic import for the youtube-transcript package
    const { YoutubeTranscript } = await import('youtube-transcript');
    
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en',  // Try English first
    }).catch(() => 
      // Fallback to Hindi
      YoutubeTranscript.fetchTranscript(videoId, { lang: 'hi' })
    ).catch(() => 
      // Fallback to auto-generated
      YoutubeTranscript.fetchTranscript(videoId)
    );
    
    if (!transcript || transcript.length === 0) {
      return null;
    }
    
    const segments: TranscriptSegment[] = transcript.map((item: any) => ({
      text: item.text,
      start: item.offset / 1000,  // Convert to seconds
      duration: item.duration / 1000
    }));
    
    const fullText = segments.map(s => s.text).join(' ');
    const duration = segments[segments.length - 1].start + segments[segments.length - 1].duration;
    
    // Extract key moments based on common review sections
    const keyMoments = extractKeyMoments(segments);
    
    return {
      fullText,
      segments,
      duration,
      language: 'en',
      keyMoments
    };
    
  } catch (error) {
    console.error(`Transcript fetch failed for ${videoId}:`, error);
    return null;
  }
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

