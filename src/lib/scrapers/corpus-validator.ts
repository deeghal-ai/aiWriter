/**
 * Corpus Validator
 * 
 * Validates that scraped corpus content matches the target vehicle.
 * Detects mismatches where YouTube or web search returns content for similar but different vehicles.
 */

import type { SingleVehicleCorpus } from '@/lib/types';

export interface CorpusValidationResult {
  isValid: boolean;
  confidence: number;  // 0-100, percentage of content that matches target vehicle
  warnings: string[];
  details: {
    targetVehicle: string;
    modelName: string;
    totalVideos: number;
    videosWithTarget: number;
    unexpectedVehicles: Array<{
      name: string;
      mentionCount: number;
    }>;
  };
}

/**
 * Common Indian market vehicle model names for mismatch detection
 */
const COMMON_VEHICLE_MODELS = [
  // Maruti Suzuki
  'swift', 'dzire', 'baleno', 'brezza', 'grand vitara', 'fronx', 'jimny', 'invicto', 'alto', 'wagon r', 'celerio', 'ignis', 'ertiga', 'xl6', 'ciaz', 'eeco', 's-presso',
  // Hyundai
  'venue', 'creta', 'i20', 'i10', 'grand i10', 'aura', 'verna', 'exter', 'tucson', 'alcazar', 'ioniq',
  // Tata
  'nexon', 'punch', 'harrier', 'safari', 'altroz', 'tigor', 'tiago', 'curvv',
  // Kia
  'sonet', 'seltos', 'carens', 'ev6',
  // Mahindra
  'xuv 3xo', 'xuv300', 'xuv400', 'xuv700', 'thar', 'scorpio', 'bolero', 'be 6',
  // Honda
  'city', 'amaze', 'elevate', 'wr-v',
  // Toyota
  'innova', 'fortuner', 'urban cruiser', 'hyryder', 'glanza', 'rumion', 'camry',
  // Others
  'magnite', 'kiger', 'kushaq', 'taigun', 'slavia', 'virtus', 'astor', 'hector', 'compass',
  // Bikes (for BikeWale context)
  'splendor', 'pulsar', 'apache', 'fz', 'r15', 'duke', 'classic', 'hunter', 'himalayan', 'interceptor', 'continental',
];

/**
 * Extract model name from full vehicle name
 * "Maruti Suzuki Swift Dzire" -> "dzire"
 * "Hyundai Venue" -> "venue"
 */
function extractModelName(vehicleName: string): string {
  const normalized = vehicleName.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  
  // Remove common brand prefixes
  const brands = ['maruti', 'suzuki', 'hyundai', 'tata', 'kia', 'mahindra', 'honda', 'toyota', 'nissan', 'renault', 'skoda', 'volkswagen', 'vw', 'mg', 'jeep', 'ford', 'royal', 'enfield', 'ktm', 'tvs', 'bajaj', 'hero', 'yamaha', 'kawasaki'];
  
  const filteredWords = words.filter(word => !brands.includes(word));
  
  // Return the last significant word as model name
  return filteredWords.length > 0 ? filteredWords[filteredWords.length - 1] : words[words.length - 1];
}

/**
 * Count how many times a model is mentioned in text
 */
function countMentions(text: string, model: string): number {
  if (!text || !model) return 0;
  const regex = new RegExp(`\\b${model}\\b`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Validate that corpus content matches the target vehicle
 */
export function validateCorpus(
  targetVehicle: string,
  corpus: SingleVehicleCorpus
): CorpusValidationResult {
  const modelName = extractModelName(targetVehicle);
  const targetLower = targetVehicle.toLowerCase();
  
  let videosWithTarget = 0;
  const vehicleMentions: Record<string, number> = {};
  
  const videos = corpus.youtube?.videos || [];
  const totalVideos = videos.length;
  
  // Analyze each video
  for (const video of videos) {
    const text = [
      video.title || '',
      video.description || '',
      video.transcript?.substring(0, 5000) || '' // First 5000 chars of transcript
    ].join(' ').toLowerCase();
    
    // Check if target vehicle/model is mentioned
    const hasTarget = text.includes(modelName) || text.includes(targetLower);
    if (hasTarget) {
      videosWithTarget++;
    }
    
    // Count mentions of other known vehicles
    for (const otherModel of COMMON_VEHICLE_MODELS) {
      if (otherModel !== modelName && otherModel.length > 2) { // Skip very short names
        const mentions = countMentions(text, otherModel);
        if (mentions > 0) {
          vehicleMentions[otherModel] = (vehicleMentions[otherModel] || 0) + 1;
        }
      }
    }
  }
  
  // Also check web search results
  const webSearchTexts = [
    ...(corpus.webSearch?.specs?.results?.map(r => r.snippet) || []),
    ...(corpus.webSearch?.variants?.results?.map(r => r.snippet) || []),
    ...(corpus.webSearch?.pricing?.results?.map(r => r.snippet) || []),
    ...(corpus.webSearch?.competitors?.results?.map(r => r.snippet) || []),
  ].join(' ').toLowerCase();
  
  const webHasTarget = webSearchTexts.includes(modelName) || webSearchTexts.includes(targetLower);
  
  // Calculate confidence
  let confidence = 100;
  if (totalVideos > 0) {
    confidence = Math.round((videosWithTarget / totalVideos) * 100);
  }
  
  // Adjust for web search
  if (!webHasTarget && totalVideos === 0) {
    confidence = 0;
  }
  
  // Generate warnings
  const warnings: string[] = [];
  
  // Warning 1: Low target mention rate
  if (totalVideos > 0 && confidence < 50) {
    warnings.push(`Only ${videosWithTarget} of ${totalVideos} videos mention "${modelName}"`);
  }
  
  // Warning 2: Another vehicle is mentioned more than target
  const unexpectedVehicles: Array<{ name: string; mentionCount: number }> = [];
  for (const [vehicle, count] of Object.entries(vehicleMentions)) {
    if (count > videosWithTarget && vehicle !== modelName) {
      unexpectedVehicles.push({ name: vehicle, mentionCount: count });
      warnings.push(`${count} videos mention "${vehicle}" - possible mismatch`);
    }
  }
  
  // Sort unexpected vehicles by mention count
  unexpectedVehicles.sort((a, b) => b.mentionCount - a.mentionCount);
  
  // Warning 3: No content at all
  if (totalVideos === 0 && !webHasTarget) {
    warnings.push('No video or web content found for this vehicle');
    confidence = 0;
  }
  
  return {
    isValid: warnings.length === 0,
    confidence,
    warnings,
    details: {
      targetVehicle,
      modelName,
      totalVideos,
      videosWithTarget,
      unexpectedVehicles: unexpectedVehicles.slice(0, 5), // Top 5
    },
  };
}

/**
 * Quick validation check - returns true if corpus seems valid
 */
export function isCorpusValid(targetVehicle: string, corpus: SingleVehicleCorpus): boolean {
  const result = validateCorpus(targetVehicle, corpus);
  return result.isValid || result.confidence >= 50;
}
