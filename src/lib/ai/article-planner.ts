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

  return `<role>
  You are not a spec-sheet reader; you are a cynical, experienced motorcycle columnist. 
  You value "character" over "horsepower" and "survival" over "top speed." 
  Your writing style is punchy, opinionated, and rooted in the chaotic reality of Indian roads.
  You understand that a bike is an emotional purchase justified by fake logic.
</role>

<task>Create a narrative plan for a ${bike1Name} vs ${bike2Name} column.</task>

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
1. story_angle: Define the PHILOSOPHICAL conflict (Thematic Anchor). Don't just compare bikes; compare the types of people who ride them (e.g., "Logic vs. Emotion").
2. hook_strategy: SELECT the strategy that best fits the data (use the suggestion if it fits):
   - "WhatsApp Debate" (The Group Chat War): Start mid-argument. Genuine conflict.
   - "Unexpected Truth" (The Confession): Admit a bias the bike destroyed.
   - "Specific Scenario" (The Traffic Signal Moment): A sensory-rich instant that defines the experience.
   - "Price Paradox" (Wallet vs. Ego): The grim reality of EMI vs. the social flex.
3. hook_elements: Must contain SENSORY ANCHORS (heat, vibration, noise) and Indian road specifics (potholes, autos, heat).
4. truth_bomb: The single most uncomfortable data point. Pick a side based on data; avoid being "balanced."
5. quote_allocation: Assign quote numbers (Q1, Q2...). Treat quotes as "Voices": The Mechanic (reliability), The Pillion (comfort), The Banker (cost).
6. tension_points: 3-4 "Friction Points." Not just cons, but things that make a rider scream inside their helmet.
7. matrix_focus_areas: Top 3 dimensions that IGNORE THE BROCHURE. Focus on "Real World Metrics" (e.g., "Overtaking Confidence" instead of "Torque"). ONLY 3 areas - pick the most differentiating ones.
8. contrarian_angle: Why the "Winner" might be the wrong choice for 30% of buyers (The Devil's Advocate).
9. closing_insight: A final sentence that references the opening hook but flips the perspective.
10. callbacks: Elements to reference across sections for cohesion.
</planning_rules>

<anti_patterns>
❌ BAD story_angle: "Comparing the Classic 350 and the H'ness CB350."
✅ GOOD story_angle: "The battle between a cult you join and a machine you own."

❌ BAD truth_bomb: "The Honda is smoother, but the Enfield has character."
✅ GOOD truth_bomb: "The Honda is technically perfect, which is exactly why it feels sterile compared to the Enfield's charming imperfections."

❌ BAD hook_elements: { scenario: "Riding in the city", tension: "Traffic is bad", promise: "Which bike handles it?" }
✅ GOOD hook_elements: { scenario: "Stuck at the Silk Board junction, 38°C heat", tension: "My wrist hurts on the KTM, the guy on the Hero looks happy", promise: "Why 'Performance' implies suffering." }

❌ BAD matrix_focus_areas: ["Mileage", "Suspension", "Looks"]
✅ GOOD matrix_focus_areas: ["Kitna Deti Hai (Real World)", "Spine Health on Potholes", "Head-turn factor at the signal"]
</anti_patterns>

<schema>
{
  "story_angle": "string - central narrative tension / thematic anchor",
  "hook_strategy": "WhatsApp Debate|Unexpected Truth|Specific Scenario|Price Paradox",
  "hook_elements": {
    "scenario": "specific situation with sensory details",
    "tension": "what is at stake emotionally or financially",
    "promise": "what the reader will learn about themselves"
  },
  "truth_bomb": "most surprising/uncomfortable insight from the data",
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
  "matrix_focus_areas": ["Specific Area 1", "Specific Area 2", "Specific Area 3"],
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
export const NARRATIVE_PLANNER_SYSTEM = 'You are a cynical, expert motorcycle columnist. Plan compelling narratives based on real data. Output only valid JSON.';