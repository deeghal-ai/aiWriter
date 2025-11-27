import {
  InsightExtractionResult,
  PersonaGenerationResult,
  VerdictGenerationResult,
  NarrativePlan,
} from '../types';

export function buildNarrativePlanningPrompt(
  bike1Name: string,
  bike2Name: string,
  insights: InsightExtractionResult,
  personas: PersonaGenerationResult,
  verdicts: VerdictGenerationResult
): string {
  return `<role>
You are a senior motorcycle journalist planning a comparison article. Your job is to find the STORY in this data—not just organize facts, but identify the narrative that will hook readers and guide them to a decision.
</role>

<bikes>
Bike 1: ${bike1Name}
Bike 2: ${bike2Name}
</bikes>

<insights_summary>
${bike1Name} - Top Praises: ${insights.bike1.praises.slice(0, 5).map(p => p.category).join(', ')}
${bike1Name} - Top Complaints: ${insights.bike1.complaints.slice(0, 3).map(c => c.category).join(', ')}
${bike1Name} - Surprising: ${insights.bike1.surprising_insights?.[0] || 'None identified'}

${bike2Name} - Top Praises: ${insights.bike2.praises.slice(0, 5).map(p => p.category).join(', ')}
${bike2Name} - Top Complaints: ${insights.bike2.complaints.slice(0, 3).map(c => c.category).join(', ')}
${bike2Name} - Surprising: ${insights.bike2.surprising_insights?.[0] || 'None identified'}
</insights_summary>

<personas>
${personas.personas.map((p, i) => `
Persona ${i + 1}: ${p.name} - "${p.title}"
- Usage: ${p.usagePattern.cityCommute}% city, ${p.usagePattern.highway}% highway
- Priorities: ${p.priorities.slice(0, 3).join(', ')}
- Archetype: "${p.archetypeQuote}"
`).join('\n')}
</personas>

<verdicts_summary>
${verdicts.verdicts.map(v => `
${v.personaName} → ${v.recommendedBike} (${v.confidence}% confidence)
Reason: ${v.reasoning[0]?.point || 'N/A'}
`).join('\n')}

Overall: ${verdicts.summary.bike1Wins} personas choose ${bike1Name}, ${verdicts.summary.bike2Wins} choose ${bike2Name}
Closest call: ${verdicts.summary.closestCall}
</verdicts_summary>

<your_task>
Analyze this data and create a NARRATIVE PLAN for the article. Output a JSON object with:

1. **story_angle**: The central tension/conflict of this comparison (one sentence)
2. **hook_strategy**: Which of these hook types to use:
   - "WhatsApp Debate" (friends arguing)
   - "Unexpected Truth" (common belief that's wrong)
   - "Specific Scenario" (day-in-the-life)
   - "Price Paradox" (cheaper one isn't always cheaper)
3. **hook_elements**: Specific details to include in hook
4. **truth_bomb**: The single most surprising/contrarian insight to lead with
5. **quote_allocation**: Which owner quotes to use in which sections (max 20 quotes total)
6. **tension_points**: 3-4 key trade-offs that create reader tension
7. **matrix_focus_areas**: Top 5 comparison dimensions based on persona priorities
8. **contrarian_angle**: The "why you might hate the winner" perspective
9. **closing_insight**: The unexpected truth to end with
10. **callbacks**: Elements to reference across sections for coherence
</your_task>

<output_format>
{
  "story_angle": "string",
  "hook_strategy": "WhatsApp Debate" | "Unexpected Truth" | "Specific Scenario" | "Price Paradox",
  "hook_elements": {
    "scenario": "string",
    "tension": "string",
    "promise": "string"
  },
  "truth_bomb": "string",
  "quote_allocation": {
    "hook": ["quote1"],
    "matrix_engine": ["quote2", "quote3"],
    "matrix_comfort": ["quote4"],
    "verdict": ["quote5", "quote6"]
  },
  "tension_points": [
    { "dimension": "string", "bike1_wins": "string", "bike2_wins": "string" }
  ],
  "matrix_focus_areas": ["Engine Character", "Real-World Comfort", ...],
  "contrarian_angle": {
    "target_persona": "string",
    "why_they_might_hate_winner": "string"
  },
  "closing_insight": "string",
  "callbacks": [
    { "introduce_in": "section", "callback_in": "section", "element": "string" }
  ]
}
</output_format>

Output ONLY valid JSON:`;
}

