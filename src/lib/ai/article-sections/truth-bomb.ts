import { NarrativePlan, InsightExtractionResult } from '../../types';

export function buildTruthBombPrompt(
  narrativePlan: NarrativePlan,
  insights: InsightExtractionResult
): string {
  // Defensive check for missing truth_bomb
  const truthBomb = narrativePlan?.truth_bomb || 
    insights.bike1.surprising_insights?.[0] || 
    insights.bike2.surprising_insights?.[0] || 
    'These two bikes represent fundamentally different approaches to motorcycling';

  return `<role>
You're writing the "truth bomb" section—the surprising insight that makes readers trust you know something they don't.
</role>

<the_truth_bomb>
${truthBomb}
</the_truth_bomb>

<supporting_evidence>
${JSON.stringify(insights.bike1.surprising_insights)}
${JSON.stringify(insights.bike2.surprising_insights)}
</supporting_evidence>

<requirements>
1. Word count: 100-150 words
2. Lead with the surprising claim
3. Immediately back it up with evidence (quote or data)
4. Explain why this matters for the buying decision
5. Transition to "But first, let's understand who's actually buying these bikes..."
</requirements>

<tone>
Confident but not arrogant. You're sharing insider knowledge, not lecturing.
</tone>

<example_structure>
"Here's what the spec-sheet comparisons miss: [Truth bomb].

[Evidence—a quote from an owner or specific data point]

This matters because [implication for buyers]. It's not about which bike is 'better'—it's about which bike is better FOR YOU.

And 'you' isn't generic. We identified [X] distinct types of buyers in the forums. Let's meet them."
</example_structure>

Write the section now:`;
}

