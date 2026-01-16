/**
 * Condensed context builder for article generation
 * Reduces token count while preserving essential information
 * Uses XML-tagged structure for faster Claude processing
 */

import {
  InsightExtractionResult,
  PersonaGenerationResult,
  VerdictGenerationResult,
} from '../types';

/**
 * Build condensed context for article sections
 * Reduces 15-20K tokens to ~5K while preserving key information
 */
export function buildCondensedContext(
  bike1Name: string,
  bike2Name: string,
  insights: InsightExtractionResult,
  personas: PersonaGenerationResult,
  verdicts: VerdictGenerationResult
): CondensedArticleContext {
  return {
    bikes: {
      bike1: bike1Name,
      bike2: bike2Name,
    },
    insights: condensedInsights(insights),
    personas: condensedPersonas(personas),
    verdicts: condensedVerdicts(verdicts),
    keyQuotes: extractKeyQuotes(insights, 25), // Increased to capture more "voice"
    tensionPoints: identifyTensionPoints(insights, verdicts),
    hookData: extractHookData(insights, personas, verdicts),
    proseContext: extractProseContext(insights, bike1Name, bike2Name),
  };
}

/**
 * Extract prose context from enhanced BikeInsights fields
 * This provides rich narrative context for article generation
 */
function extractProseContext(
  insights: InsightExtractionResult,
  bike1Name: string,
  bike2Name: string
): ProseContext {
  const bike1 = insights.bike1;
  const bike2 = insights.bike2;

  return {
    bike1: extractBikeProseContext(bike1, bike1Name),
    bike2: extractBikeProseContext(bike2, bike2Name),
    headToHead: extractHeadToHeadContext(bike1, bike2, bike1Name, bike2Name),
  };
}

/**
 * Extract prose context for a single bike
 */
function extractBikeProseContext(bikeInsights: any, bikeName: string): BikeProseContext {
  const contextSummary = bikeInsights?.contextual_summary || {};
  const realWorld = bikeInsights?.real_world_observations || {};
  const usage = bikeInsights?.usage_patterns || {};

  return {
    name: bikeName,
    reviewerConsensus: contextSummary.reviewer_consensus || '',
    ownerConsensus: contextSummary.owner_consensus || '',
    keyControversies: contextSummary.key_controversies || '',
    realWorldObservations: {
      dailyUse: realWorld.daily_use || [],
      longDistance: realWorld.long_distance || [],
      pillionExperience: realWorld.pillion_experience || [],
      ownershipQuirks: realWorld.ownership_quirks || [],
    },
    usagePatterns: {
      primaryUseCase: usage.primary_use_case || '',
      typicalDailyDistance: usage.typical_daily_distance || '',
      commonModifications: usage.common_modifications || [],
    },
  };
}

/**
 * Extract head-to-head comparison context from both bikes
 * Uses comparison_context from extraction if available, otherwise infers from praises/complaints
 */
function extractHeadToHeadContext(
  bike1: any,
  bike2: any,
  bike1Name: string,
  bike2Name: string
): ProseContext['headToHead'] {
  // If comparison_context exists in the extraction, use it
  const bike1Comparison = bike1?.comparison_context || {};
  const bike2Comparison = bike2?.comparison_context || {};

  let bike1Advantages = bike1Comparison.wins_against_competitor || [];
  let bike2Advantages = bike2Comparison.wins_against_competitor || [];
  let subjectivePreferences = [
    ...(bike1Comparison.subjective_preferences || []),
    ...(bike2Comparison.subjective_preferences || []),
  ];

  // If no explicit comparison context, infer from praises/complaints
  if (bike1Advantages.length === 0 && bike2Advantages.length === 0) {
    // Top praises for bike1 that are complaints for bike2 = advantages
    const bike2ComplaintCategories: string[] = (bike2?.complaints || [])
      .map((c: any) => c.category.toLowerCase());

    // Find areas where bike1 is praised but bike2 is complained about
    bike1Advantages = (bike1?.praises || [])
      .filter((p: any) => {
        const cat = p.category.toLowerCase();
        return bike2ComplaintCategories.some((cc: string) =>
          cat.includes(cc) || cc.includes(cat.split(' ')[0])
        );
      })
      .slice(0, 3)
      .map((p: any) => `${bike1Name} excels at ${p.category}`);

    // Vice versa for bike2
    const bike1ComplaintCategories: string[] = (bike1?.complaints || [])
      .map((c: any) => c.category.toLowerCase());

    bike2Advantages = (bike2?.praises || [])
      .filter((p: any) => {
        const cat = p.category.toLowerCase();
        return bike1ComplaintCategories.some((cc: string) =>
          cat.includes(cc) || cc.includes(cat.split(' ')[0])
        );
      })
      .slice(0, 3)
      .map((p: any) => `${bike2Name} excels at ${p.category}`);
  }

  return {
    bike1Advantages,
    bike2Advantages,
    subjectivePreferences: [...new Set(subjectivePreferences)].slice(0, 4),
  };
}

export interface CondensedArticleContext {
  bikes: {
    bike1: string;
    bike2: string;
  };
  insights: CondensedInsights;
  personas: CondensedPersona[];
  verdicts: CondensedVerdict[];
  keyQuotes: KeyQuote[];
  tensionPoints: TensionPoint[];
  hookData: HookData;
  // Enhanced context for richer article generation (from extraction prose fields)
  proseContext: ProseContext;
}

/**
 * Enhanced prose context extracted from raw data
 * This provides richer context for persona, verdict, and article stages
 * Not displayed in Extract UI but passed to all subsequent stages
 */
interface ProseContext {
  bike1: BikeProseContext;
  bike2: BikeProseContext;
  // Cross-bike comparison context
  headToHead: {
    bike1Advantages: string[];
    bike2Advantages: string[];
    subjectivePreferences: string[]; // "Some prefer X's thump, others find it tiring"
  };
}

interface BikeProseContext {
  name: string;
  // Consensus summaries from reviewers and owners
  reviewerConsensus: string;
  ownerConsensus: string;
  keyControversies: string;
  // Real-world observations (high value for article writing)
  realWorldObservations: {
    dailyUse: string[];
    longDistance: string[];
    pillionExperience: string[];
    ownershipQuirks: string[];
  };
  // Usage patterns
  usagePatterns: {
    primaryUseCase: string;
    typicalDailyDistance: string;
    commonModifications: string[];
  };
}

interface CondensedInsights {
  bike1: {
    name: string;
    strengths: string[]; // Top 5 praise categories
    weaknesses: string[]; // Top 4 complaint categories
    surprising: string[]; // All surprising insights
  };
  bike2: {
    name: string;
    strengths: string[];
    weaknesses: string[];
    surprising: string[];
  };
  totalQuotes: number;
}

interface CondensedPersona {
  id: string;
  name: string;
  title: string;
  usage: string; // "70% city, 20% highway, 10% leisure"
  topPriorities: string[];
  archetypeQuote: string;
}

interface CondensedVerdict {
  personaName: string;
  winner: string;
  confidence: number;
  topReason: string;
  againstReason: string;
}

interface KeyQuote {
  text: string;
  author: string;
  source: string;
  bikeName: string;
  sentiment: 'praise' | 'complaint';
  category: string;
}

interface TensionPoint {
  dimension: string;
  bike1Wins: string;
  bike2Wins: string;
}

interface HookData {
  priceGap: boolean; // Can use Price Paradox?
  personasSplit: boolean; // Can use WhatsApp Debate?
  hasSurprisingContrarian: boolean; // Can use Unexpected Truth?
  hasDistinctScenarios: boolean; // Can use Specific Scenario?
  mostCompellingInsight: string;
  mostDividedTopic: string;
  sensoryDetails: string[]; // Added to capture "heat", "vibration", "noise"
}

function condensedInsights(insights: InsightExtractionResult): CondensedInsights {
  const bike1Praises = insights.bike1?.praises || [];
  const bike1Complaints = insights.bike1?.complaints || [];
  const bike2Praises = insights.bike2?.praises || [];
  const bike2Complaints = insights.bike2?.complaints || [];

  return {
    bike1: {
      name: insights.bike1?.name || 'Bike 1',
      strengths: bike1Praises
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5)
        .map(p => `${p.category} (${p.frequency}x)`),
      weaknesses: bike1Complaints
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 4)
        .map(c => `${c.category} (${c.frequency}x)`),
      surprising: filterUsefulSurprisingInsights(insights.bike1?.surprising_insights || []),
    },
    bike2: {
      name: insights.bike2?.name || 'Bike 2',
      strengths: bike2Praises
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5)
        .map(p => `${p.category} (${p.frequency}x)`),
      weaknesses: bike2Complaints
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 4)
        .map(c => `${c.category} (${c.frequency}x)`),
      surprising: filterUsefulSurprisingInsights(insights.bike2?.surprising_insights || []),
    },
    totalQuotes: insights.metadata?.total_quotes || 0,
  };
}

/**
 * Filter surprising insights to prioritize actionable, contrarian findings
 * - Prioritize insights that contradict marketing/specs
 * - Prioritize insights with specific data points (numbers, percentages)
 * - Deprioritize generic/vague statements
 * - Limit to 3-4 most useful insights
 */
function filterUsefulSurprisingInsights(insights: string[], maxCount: number = 4): string[] {
  if (!insights || insights.length === 0) return [];
  
  // Score each insight for usefulness
  const scoredInsights = insights.map(insight => {
    let score = 0;
    const lowerInsight = insight.toLowerCase();
    
    // +3: Contains specific numbers/percentages (more actionable)
    if (/\d+%|\d+\s*(kmpl|km\/l|bhp|nm|kg|km|rupees|₹|lakh|rs)/i.test(insight)) {
      score += 3;
    }
    
    // +2: Contrarian language (contradicts expectations)
    const contrarianPhrases = ['despite', 'contrary to', 'unexpectedly', 'surprisingly', 
      'however', 'but actually', 'not as', 'better than expected', 'worse than'];
    if (contrarianPhrases.some(phrase => lowerInsight.includes(phrase))) {
      score += 2;
    }
    
    // +2: Mentions specific comparison or trade-off
    if (/vs|versus|compared to|than the|over the/i.test(insight)) {
      score += 2;
    }
    
    // +1: Mentions real-world scenarios
    const scenarioPhrases = ['traffic', 'highway', 'commute', 'pillion', 'monsoon', 
      'service', 'mileage', 'city', 'long ride', 'daily'];
    if (scenarioPhrases.some(phrase => lowerInsight.includes(phrase))) {
      score += 1;
    }
    
    // -2: Too generic/vague
    const genericPhrases = ['good bike', 'nice bike', 'great motorcycle', 'overall good',
      'recommended', 'value for money', 'bang for buck'];
    if (genericPhrases.some(phrase => lowerInsight.includes(phrase))) {
      score -= 2;
    }
    
    // -1: Too short (likely not detailed enough)
    if (insight.length < 40) {
      score -= 1;
    }
    
    // +1: Longer, more detailed insights
    if (insight.length > 80) {
      score += 1;
    }
    
    return { insight, score };
  });
  
  // Sort by score (descending) and take top N
  return scoredInsights
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCount)
    .map(s => s.insight);
}

function condensedPersonas(personas: PersonaGenerationResult): CondensedPersona[] {
  return (personas?.personas || []).map(p => ({
    id: p.id,
    name: p.name,
    title: p.title,
    usage: `${p.usagePattern?.cityCommute || 0}% city, ${p.usagePattern?.highway || 0}% highway, ${p.usagePattern?.urbanLeisure || 0}% leisure`,
    topPriorities: (p.priorities || []).slice(0, 3),
    archetypeQuote: p.archetypeQuote || '',
  }));
}

function condensedVerdicts(verdicts: VerdictGenerationResult): CondensedVerdict[] {
  return (verdicts?.verdicts || []).map(v => ({
    personaName: v.personaName,
    winner: v.recommendedBike,
    confidence: v.confidence,
    topReason: v.reasoning?.[0]?.point || 'Best match for priorities',
    againstReason: v.againstReasons?.[0] || 'Some riders may prefer alternatives',
  }));
}

function extractKeyQuotes(insights: InsightExtractionResult, maxQuotes: number): KeyQuote[] {
  const quotes: KeyQuote[] = [];

  // Collect from both bikes, both praises and complaints
  const sources = [
    { bike: insights.bike1, bikeName: insights.bike1?.name || 'Bike 1' },
    { bike: insights.bike2, bikeName: insights.bike2?.name || 'Bike 2' },
  ];

  for (const { bike, bikeName } of sources) {
    if (!bike) continue;

    // Get praises
    for (const praise of (bike.praises || []).slice(0, 3)) {
      for (const quote of (praise.quotes || []).slice(0, 2)) {
        quotes.push({
          text: quote.text.slice(0, 150), // Truncate long quotes
          author: quote.author,
          source: quote.source,
          bikeName,
          sentiment: 'praise',
          category: praise.category,
        });
      }
    }

    // Get complaints - prioritized for "Cynical Columnist" tone
    for (const complaint of (bike.complaints || []).slice(0, 3)) { // Increased complaint sampling
      for (const quote of (complaint.quotes || []).slice(0, 2)) {
        quotes.push({
          text: quote.text.slice(0, 150),
          author: quote.author,
          source: quote.source,
          bikeName,
          sentiment: 'complaint',
          category: complaint.category,
        });
      }
    }
  }

  // Return most diverse selection
  return quotes.slice(0, maxQuotes);
}

function identifyTensionPoints(
  insights: InsightExtractionResult,
  verdicts: VerdictGenerationResult
): TensionPoint[] {
  const points: TensionPoint[] = [];
  const bike1Name = insights.bike1?.name || 'Bike 1';
  const bike2Name = insights.bike2?.name || 'Bike 2';

  // Find dimensions where bikes have opposite strengths/weaknesses
  const bike1Strengths = new Set((insights.bike1?.praises || []).map(p => p.category.toLowerCase()));
  const bike2Weaknesses = new Set((insights.bike2?.complaints || []).map(c => c.category.toLowerCase()));
  const bike2Strengths = new Set((insights.bike2?.praises || []).map(p => p.category.toLowerCase()));
  const bike1Weaknesses = new Set((insights.bike1?.complaints || []).map(c => c.category.toLowerCase()));

  // Emotional dimensions mapping
  const emotionalMap: Record<string, string> = {
    'engine': 'Soul vs Efficiency',
    'comfort': 'Spine vs Style',
    'service': 'Peace of Mind vs Passion',
    'value': 'Wallet vs Heart',
    'handling': 'Agility vs Stability'
  };

  // Common dimensions to check
  const dimensions = ['engine', 'comfort', 'service', 'value', 'handling', 'reliability', 'fuel', 'build'];

  for (const dim of dimensions) {
    const bike1HasStrength = [...bike1Strengths].some(s => s.includes(dim));
    const bike2HasStrength = [...bike2Strengths].some(s => s.includes(dim));
    const bike1HasWeakness = [...bike1Weaknesses].some(w => w.includes(dim));
    const bike2HasWeakness = [...bike2Weaknesses].some(w => w.includes(dim));

    if ((bike1HasStrength && bike2HasWeakness) || (bike2HasStrength && bike1HasWeakness)) {
      const displayDim = emotionalMap[dim] || (dim.charAt(0).toUpperCase() + dim.slice(1));
      
      points.push({
        dimension: displayDim,
        bike1Wins: bike1HasStrength ? `dominates ${dim}` : `struggles with ${dim}`,
        bike2Wins: bike2HasStrength ? `dominates ${dim}` : `struggles with ${dim}`,
      });
    }
  }

  return points.slice(0, 5);
}

function extractHookData(
  insights: InsightExtractionResult,
  personas: PersonaGenerationResult,
  verdicts: VerdictGenerationResult
): HookData {
  const verdictsList = verdicts?.verdicts || [];
  const bike1Wins = verdictsList.filter(v => v.recommendedBike === insights.bike1?.name).length;
  const bike2Wins = verdictsList.filter(v => v.recommendedBike === insights.bike2?.name).length;

  // Check for price mentions in insights
  const hasPriceDiscussion = (insights.bike1?.praises || []).concat(insights.bike1?.complaints || [])
    .concat(insights.bike2?.praises || []).concat(insights.bike2?.complaints || [])
    .some(i => i.category.toLowerCase().includes('price') || i.category.toLowerCase().includes('value'));
    
  // Check for sensory details
  const allQuotesText = (insights.bike1?.praises || []).concat(insights.bike1?.complaints || [])
    .concat(insights.bike2?.praises || []).concat(insights.bike2?.complaints || [])
    .flatMap(c => c.quotes.map(q => q.text.toLowerCase())).join(' ');
    
  const sensoryKeywords = ['vibrat', 'heat', 'sound', 'noise', 'thump', 'plastic', 'rattle', 'smooth', 'jerk'];
  const foundSensory = sensoryKeywords.filter(k => allQuotesText.includes(k));

  // Find most compelling surprising insight
  const allSurprising = [
    ...(insights.bike1?.surprising_insights || []),
    ...(insights.bike2?.surprising_insights || []),
  ];

  // Find most divided topic from verdicts
  const closestVerdict = verdictsList.reduce((closest, v) => {
    if (!closest || Math.abs(v.confidence - 50) < Math.abs(closest.confidence - 50)) {
      return v;
    }
    return closest;
  }, null as typeof verdictsList[0] | null);

  return {
    priceGap: hasPriceDiscussion,
    personasSplit: bike1Wins > 0 && bike2Wins > 0,
    hasSurprisingContrarian: allSurprising.length > 0,
    hasDistinctScenarios: (personas?.personas || []).length >= 3,
    mostCompellingInsight: allSurprising[0] || 'Both bikes serve different rider needs',
    mostDividedTopic: closestVerdict?.personaName || 'General comparison',
    sensoryDetails: foundSensory,
  };
}

/**
 * Serialize context for prompt injection (XML format)
 * Enhanced with prose context for richer article generation
 */
export function serializeContextForPrompt(ctx: CondensedArticleContext): string {
  const prose = ctx.proseContext;

  return `<bikes>${ctx.bikes.bike1} vs ${ctx.bikes.bike2}</bikes>

<insights>
${ctx.bikes.bike1}:
  Strengths: ${ctx.insights.bike1.strengths.join(' | ')}
  Weaknesses: ${ctx.insights.bike1.weaknesses.join(' | ')}
  Surprising: ${ctx.insights.bike1.surprising.join(' | ')}

${ctx.bikes.bike2}:
  Strengths: ${ctx.insights.bike2.strengths.join(' | ')}
  Weaknesses: ${ctx.insights.bike2.weaknesses.join(' | ')}
  Surprising: ${ctx.insights.bike2.surprising.join(' | ')}
</insights>

<reviewer_consensus>
${ctx.bikes.bike1}: ${prose.bike1.reviewerConsensus || 'Not available'}
${ctx.bikes.bike2}: ${prose.bike2.reviewerConsensus || 'Not available'}
</reviewer_consensus>

<owner_consensus>
${ctx.bikes.bike1}: ${prose.bike1.ownerConsensus || 'Not available'}
${ctx.bikes.bike2}: ${prose.bike2.ownerConsensus || 'Not available'}
</owner_consensus>

<key_controversies>
${ctx.bikes.bike1}: ${prose.bike1.keyControversies || 'None noted'}
${ctx.bikes.bike2}: ${prose.bike2.keyControversies || 'None noted'}
</key_controversies>

<real_world_observations>
${ctx.bikes.bike1}:
  Daily use: ${prose.bike1.realWorldObservations.dailyUse.slice(0, 3).join(' | ') || 'None'}
  Long distance: ${prose.bike1.realWorldObservations.longDistance.slice(0, 2).join(' | ') || 'None'}
  Pillion: ${prose.bike1.realWorldObservations.pillionExperience.slice(0, 2).join(' | ') || 'None'}
  Ownership quirks: ${prose.bike1.realWorldObservations.ownershipQuirks.slice(0, 2).join(' | ') || 'None'}

${ctx.bikes.bike2}:
  Daily use: ${prose.bike2.realWorldObservations.dailyUse.slice(0, 3).join(' | ') || 'None'}
  Long distance: ${prose.bike2.realWorldObservations.longDistance.slice(0, 2).join(' | ') || 'None'}
  Pillion: ${prose.bike2.realWorldObservations.pillionExperience.slice(0, 2).join(' | ') || 'None'}
  Ownership quirks: ${prose.bike2.realWorldObservations.ownershipQuirks.slice(0, 2).join(' | ') || 'None'}
</real_world_observations>

<usage_patterns>
${ctx.bikes.bike1}: ${prose.bike1.usagePatterns.primaryUseCase || 'Unknown'} | Daily: ${prose.bike1.usagePatterns.typicalDailyDistance || 'Unknown'}
${ctx.bikes.bike2}: ${prose.bike2.usagePatterns.primaryUseCase || 'Unknown'} | Daily: ${prose.bike2.usagePatterns.typicalDailyDistance || 'Unknown'}
</usage_patterns>

<head_to_head>
${ctx.bikes.bike1} advantages: ${prose.headToHead.bike1Advantages.join(' | ') || 'None clear'}
${ctx.bikes.bike2} advantages: ${prose.headToHead.bike2Advantages.join(' | ') || 'None clear'}
Subjective: ${prose.headToHead.subjectivePreferences.join(' | ') || 'None noted'}
</head_to_head>

<personas>
${ctx.personas.map(p => `• ${p.name} (${p.title}): ${p.usage} | Priorities: ${p.topPriorities.join(', ')} | "${p.archetypeQuote}"`).join('\n')}
</personas>

<verdicts>
${ctx.verdicts.map(v => `• ${v.personaName} → ${v.winner} (${v.confidence}%): ${v.topReason}`).join('\n')}
</verdicts>

<tension_points>
${ctx.tensionPoints.map(t => `• ${t.dimension}: ${ctx.bikes.bike1} ${t.bike1Wins}, ${ctx.bikes.bike2} ${t.bike2Wins}`).join('\n')}
</tension_points>

<sensory_cues>
${ctx.hookData.sensoryDetails.slice(0, 5).join(', ')}
</sensory_cues>`;
}

/**
 * Get quotes for a specific section
 */
export function getQuotesForSection(
  ctx: CondensedArticleContext,
  section: 'hook' | 'matrix' | 'verdict' | 'contrarian',
  maxQuotes: number = 4
): KeyQuote[] {
  const quotes = ctx.keyQuotes;

  switch (section) {
    case 'hook':
      // Most impactful quotes (one per bike, balanced)
      return [
        quotes.find(q => q.bikeName === ctx.bikes.bike1),
        quotes.find(q => q.bikeName === ctx.bikes.bike2),
      ].filter(Boolean).slice(0, maxQuotes) as KeyQuote[];

    case 'matrix':
      // Mix of praises and complaints
      return quotes.slice(0, maxQuotes);

    case 'verdict':
      // Strong opinion quotes
      return quotes.filter(q => q.text.length > 50).slice(0, maxQuotes);

    case 'contrarian':
      // Complaint-focused quotes
      return quotes.filter(q => q.sentiment === 'complaint').slice(0, maxQuotes);

    default:
      return quotes.slice(0, maxQuotes);
  }
}

/**
 * Determine optimal hook strategy based on data
 * Uses weighted scoring with randomness for variety
 */
export function determineOptimalHookStrategy(ctx: CondensedArticleContext): {
  strategy: 'WhatsApp Debate' | 'Unexpected Truth' | 'Specific Scenario' | 'Price Paradox';
  reason: string;
  elements: { scenario: string; tension: string; promise: string };
} {
  const hookData = ctx.hookData;
  
  // Build candidates with scores (higher = better fit)
  const candidates: Array<{
    strategy: 'WhatsApp Debate' | 'Unexpected Truth' | 'Specific Scenario' | 'Price Paradox';
    score: number;
    reason: string;
    elements: { scenario: string; tension: string; promise: string };
  }> = [];

  // Price Paradox - good when price/value is discussed heavily
  if (hookData.priceGap) {
    candidates.push({
      strategy: 'Price Paradox',
      score: 70, 
      reason: 'Price/value is a major discussion point',
      elements: {
        scenario: `The ${ctx.bikes.bike1} vs ${ctx.bikes.bike2} price gap is a lie`,
        tension: 'The "cheaper" bike hides its costs in the service center bill',
        promise: 'We calculated the real price of ownership (including your sanity)',
      },
    });
  }

  // WhatsApp Debate - great when opinions are divided
  if (hookData.personasSplit) {
    candidates.push({
      strategy: 'WhatsApp Debate',
      score: 85, 
      reason: 'Personas are split between bikes - perfect for debate framing',
      elements: {
        scenario: `Your riding group chat is at war over ${ctx.bikes.bike1} vs ${ctx.bikes.bike2}`,
        tension: `${ctx.verdicts.map(v => `${v.personaName} defends the ${v.winner}`).join(', ')}`,
        promise: 'We settle the argument. Someone will be upset.',
      },
    });
  }

  // Unexpected Truth - compelling when we have a contrarian insight
  if (hookData.hasSurprisingContrarian && hookData.mostCompellingInsight) {
    candidates.push({
      strategy: 'Unexpected Truth',
      score: 90, 
      reason: 'Strong contrarian insight that challenges assumptions',
      elements: {
        scenario: hookData.mostCompellingInsight,
        tension: 'The brochures lied. The YouTubers missed it.',
        promise: 'Here is the uncomfortable truth about these machines.',
      },
    });
  }

  // Specific Scenario - immersive when we have clear use cases
  if (hookData.hasDistinctScenarios && ctx.personas.length >= 3) {
    const mainPersona = ctx.personas[0];
    const sensory = hookData.sensoryDetails[0] ? `feeling the ${hookData.sensoryDetails[0]}` : 'sweating in traffic';
    candidates.push({
      strategy: 'Specific Scenario',
      score: 75,
      reason: 'Distinct personas with clear use cases',
      elements: {
        scenario: `Monday morning. ${mainPersona.name} is ${sensory}.`,
        tension: `This is where the spec sheet dies and reality kicks in.`,
        promise: 'We rode them where it hurts. Here is the verdict.',
      },
    });
  }

  // Always add a default option
  if (candidates.length === 0) {
    candidates.push({
      strategy: 'Unexpected Truth',
      score: 50,
      reason: 'Default to contrarian angle',
      elements: {
        scenario: `${ctx.bikes.bike1} vs ${ctx.bikes.bike2} - the forgotten battle`,
        tension: 'Why are we even comparing these two? Because you asked.',
        promise: 'The answer is simpler than you think.',
      },
    });
  }

  // Add randomness to scores to create variety (±20 points)
  const randomizedCandidates = candidates.map(c => ({
    ...c,
    score: c.score + (Math.random() * 40 - 20), // Random adjustment between -20 and +20
  }));

  // Sort by score and pick the best
  randomizedCandidates.sort((a, b) => b.score - a.score);
  const winner = randomizedCandidates[0];

  return {
    strategy: winner.strategy,
    reason: winner.reason,
    elements: winner.elements,
  };
}