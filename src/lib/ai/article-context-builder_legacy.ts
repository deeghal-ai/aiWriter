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
    keyQuotes: extractKeyQuotes(insights, 20), // Max 20 best quotes
    tensionPoints: identifyTensionPoints(insights, verdicts),
    hookData: extractHookData(insights, personas, verdicts),
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
      surprising: insights.bike1?.surprising_insights || [],
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
      surprising: insights.bike2?.surprising_insights || [],
    },
    totalQuotes: insights.metadata?.total_quotes || 0,
  };
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

    // Get complaints
    for (const complaint of (bike.complaints || []).slice(0, 2)) {
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

  // Common dimensions to check
  const dimensions = ['engine', 'comfort', 'service', 'value', 'handling', 'reliability', 'fuel', 'build'];

  for (const dim of dimensions) {
    const bike1HasStrength = [...bike1Strengths].some(s => s.includes(dim));
    const bike2HasStrength = [...bike2Strengths].some(s => s.includes(dim));
    const bike1HasWeakness = [...bike1Weaknesses].some(w => w.includes(dim));
    const bike2HasWeakness = [...bike2Weaknesses].some(w => w.includes(dim));

    if ((bike1HasStrength && bike2HasWeakness) || (bike2HasStrength && bike1HasWeakness)) {
      points.push({
        dimension: dim.charAt(0).toUpperCase() + dim.slice(1),
        bike1Wins: bike1HasStrength ? `Strong ${dim}` : `Weak ${dim}`,
        bike2Wins: bike2HasStrength ? `Strong ${dim}` : `Weak ${dim}`,
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
  };
}

/**
 * Serialize context for prompt injection (XML format)
 */
export function serializeContextForPrompt(ctx: CondensedArticleContext): string {
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

<personas>
${ctx.personas.map(p => `• ${p.name} (${p.title}): ${p.usage} | Priorities: ${p.topPriorities.join(', ')} | "${p.archetypeQuote}"`).join('\n')}
</personas>

<verdicts>
${ctx.verdicts.map(v => `• ${v.personaName} → ${v.winner} (${v.confidence}%): ${v.topReason}`).join('\n')}
</verdicts>

<tension_points>
${ctx.tensionPoints.map(t => `• ${t.dimension}: ${ctx.bikes.bike1} ${t.bike1Wins}, ${ctx.bikes.bike2} ${t.bike2Wins}`).join('\n')}
</tension_points>`;
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
      score: 70, // Reduced from always-first priority
      reason: 'Price/value is a major discussion point',
      elements: {
        scenario: `The ${ctx.bikes.bike1} vs ${ctx.bikes.bike2} price gap isn't what it seems`,
        tension: 'The cheaper bike might cost you more in the long run',
        promise: 'We crunched the real ownership costs',
      },
    });
  }

  // WhatsApp Debate - great when opinions are divided
  if (hookData.personasSplit) {
    candidates.push({
      strategy: 'WhatsApp Debate',
      score: 85, // High score - conflict is engaging
      reason: 'Personas are split between bikes - perfect for debate framing',
      elements: {
        scenario: `Your friends are arguing about ${ctx.bikes.bike1} vs ${ctx.bikes.bike2}`,
        tension: `${ctx.verdicts.map(v => `${v.personaName} swears by ${v.winner}`).join(', ')}`,
        promise: 'We found out who\'s actually right—and for whom',
      },
    });
  }

  // Unexpected Truth - compelling when we have a contrarian insight
  if (hookData.hasSurprisingContrarian && hookData.mostCompellingInsight) {
    candidates.push({
      strategy: 'Unexpected Truth',
      score: 90, // Highest base score - contrarian hooks perform well
      reason: 'Strong contrarian insight that challenges assumptions',
      elements: {
        scenario: hookData.mostCompellingInsight,
        tension: 'Everything you\'ve read about this comparison misses the point',
        promise: 'Here\'s what nobody tells you',
      },
    });
  }

  // Specific Scenario - immersive when we have clear use cases
  if (hookData.hasDistinctScenarios && ctx.personas.length >= 3) {
    const mainPersona = ctx.personas[0];
    candidates.push({
      strategy: 'Specific Scenario',
      score: 75, // Good score - specific scenarios are engaging
      reason: 'Distinct personas with clear use cases',
      elements: {
        scenario: `It's Monday morning. ${mainPersona.name} is stuck in traffic, questioning life choices.`,
        tension: `${mainPersona.usage} - and the bike has to survive it`,
        promise: 'We lived with both bikes for a month. Here\'s the truth.',
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
        scenario: `${ctx.bikes.bike1} vs ${ctx.bikes.bike2} comparison`,
        tension: 'The spec sheets don\'t tell you this',
        promise: 'Real owner experiences reveal the truth',
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

