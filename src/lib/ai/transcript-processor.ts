/**
 * Transcript Processor
 * 
 * Handles Hindi translation (via OpenAI) and summarization (via Haiku)
 * Uses existing model registry and provider patterns.
 */

import Anthropic from "@anthropic-ai/sdk";
import { getTaskConfig, getModelDefinitionForTask } from './models/registry';

// Hindi/Devanagari detection regex
const HINDI_REGEX = /[\u0900-\u097F]/;
const HINDI_THRESHOLD = 0.15; // If >15% of chars are Hindi, consider it Hindi

/**
 * Detect if text contains significant Hindi content
 */
export function detectHindi(text: string): boolean {
  if (!text || text.length < 50) return false;
  
  const hindiChars = (text.match(HINDI_REGEX) || []).length;
  const ratio = hindiChars / text.length;
  
  return ratio > HINDI_THRESHOLD;
}

/**
 * Translate Hindi text to English using OpenAI
 * Uses the existing OPENAI_API_KEY from environment
 */
export async function translateHindiToEnglish(text: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('[TranscriptProcessor] No OpenAI API key, skipping translation');
    return text;
  }
  
  // Only translate if there's significant Hindi content
  if (!detectHindi(text)) {
    return text;
  }
  
  console.log(`[TranscriptProcessor] Translating Hindi text (${text.length} chars)...`);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and cheap for translation
        messages: [
          {
            role: 'system',
            content: 'You are a translator. Translate the following Hindi/Hinglish motorcycle review transcript to clear English. Preserve all technical details, opinions, and specific numbers. Keep the conversational tone.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: Math.min(4096, Math.ceil(text.length * 1.5)), // Allow for expansion
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[TranscriptProcessor] Translation API error:', error);
      return text; // Return original on error
    }

    const result = await response.json();
    const translated = result.choices?.[0]?.message?.content?.trim();
    
    if (translated && translated.length > 0) {
      console.log(`[TranscriptProcessor] ✅ Translated: ${text.length} → ${translated.length} chars`);
      return translated;
    }
    
    return text;
  } catch (error: any) {
    console.error('[TranscriptProcessor] Translation failed:', error.message);
    return text;
  }
}

/**
 * Summarize a long transcript using Haiku
 * Uses the Anthropic SDK directly for efficiency
 */
export async function summarizeTranscriptWithHaiku(
  transcript: string,
  maxOutputLength: number = 3000,
  bikeName?: string
): Promise<string> {
  // If already short enough, return as-is
  if (transcript.length <= maxOutputLength) {
    return transcript;
  }
  
  // Check if Anthropic is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[TranscriptProcessor] No Anthropic API key, using simple truncation');
    return simpleSmartTruncate(transcript, maxOutputLength);
  }
  
  console.log(`[TranscriptProcessor] Summarizing transcript with Haiku (${transcript.length} → ~${maxOutputLength} chars)...`);
  
  try {
    // Get the configured model for transcript summarization from registry
    const taskConfig = getTaskConfig('transcript_summarization');
    const model = getModelDefinitionForTask('transcript_summarization');
    
    // Initialize Anthropic client
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    // Build the summarization prompt
    const bikeContext = bikeName ? ` about the ${bikeName}` : '';
    const prompt = `Summarize this motorcycle review transcript${bikeContext}. Focus on:
- Specific technical observations (engine, handling, braking, suspension)
- Real-world experiences and problems mentioned
- Comparisons to other bikes
- Specific numbers (mileage, price, service costs, km driven)
- Strong opinions (what they loved/hated)

Keep the reviewer's voice and specific details. Output should be ~${Math.floor(maxOutputLength * 0.8)} characters.

TRANSCRIPT:
${transcript}`;

    // Call Haiku directly
    const response = await client.messages.create({
      model: model.modelString,
      max_tokens: taskConfig.maxTokens,
      temperature: taskConfig.temperature,
      messages: [{ role: 'user', content: prompt }],
    });
    
    const summary = response.content[0]?.type === 'text' 
      ? response.content[0].text.trim() 
      : '';
    
    if (summary && summary.length > 100) {
      console.log(`[TranscriptProcessor] ✅ Summarized: ${transcript.length} → ${summary.length} chars`);
      return summary;
    }
    
    // Fallback to simple truncation
    return simpleSmartTruncate(transcript, maxOutputLength);
    
  } catch (error: any) {
    console.error('[TranscriptProcessor] Summarization failed:', error.message);
    return simpleSmartTruncate(transcript, maxOutputLength);
  }
}

/**
 * Smart truncation that preserves beginning and end
 */
function simpleSmartTruncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  const beginningPortion = 0.7;
  const beginningLength = Math.floor(maxLength * beginningPortion);
  const endLength = maxLength - beginningLength - 20; // 20 for separator
  
  const beginning = text.substring(0, beginningLength);
  const ending = text.substring(text.length - endLength);
  
  return `${beginning}\n\n[...]\n\n${ending}`;
}

/**
 * Process a transcript: translate if Hindi, then optionally summarize
 * This is the main entry point for transcript processing
 */
export async function processTranscript(
  transcript: string,
  options: {
    translate?: boolean;
    summarize?: boolean;
    maxLength?: number;
    bikeName?: string;
  } = {}
): Promise<{
  original: string;
  processed: string;
  wasTranslated: boolean;
  wasSummarized: boolean;
}> {
  const {
    translate = true,
    summarize = false,
    maxLength = 3000,
    bikeName,
  } = options;
  
  let processed = transcript;
  let wasTranslated = false;
  let wasSummarized = false;
  
  // Step 1: Translate Hindi if needed
  if (translate && detectHindi(transcript)) {
    processed = await translateHindiToEnglish(transcript);
    wasTranslated = processed !== transcript;
  }
  
  // Step 2: Summarize if requested and too long
  if (summarize && processed.length > maxLength) {
    processed = await summarizeTranscriptWithHaiku(processed, maxLength, bikeName);
    wasSummarized = true;
  }
  
  return {
    original: transcript,
    processed,
    wasTranslated,
    wasSummarized,
  };
}

/**
 * Batch process multiple transcripts (for efficiency)
 */
export async function processTranscriptsBatch(
  transcripts: Array<{ id: string; text: string; bikeName?: string }>,
  options: {
    translate?: boolean;
    summarize?: boolean;
    maxLength?: number;
  } = {}
): Promise<Map<string, { processed: string; wasTranslated: boolean; wasSummarized: boolean }>> {
  const results = new Map();
  
  // Process in parallel with concurrency limit
  const concurrency = 3;
  for (let i = 0; i < transcripts.length; i += concurrency) {
    const batch = transcripts.slice(i, i + concurrency);
    
    const batchResults = await Promise.all(
      batch.map(async ({ id, text, bikeName }) => {
        const result = await processTranscript(text, { ...options, bikeName });
        return { id, result };
      })
    );
    
    batchResults.forEach(({ id, result }) => {
      results.set(id, {
        processed: result.processed,
        wasTranslated: result.wasTranslated,
        wasSummarized: result.wasSummarized,
      });
    });
  }
  
  return results;
}

