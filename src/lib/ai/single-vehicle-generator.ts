/**
 * Single Vehicle Content Generator
 * Orchestrates the multi-step AI pipeline to generate page content from corpus
 */

import Anthropic from '@anthropic-ai/sdk';
import { getModelApiConfig } from './models/registry';
import {
  ownerPulseSchema,
  quickDecisionSchema,
  segmentScorecardSchema,
  competitorAnalysisSchema,
  goodTimeToBuySchema,
  vehicleInfoSchema
} from './schemas/single-vehicle-schemas';
import {
  buildOwnerPulsePrompt,
  buildQuickDecisionPrompt,
  buildSegmentScorecardPrompt,
  buildCompetitorAnalysisPrompt,
  buildGoodTimeToBuyPrompt,
  buildVehicleInfoPrompt,
  buildVariantOptionsPlaceholder,
  buildCostPlaceholder,
  buildVariantOptionsPrompt,
  buildCostStructurePrompt,
  buildGoodTimeToBuyFromWebSearchPrompt,
  OWNER_PULSE_SYSTEM_PROMPT,
  QUICK_DECISION_SYSTEM_PROMPT,
  SEGMENT_SCORECARD_SYSTEM_PROMPT,
  COMPETITOR_ANALYSIS_SYSTEM_PROMPT,
  VARIANT_OPTIONS_SYSTEM_PROMPT,
  COST_STRUCTURE_SYSTEM_PROMPT,
  GOOD_TIME_TO_BUY_SYSTEM_PROMPT
} from './prompts/single-vehicle-content';
import type {
  SingleVehicleCorpus,
  SingleVehiclePageContent,
  SingleVehicleContentResult,
  OwnerPulseSection,
  QuickDecisionSection,
  SegmentScorecardSection,
  MainCompetitor,
  GoodTimeToBuySection,
  VehicleInfo,
  SingleVehicleGenerationProgress,
  VariantOptionsSection,
  HowMuchItReallyCostsSection,
  SingleVehicleWebData
} from '../types';

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: SingleVehicleGenerationProgress) => void;

/**
 * Repair common JSON issues from LLM output
 */
function repairJson(jsonText: string): string {
  let repaired = jsonText;
  
  // Remove trailing commas before closing brackets/braces
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  
  // Remove multiple consecutive commas
  repaired = repaired.replace(/,(\s*),/g, ',');
  
  // Fix arrays/objects starting with comma
  repaired = repaired.replace(/\[\s*,/g, '[');
  repaired = repaired.replace(/\{\s*,/g, '{');
  
  // Remove trailing commas at end
  repaired = repaired.replace(/,(\s*)$/g, '$1');
  
  // Fix missing commas between array elements
  repaired = repaired.replace(/}(\s*)\{/g, '},$1{');
  
  // Clean up any double commas
  repaired = repaired.replace(/,\s*,/g, ',');
  
  // Final trailing comma cleanup
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  
  return repaired;
}

/**
 * Extract JSON from LLM response
 */
function extractJsonFromResponse(text: string): string {
  // Try to find JSON block
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  
  // Try to find raw JSON object
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0];
  }
  
  return text;
}

/**
 * Parse JSON with repair attempt
 */
function parseJsonSafely<T>(text: string, fallback: T): T {
  try {
    const jsonStr = extractJsonFromResponse(text);
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    try {
      const repaired = repairJson(extractJsonFromResponse(text));
      return JSON.parse(repaired) as T;
    } catch (e2) {
      console.error('[Generator] JSON parse failed:', e2);
      return fallback;
    }
  }
}

/**
 * Canonical key order for SingleVehiclePageContent and nested objects
 * Ensures consistent JSON output matching the standard format
 */
const KEY_ORDER: Record<string, string[]> = {
  root: ['vehicle', 'quickDecision', 'howMuchItReallyCosts', 'variantOptions', 
         'segmentScorecard', 'mainCompetitors', 'goodTimeToBuy', 'ownerPulse', 'dataSource'],
  vehicle: ['make', 'model', 'year', 'segment'],
  quickDecision: ['priceRange', 'idealFor', 'verdict', 'perfectIf', 'skipIf', 'keyAdvantage'],
  priceRange: ['min', 'max', 'minValue', 'maxValue', 'priceType'],
  verdict: ['headline', 'summary', 'highlightType'],
  idealFor: ['label', 'icon'],
  howMuchItReallyCosts: ['location', 'locationDefault', 'selectedVariant', 'realOnRoadPrice', 
                          'monthlyBurn', 'totalMonthly', 'savingsNote', 'ctaLink'],
  realOnRoadPrice: ['amount', 'value', 'breakdown'],
  breakdown: ['exShowroom', 'rto', 'insurance', 'accessories'],
  monthlyBurn: ['emi', 'fuel', 'service'],
  emi: ['amount', 'value', 'loanAmount', 'tenure', 'interestRate'],
  fuel: ['amount', 'value', 'assumedKmPerMonth', 'fuelEfficiency', 'fuelPrice'],
  service: ['amount', 'value', 'basis'],
  totalMonthly: ['amount', 'value'],
  variantOptions: ['fuelType', 'transmission', 'engineType', 'wheelTypes', 'heroFeatures', 'cta'],
  fuelTypeItem: ['label', 'value', 'isDefault', 'variants'],
  transmissionItem: ['label', 'value', 'availableWith'],
  engineTypeItem: ['label', 'value', 'power', 'torque', 'fuelType'],
  wheelTypeItem: ['label', 'value', 'availableOn'],
  heroFeatureItem: ['label', 'icon', 'availableFrom'],
  segmentScorecard: ['leadingCount', 'badge', 'categories', 'summary'],
  category: ['name', 'rank', 'rankNumber', 'totalInSegment', 'status', 'statusType', 'highlights'],
  competitor: ['name', 'tag', 'tagType', 'priceRange', 'imageUrl', 'keyDifferentiator'],
  goodTimeToBuy: ['overallSignal', 'overallSignalType', 'salesRank', 'lifecycleCheck', 
                   'timingSignal', 'stockAvailability'],
  salesRank: ['label', 'value', 'description'],
  lifecycleCheck: ['label', 'status', 'statusType', 'faceliftExpected', 'generationYear'],
  timingSignal: ['label', 'status', 'statusType', 'reason'],
  stockAvailability: ['color', 'colorCode', 'waitingPeriod'],
  ownerPulse: ['rating', 'totalReviews', 'mostPraised', 'mostCriticized'],
  sentimentItem: ['text', 'category'],
  dataSource: ['corpus', 'totalVideos', 'totalComments', 'sources', 'extractedAt', 'lastUpdated']
};

/**
 * Reorder keys in an object according to the specified order
 */
function reorderObjectKeys<T extends object>(obj: T, orderKey: string): T {
  const keyOrder = KEY_ORDER[orderKey];
  if (!keyOrder || typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const ordered = {} as T;
  const objRecord = obj as Record<string, unknown>;
  const orderedRecord = ordered as Record<string, unknown>;
  
  // Add keys in the specified order
  for (const key of keyOrder) {
    if (key in objRecord) {
      orderedRecord[key] = objRecord[key];
    }
  }
  
  // Add any remaining keys not in the order list
  for (const key in objRecord) {
    if (!(key in orderedRecord)) {
      orderedRecord[key] = objRecord[key];
    }
  }
  
  return ordered;
}

/**
 * Recursively reorder all keys in the SingleVehiclePageContent structure
 */
function reorderPageContentKeys(content: SingleVehiclePageContent): SingleVehiclePageContent {
  // Reorder nested objects
  const orderedContent = {
    vehicle: reorderObjectKeys(content.vehicle, 'vehicle'),
    quickDecision: {
      ...reorderObjectKeys(content.quickDecision, 'quickDecision'),
      priceRange: reorderObjectKeys(content.quickDecision.priceRange, 'priceRange'),
      verdict: reorderObjectKeys(content.quickDecision.verdict, 'verdict'),
      idealFor: content.quickDecision.idealFor.map(item => reorderObjectKeys(item, 'idealFor'))
    },
    howMuchItReallyCosts: reorderObjectKeys({
      ...content.howMuchItReallyCosts,
      realOnRoadPrice: {
        ...content.howMuchItReallyCosts.realOnRoadPrice,
        breakdown: reorderObjectKeys(content.howMuchItReallyCosts.realOnRoadPrice.breakdown, 'breakdown')
      },
      monthlyBurn: {
        emi: reorderObjectKeys(content.howMuchItReallyCosts.monthlyBurn.emi, 'emi'),
        fuel: reorderObjectKeys(content.howMuchItReallyCosts.monthlyBurn.fuel, 'fuel'),
        service: reorderObjectKeys(content.howMuchItReallyCosts.monthlyBurn.service, 'service')
      },
      totalMonthly: reorderObjectKeys(content.howMuchItReallyCosts.totalMonthly, 'totalMonthly')
    }, 'howMuchItReallyCosts'),
    variantOptions: reorderObjectKeys({
      ...content.variantOptions,
      fuelType: content.variantOptions.fuelType.map(item => reorderObjectKeys(item, 'fuelTypeItem')),
      transmission: content.variantOptions.transmission.map(item => reorderObjectKeys(item, 'transmissionItem')),
      engineType: content.variantOptions.engineType.map(item => reorderObjectKeys(item, 'engineTypeItem')),
      wheelTypes: content.variantOptions.wheelTypes?.map(item => reorderObjectKeys(item, 'wheelTypeItem')),
      heroFeatures: content.variantOptions.heroFeatures.map(item => reorderObjectKeys(item, 'heroFeatureItem'))
    }, 'variantOptions'),
    segmentScorecard: reorderObjectKeys({
      ...content.segmentScorecard,
      categories: content.segmentScorecard.categories.map(cat => reorderObjectKeys(cat, 'category'))
    }, 'segmentScorecard'),
    mainCompetitors: content.mainCompetitors.map(comp => reorderObjectKeys(comp, 'competitor')),
    goodTimeToBuy: reorderObjectKeys({
      ...content.goodTimeToBuy,
      salesRank: reorderObjectKeys(content.goodTimeToBuy.salesRank, 'salesRank'),
      lifecycleCheck: reorderObjectKeys(content.goodTimeToBuy.lifecycleCheck, 'lifecycleCheck'),
      timingSignal: reorderObjectKeys(content.goodTimeToBuy.timingSignal, 'timingSignal'),
      stockAvailability: content.goodTimeToBuy.stockAvailability.map(item => reorderObjectKeys(item, 'stockAvailability'))
    }, 'goodTimeToBuy'),
    ownerPulse: reorderObjectKeys({
      ...content.ownerPulse,
      mostPraised: content.ownerPulse.mostPraised.map(item => reorderObjectKeys(item, 'sentimentItem')),
      mostCriticized: content.ownerPulse.mostCriticized.map(item => reorderObjectKeys(item, 'sentimentItem'))
    }, 'ownerPulse'),
    dataSource: reorderObjectKeys(content.dataSource, 'dataSource')
  };
  
  // Reorder the root object
  return reorderObjectKeys(orderedContent as SingleVehiclePageContent, 'root');
}

/**
 * Create Anthropic client
 */
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  return new Anthropic({ apiKey });
}

/**
 * Call Claude with structured output expectation
 */
async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  taskType: 'single_vehicle_owner_pulse' | 'single_vehicle_quick_decision' | 'single_vehicle_scorecard' | 'single_vehicle_competitors' | 'single_vehicle_timing'
): Promise<string> {
  const client = getClient();
  const config = getModelApiConfig(taskType);
  
  console.log(`[Generator] Calling ${config.model} for ${taskType}`);
  
  const response = await client.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  });
  
  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }
  
  return content.text;
}

/**
 * Extract vehicle info from name
 */
async function extractVehicleInfo(vehicleName: string): Promise<VehicleInfo> {
  const prompt = buildVehicleInfoPrompt(vehicleName);
  
  try {
    const response = await callClaude(
      'You are a vehicle data parser. Extract structured info from vehicle names.',
      prompt,
      'single_vehicle_owner_pulse' // Using fast model for simple parsing
    );
    
    return parseJsonSafely<VehicleInfo>(response, {
      make: vehicleName.split(' ')[0],
      model: vehicleName.split(' ').slice(1).join(' '),
      year: new Date().getFullYear(),
      segment: 'Compact SUV'
    });
  } catch (error) {
    console.error('[Generator] Vehicle info extraction failed:', error);
    // Fallback parsing
    const parts = vehicleName.split(' ');
    return {
      make: parts[0],
      model: parts.slice(1).join(' '),
      year: new Date().getFullYear(),
      segment: 'Compact SUV'
    };
  }
}

/**
 * Extract owner pulse from corpus
 */
async function extractOwnerPulse(
  corpus: SingleVehicleCorpus,
  onProgress?: ProgressCallback
): Promise<OwnerPulseSection> {
  onProgress?.({ step: 'owner_pulse', status: 'in-progress', message: 'Extracting owner sentiment...' });
  
  const startTime = Date.now();
  
  try {
    const prompt = buildOwnerPulsePrompt(corpus);
    const response = await callClaude(
      OWNER_PULSE_SYSTEM_PROMPT,
      prompt,
      'single_vehicle_owner_pulse'
    );
    
    const result = parseJsonSafely<OwnerPulseSection>(response, {
      rating: 4.0,
      totalReviews: corpus.metadata?.totalComments || 0,
      mostPraised: [],
      mostCriticized: []
    });
    
    onProgress?.({ 
      step: 'owner_pulse', 
      status: 'complete', 
      message: `Extracted ${result.mostPraised.length} praises, ${result.mostCriticized.length} criticisms`,
      duration: Date.now() - startTime
    });
    
    return result;
  } catch (error) {
    onProgress?.({ step: 'owner_pulse', status: 'error', message: String(error) });
    throw error;
  }
}

/**
 * Generate quick decision content
 */
async function generateQuickDecision(
  corpus: SingleVehicleCorpus,
  ownerPulse: OwnerPulseSection,
  onProgress?: ProgressCallback
): Promise<QuickDecisionSection> {
  onProgress?.({ step: 'quick_decision', status: 'in-progress', message: 'Generating quick decision...' });
  
  const startTime = Date.now();
  
  try {
    const prompt = buildQuickDecisionPrompt(corpus, ownerPulse);
    const response = await callClaude(
      QUICK_DECISION_SYSTEM_PROMPT,
      prompt,
      'single_vehicle_quick_decision'
    );
    
    const result = parseJsonSafely<QuickDecisionSection>(response, {
      priceRange: { min: '₹X.XXL', max: '₹X.XXL', _placeholder: true },
      idealFor: [],
      verdict: { headline: '', summary: '', highlightType: 'neutral' },
      perfectIf: '',
      skipIf: '',
      keyAdvantage: ''
    });
    
    // Add placeholder price range if not present
    if (!result.priceRange) {
      result.priceRange = { min: '₹X.XXL', max: '₹X.XXL', _placeholder: true, _source: 'Requires pricing API' };
    }
    
    onProgress?.({ 
      step: 'quick_decision', 
      status: 'complete', 
      message: `Generated verdict: ${result.verdict?.headline || 'Complete'}`,
      duration: Date.now() - startTime
    });
    
    return result;
  } catch (error) {
    onProgress?.({ step: 'quick_decision', status: 'error', message: String(error) });
    throw error;
  }
}

/**
 * Generate segment scorecard
 */
async function generateSegmentScorecard(
  corpus: SingleVehicleCorpus,
  ownerPulse: OwnerPulseSection,
  onProgress?: ProgressCallback
): Promise<SegmentScorecardSection> {
  onProgress?.({ step: 'scorecard', status: 'in-progress', message: 'Generating segment rankings...' });
  
  const startTime = Date.now();
  
  try {
    const prompt = buildSegmentScorecardPrompt(corpus, ownerPulse);
    const response = await callClaude(
      SEGMENT_SCORECARD_SYSTEM_PROMPT,
      prompt,
      'single_vehicle_scorecard'
    );
    
    console.log('[Generator] Scorecard raw response length:', response.length);
    console.log('[Generator] Scorecard raw response preview:', response.substring(0, 500));
    
    let result = parseJsonSafely<SegmentScorecardSection | { segmentScorecard: SegmentScorecardSection }>(response, {
      leadingCount: 0,
      badge: 'Analyzing...',
      categories: [],
      summary: ''
    });
    
    // Handle case where AI returns wrapped object: {"segmentScorecard": {...}}
    if ('segmentScorecard' in result && result.segmentScorecard) {
      console.log('[Generator] Scorecard was wrapped in key, extracting...');
      result = result.segmentScorecard as SegmentScorecardSection;
    }
    
    // Cast to proper type after extraction
    const scorecard = result as SegmentScorecardSection;
    
    console.log('[Generator] Scorecard parsed result:', {
      leadingCount: scorecard.leadingCount,
      badge: scorecard.badge,
      categoriesCount: scorecard.categories?.length || 0,
      categories: scorecard.categories,
      summary: scorecard.summary?.substring(0, 100)
    });
    
    // Ensure categories is always an array
    if (!Array.isArray(scorecard.categories)) {
      console.warn('[Generator] Scorecard categories is not an array, using empty array');
      scorecard.categories = [];
    }
    
    onProgress?.({ 
      step: 'scorecard', 
      status: 'complete', 
      message: `Generated ${scorecard.categories?.length || 0} category rankings`,
      duration: Date.now() - startTime
    });
    
    return scorecard;
  } catch (error) {
    onProgress?.({ step: 'scorecard', status: 'error', message: String(error) });
    throw error;
  }
}

/**
 * Extract competitors from corpus
 */
async function extractCompetitors(
  corpus: SingleVehicleCorpus,
  onProgress?: ProgressCallback
): Promise<MainCompetitor[]> {
  onProgress?.({ step: 'competitors', status: 'in-progress', message: 'Extracting competitor analysis...' });
  
  const startTime = Date.now();
  
  try {
    const prompt = buildCompetitorAnalysisPrompt(corpus);
    const response = await callClaude(
      COMPETITOR_ANALYSIS_SYSTEM_PROMPT,
      prompt,
      'single_vehicle_competitors'
    );
    
    const result = parseJsonSafely<{ competitors: MainCompetitor[] }>(response, { competitors: [] });
    
    onProgress?.({ 
      step: 'competitors', 
      status: 'complete', 
      message: `Identified ${result.competitors?.length || 0} competitors`,
      duration: Date.now() - startTime
    });
    
    return result.competitors || [];
  } catch (error) {
    onProgress?.({ step: 'competitors', status: 'error', message: String(error) });
    throw error;
  }
}

/**
 * Generate good time to buy analysis (fallback without web search)
 */
async function generateGoodTimeToBuy(
  corpus: SingleVehicleCorpus,
  vehicleInfo: VehicleInfo,
  onProgress?: ProgressCallback
): Promise<GoodTimeToBuySection> {
  onProgress?.({ step: 'timing', status: 'in-progress', message: 'Analyzing buy timing...' });
  
  const startTime = Date.now();
  
  try {
    const prompt = buildGoodTimeToBuyPrompt(corpus, vehicleInfo);
    const response = await callClaude(
      'You analyze vehicle market timing based on lifecycle and discussions.',
      prompt,
      'single_vehicle_timing'
    );
    
    const result = parseJsonSafely<GoodTimeToBuySection>(response, {
      overallSignal: 'Analyzing...',
      overallSignalType: 'neutral',
      salesRank: { label: 'Sales Rank', value: 'Unknown', description: 'Data pending' },
      lifecycleCheck: { 
        label: 'Lifecycle Check', 
        status: 'Unknown', 
        statusType: 'neutral',
        faceliftExpected: 'Unknown',
        generationYear: vehicleInfo.year
      },
      timingSignal: {
        label: 'Timing Signal',
        status: 'Neutral',
        statusType: 'neutral',
        reason: 'Insufficient data'
      },
      stockAvailability: [],
      _placeholder: true
    });
    
    // Add placeholder stock availability
    if (!result.stockAvailability || result.stockAvailability.length === 0) {
      result.stockAvailability = [];
      result._placeholder = true;
    }
    
    onProgress?.({ 
      step: 'timing', 
      status: 'complete', 
      message: `Timing signal: ${result.overallSignal}`,
      duration: Date.now() - startTime
    });
    
    return result;
  } catch (error) {
    onProgress?.({ step: 'timing', status: 'error', message: String(error) });
    throw error;
  }
}

// ============================================
// WEB SEARCH DATA EXTRACTION FUNCTIONS
// ============================================

/**
 * Extract variant options from web search data
 */
async function extractVariantOptionsFromWebSearch(
  vehicleName: string,
  webData: SingleVehicleWebData,
  onProgress?: ProgressCallback
): Promise<VariantOptionsSection> {
  onProgress?.({ step: 'variants', status: 'in-progress', message: 'Extracting variant options from web data...' });
  
  const startTime = Date.now();
  
  try {
    const prompt = buildVariantOptionsPrompt(vehicleName, webData);
    const response = await callClaude(
      VARIANT_OPTIONS_SYSTEM_PROMPT,
      prompt,
      'single_vehicle_owner_pulse' // Reuse task type for model selection
    );
    
    const result = parseJsonSafely<VariantOptionsSection>(response, {
      fuelType: [],
      transmission: [],
      engineType: [],
      heroFeatures: [],
      _placeholder: true
    });
    
    // Remove placeholder marker if we got real data
    if (result.fuelType && result.fuelType.length > 0) {
      delete result._placeholder;
    }
    
    onProgress?.({ 
      step: 'variants', 
      status: 'complete', 
      message: `Extracted ${result.fuelType?.length || 0} fuel types, ${result.engineType?.length || 0} engines`,
      duration: Date.now() - startTime
    });
    
    return result;
  } catch (error) {
    console.error('[Generator] Variant extraction failed:', error);
    onProgress?.({ step: 'variants', status: 'error', message: String(error) });
    // Return placeholder on error
    return JSON.parse(buildVariantOptionsPlaceholder(vehicleName));
  }
}

/**
 * Extract cost structure from web search data
 */
async function extractCostFromWebSearch(
  vehicleName: string,
  webData: SingleVehicleWebData,
  onProgress?: ProgressCallback
): Promise<HowMuchItReallyCostsSection> {
  onProgress?.({ step: 'costs', status: 'in-progress', message: 'Extracting cost structure from web data...' });
  
  const startTime = Date.now();
  
  try {
    const prompt = buildCostStructurePrompt(vehicleName, webData);
    const response = await callClaude(
      COST_STRUCTURE_SYSTEM_PROMPT,
      prompt,
      'single_vehicle_owner_pulse' // Reuse task type for model selection
    );
    
    const result = parseJsonSafely<HowMuchItReallyCostsSection>(response, {
      location: 'Delhi NCR',
      locationDefault: true,
      selectedVariant: 'Top Variant',
      realOnRoadPrice: { amount: '₹X.XXL', value: 0, breakdown: { exShowroom: 0, rto: 0, insurance: 0, accessories: 0 } },
      monthlyBurn: {
        emi: { amount: '₹XX,XXX', value: 0 },
        fuel: { amount: '₹X,XXX', value: 0 },
        service: { amount: '₹X,XXX', value: 0 }
      },
      totalMonthly: { amount: '₹XX,XXX', value: 0 },
      _placeholder: true
    });
    
    // Remove placeholder marker if we got real data
    if (result.realOnRoadPrice && result.realOnRoadPrice.value > 0) {
      delete result._placeholder;
    }
    
    onProgress?.({ 
      step: 'costs', 
      status: 'complete', 
      message: `Extracted pricing: ${result.realOnRoadPrice?.amount || 'N/A'}`,
      duration: Date.now() - startTime
    });
    
    return result;
  } catch (error) {
    console.error('[Generator] Cost extraction failed:', error);
    onProgress?.({ step: 'costs', status: 'error', message: String(error) });
    // Return placeholder on error
    return JSON.parse(buildCostPlaceholder(vehicleName));
  }
}

/**
 * Generate good time to buy from web search data (enhanced version)
 */
async function generateGoodTimeToBuyFromWebSearch(
  vehicleName: string,
  webData: SingleVehicleWebData,
  vehicleInfo: VehicleInfo,
  onProgress?: ProgressCallback
): Promise<GoodTimeToBuySection> {
  onProgress?.({ step: 'timing', status: 'in-progress', message: 'Analyzing buy timing from web data...' });
  
  const startTime = Date.now();
  
  try {
    const prompt = buildGoodTimeToBuyFromWebSearchPrompt(vehicleName, webData, vehicleInfo);
    const response = await callClaude(
      GOOD_TIME_TO_BUY_SYSTEM_PROMPT,
      prompt,
      'single_vehicle_timing'
    );
    
    const result = parseJsonSafely<GoodTimeToBuySection>(response, {
      overallSignal: 'Analyzing...',
      overallSignalType: 'neutral',
      salesRank: { label: 'Sales Rank', value: 'Unknown', description: 'Data pending' },
      lifecycleCheck: { 
        label: 'Lifecycle Check', 
        status: 'Unknown', 
        statusType: 'neutral',
        faceliftExpected: 'Unknown',
        generationYear: vehicleInfo.year
      },
      timingSignal: {
        label: 'Timing Signal',
        status: 'Neutral',
        statusType: 'neutral',
        reason: 'Insufficient data'
      },
      stockAvailability: []
    });
    
    // Generate default stock availability if not provided
    if (!result.stockAvailability || result.stockAvailability.length === 0) {
      result.stockAvailability = [
        { color: 'White', colorCode: '#FFFFFF', waitingPeriod: '2-3 Weeks' },
        { color: 'Black', colorCode: '#1C1C1C', waitingPeriod: '3-4 Weeks' },
        { color: 'Grey', colorCode: '#5A5A5A', waitingPeriod: '2-3 Weeks' },
      ];
    }
    
    onProgress?.({ 
      step: 'timing', 
      status: 'complete', 
      message: `Timing signal: ${result.overallSignal}`,
      duration: Date.now() - startTime
    });
    
    return result;
  } catch (error) {
    console.error('[Generator] Timing extraction failed:', error);
    onProgress?.({ step: 'timing', status: 'error', message: String(error) });
    // Return a default structure
    return {
      overallSignal: 'Neutral',
      overallSignalType: 'neutral',
      salesRank: { label: 'Sales Rank', value: 'Data pending', description: 'Unable to extract from web search' },
      lifecycleCheck: { 
        label: 'Lifecycle Check', 
        status: 'Unknown', 
        statusType: 'neutral',
        faceliftExpected: 'Unknown',
        generationYear: vehicleInfo.year
      },
      timingSignal: {
        label: 'Timing Signal',
        status: 'Neutral',
        statusType: 'neutral',
        reason: 'Insufficient data from web search'
      },
      stockAvailability: []
    };
  }
}

/**
 * Main generator function - orchestrates the full pipeline
 * Enhanced: Uses web search data when available for real pricing/variants
 */
export async function generateSingleVehicleContent(
  corpus: SingleVehicleCorpus,
  onProgress?: ProgressCallback
): Promise<SingleVehicleContentResult> {
  const startTime = Date.now();
  const vehicleName = corpus.metadata?.vehicle || 'Unknown Vehicle';
  const hasWebSearch = !!corpus.webSearch;
  
  console.log(`[Generator] Starting content generation for ${vehicleName}`);
  console.log(`[Generator] Web search data available: ${hasWebSearch}`);
  
  // Step 1: Extract vehicle info
  onProgress?.({ step: 'vehicle_info', status: 'in-progress', message: 'Parsing vehicle information...' });
  const vehicleInfo = await extractVehicleInfo(vehicleName);
  onProgress?.({ step: 'vehicle_info', status: 'complete', message: `${vehicleInfo.make} ${vehicleInfo.model}` });
  
  // Step 2: Extract owner pulse (foundation for other steps)
  // Note: buildOwnerPulsePrompt now uses transcripts only (no comments)
  const ownerPulse = await extractOwnerPulse(corpus, onProgress);
  
  // Step 3-5: Run in parallel for speed
  // These steps now use web search data in their prompts if available
  const [quickDecision, segmentScorecard, competitors] = await Promise.all([
    generateQuickDecision(corpus, ownerPulse, onProgress),
    generateSegmentScorecard(corpus, ownerPulse, onProgress),
    extractCompetitors(corpus, onProgress),
  ]);
  
  // Step 6: Generate variant options, costs, and timing
  // Use web search data if available, otherwise use placeholders
  let variantOptions: VariantOptionsSection;
  let costData: HowMuchItReallyCostsSection;
  let goodTimeToBuy: GoodTimeToBuySection;
  
  if (hasWebSearch && corpus.webSearch) {
    console.log(`[Generator] Using web search data for variants, costs, and timing`);
    
    // Run these in parallel
    const [variants, costs, timing] = await Promise.all([
      extractVariantOptionsFromWebSearch(vehicleName, corpus.webSearch, onProgress),
      extractCostFromWebSearch(vehicleName, corpus.webSearch, onProgress),
      generateGoodTimeToBuyFromWebSearch(vehicleName, corpus.webSearch, vehicleInfo, onProgress),
    ]);
    
    variantOptions = variants;
    costData = costs;
    goodTimeToBuy = timing;
  } else {
    console.log(`[Generator] No web search data, using placeholders for variants/costs`);
    
    // Use placeholders for variants and costs
    variantOptions = JSON.parse(buildVariantOptionsPlaceholder(vehicleName));
    costData = JSON.parse(buildCostPlaceholder(vehicleName));
    
    // Use corpus-based timing analysis (falls back to transcripts/discussions)
    goodTimeToBuy = await generateGoodTimeToBuy(corpus, vehicleInfo, onProgress);
  }
  
  // Assemble final content
  const content: SingleVehiclePageContent = {
    vehicle: vehicleInfo,
    quickDecision,
    howMuchItReallyCosts: costData,
    variantOptions,
    segmentScorecard,
    mainCompetitors: competitors,
    goodTimeToBuy,
    ownerPulse,
    dataSource: {
      corpus: `${vehicleName.toLowerCase().replace(/\s+/g, '_')}_corpus.json`,
      totalVideos: corpus.youtube?.total_videos || 0,
      totalComments: corpus.metadata?.totalComments || 0,
      sources: [
        ...corpus.metadata?.sourcesUsed || [],
        ...(hasWebSearch ? ['WebSearch'] : [])
      ],
      extractedAt: corpus.metadata?.scrapedAt || new Date().toISOString(),
      lastUpdated: new Date().toISOString().split('T')[0]
    }
  };
  
  // Apply key ordering to ensure consistent JSON output
  const orderedContent = reorderPageContentKeys(content);
  
  const processingTime = Date.now() - startTime;
  const stepsCompleted = hasWebSearch ? 9 : 6; // More steps with web search
  
  console.log(`[Generator] Content generation complete in ${processingTime}ms`);
  
  onProgress?.({ 
    step: 'complete', 
    status: 'complete', 
    message: `Content generation complete!${hasWebSearch ? ' (with web search data)' : ''}`,
    duration: processingTime
  });
  
  return {
    content: orderedContent,
    metadata: {
      generated_at: new Date().toISOString(),
      processing_time_ms: processingTime,
      model_used: 'claude-sonnet-4.5 / claude-haiku-4.5',
      steps_completed: stepsCompleted
    }
  };
}

/**
 * Generate content with retry logic
 */
export async function generateSingleVehicleContentWithRetry(
  corpus: SingleVehicleCorpus,
  onProgress?: ProgressCallback,
  maxRetries: number = 2
): Promise<SingleVehicleContentResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Generator] Attempt ${attempt}/${maxRetries}`);
      return await generateSingleVehicleContent(corpus, onProgress);
    } catch (error: any) {
      lastError = error;
      console.error(`[Generator] Attempt ${attempt} failed:`, error.message);
      
      // Don't retry on auth errors
      if (error.message?.includes('API key') || error.message?.includes('401')) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = 1000 * attempt;
        console.log(`[Generator] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Content generation failed after all retries');
}
