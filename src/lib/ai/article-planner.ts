import {
  InsightExtractionResult,
  PersonaGenerationResult,
  VerdictGenerationResult,
  NarrativePlan,
} from '../types';
import {
  buildCondensedContext,
  determineOptimalHookStrategy,
  serializeContextForPrompt,
} from './article-context-builder';

/**
 * Build optimized narrative planning prompt
 * Uses XML tags, condensed context, and pre-computed hook strategy
 */
export function buildNarrativePlanningPrompt(
  bike1Name: string,
  bike2Name: string,
  insights: InsightExtractionResult,
  personas: PersonaGenerationResult,
  verdicts: VerdictGenerationResult
): string {
  // Build condensed context
  const ctx = buildCondensedContext(bike1Name, bike2Name, insights, personas, verdicts);
  
  // Pre-determine optimal hook strategy based on data
  const hookRecommendation = determineOptimalHookStrategy(ctx);
  
  // Get all quotes for allocation
  const allQuotes = extractAllQuotesForAllocation(insights);
  
  return `<role>Senior motorcycle journalist planning a comparison article. Find the STORY, not just facts.</role>

<task>Create a narrative plan for ${bike1Name} vs ${bike2Name} article</task>

${serializeContextForPrompt(ctx)}

<hook_recommendation>
Strategy: ${hookRecommendation.strategy}
Reason: ${hookRecommendation.reason}
Suggested elements:
- Scenario: ${hookRecommendation.elements.scenario}
- Tension: ${hookRecommendation.elements.tension}
- Promise: ${hookRecommendation.elements.promise}
</hook_recommendation>

<available_quotes>
${allQuotes.map((q, i) => `Q${i + 1}: "${q.text.slice(0, 80)}..." - ${q.author}, ${q.source} [${q.bikeName}, ${q.sentiment}]`).join('\n')}
</available_quotes>

<planning_rules>
1. story_angle: One sentence capturing the central tension
2. hook_strategy: Use the recommended "${hookRecommendation.strategy}" OR choose different if data strongly suggests otherwise
3. hook_elements: Specific, not generic. Use Indian cities, real scenarios
4. truth_bomb: Single most surprising insight from data - NOT generic
5. quote_allocation: Assign quote numbers (Q1, Q2...) to sections. Max 20 total, 2-3 per section
6. tension_points: 3-4 trade-offs that create reader tension
7. matrix_focus_areas: Top 5 comparison dimensions based on persona priorities
8. contrarian_angle: Why someone might HATE the winner
9. closing_insight: Unexpected truth to end with (quotable)
10. callbacks: Elements to reference across sections
</planning_rules>

<anti_patterns>
❌ BAD story_angle: "A comparison of two popular bikes"
✅ GOOD story_angle: "The battle between refined reliability and raw character"

❌ BAD truth_bomb: "Both bikes have their pros and cons"
✅ GOOD truth_bomb: "The 'premium' bike has 40% more service complaints in year 2"

❌ BAD hook_elements: { scenario: "Buying a bike", tension: "Hard choice", promise: "We'll help" }
✅ GOOD hook_elements: { scenario: "₹2.8L EMI vs ₹2.2L upfront, 3AM on BikeDekho", tension: "Wife thinks it's about money. It isn't.", promise: "We rode both for 2000km. Here's what matters." }

❌ BAD matrix_focus_areas: ["Performance", "Comfort", "Value"]
✅ GOOD matrix_focus_areas: ["Engine Character at 80kmph Cruise", "Bangalore Traffic Survival", "Real-World Fuel Costs", "Service Center Proximity", "Pillion Comfort Score"]
</anti_patterns>

<schema>
{
  "story_angle": "string - central narrative tension",
  "hook_strategy": "WhatsApp Debate|Unexpected Truth|Specific Scenario|Price Paradox",
  "hook_elements": {
    "scenario": "specific situation with details",
    "tension": "what's at stake",
    "promise": "what reader will learn"
  },
  "truth_bomb": "most surprising insight from the data",
  "quote_allocation": {
    "hook": ["Q1", "Q2"],
    "matrix_engine": ["Q3", "Q4", "Q5"],
    "matrix_comfort": ["Q6", "Q7"],
    "matrix_ownership": ["Q8", "Q9"],
    "verdict": ["Q10", "Q11", "Q12"]
  },
  "tension_points": [
    { "dimension": "string", "bike1_wins": "specific win", "bike2_wins": "specific counter" }
  ],
  "matrix_focus_areas": ["Specific Area 1", "Specific Area 2", "Specific Area 3", "Specific Area 4", "Specific Area 5"],
  "contrarian_angle": {
    "target_persona": "persona name who might regret winner",
    "why_they_might_hate_winner": "specific scenario where winner fails"
  },
  "closing_insight": "quotable final truth",
  "callbacks": [
    { "introduce_in": "section", "callback_in": "section", "element": "what to callback" }
  ]
}
</schema>

Output valid JSON only:`;
}

/**
 * Extract all quotes for quote allocation
 */
function extractAllQuotesForAllocation(insights: InsightExtractionResult): Array<{
  text: string;
  author: string;
  source: string;
  bikeName: string;
  sentiment: string;
}> {
  const quotes: Array<{
    text: string;
    author: string;
    source: string;
    bikeName: string;
    sentiment: string;
  }> = [];

  const sources = [
    { bike: insights.bike1, bikeName: insights.bike1?.name || 'Bike 1' },
    { bike: insights.bike2, bikeName: insights.bike2?.name || 'Bike 2' },
  ];

  for (const { bike, bikeName } of sources) {
    if (!bike) continue;

    // Praises
    for (const praise of (bike.praises || []).slice(0, 4)) {
      for (const quote of (praise.quotes || []).slice(0, 2)) {
        quotes.push({
          text: quote.text,
          author: quote.author,
          source: quote.source,
          bikeName,
          sentiment: 'praise',
        });
      }
    }

    // Complaints
    for (const complaint of (bike.complaints || []).slice(0, 3)) {
      for (const quote of (complaint.quotes || []).slice(0, 2)) {
        quotes.push({
          text: quote.text,
          author: quote.author,
          source: quote.source,
          bikeName,
          sentiment: 'complaint',
        });
      }
    }
  }

  return quotes.slice(0, 25); // Max 25 quotes for allocation
}

/**
 * System prompt for narrative planning
 */
export const NARRATIVE_PLANNER_SYSTEM = 'You are an expert motorcycle journalist. Plan compelling narratives based on real data. Output only valid JSON.';
