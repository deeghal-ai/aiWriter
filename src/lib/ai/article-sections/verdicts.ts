import {
  VerdictGenerationResult,
  PersonaGenerationResult,
  NarrativePlan,
  InsightExtractionResult,
} from '../../types';

/**
 * Build verdicts section prompt with comprehensive verdict data
 * Ensures balanced coverage of all personas and both bikes
 */
export function buildVerdictsPrompt(
  verdicts: VerdictGenerationResult,
  personas: PersonaGenerationResult,
  narrativePlan: NarrativePlan,
  insights?: InsightExtractionResult
): string {
  const verdictsArray = verdicts?.verdicts || [];
  const personasArray = personas?.personas || [];
  
  // Build comprehensive verdict descriptions
  const verdictDescriptions = verdictsArray.map(v => {
    // Find matching persona for additional context
    const persona = personasArray.find(p => p.id === v.personaId);
    
    return `<verdict persona="${v.personaName}">
Persona: ${v.personaName} - "${v.personaTitle}"
Winner: ${v.recommendedBike}
Loser: ${v.otherBike}
Confidence: ${v.confidence}%
Explanation: ${v.confidenceExplanation}

Key Reasons:
${(v.reasoning || []).map((r, i) => `${i + 1}. ${r.point}
   Priority addressed: ${r.priority}
   Evidence: ${r.evidence}`).join('\n')}

Counter-Arguments (when other bike wins):
${(v.againstReasons || []).map(ar => `• ${ar}`).join('\n')}

${v.tangibleImpact ? `Tangible Impact:
• ${v.tangibleImpact.metric}: ${v.tangibleImpact.value}
• ${v.tangibleImpact.explanation}` : ''}

Verdict One-Liner: "${v.verdictOneLiner}"

Persona Priorities: ${(persona?.priorities || []).slice(0, 3).join(', ')}
Persona Quote: "${persona?.archetypeQuote || ''}"
</verdict>`;
  }).join('\n\n');

  // Summary stats
  const bike1Wins = verdicts?.summary?.bike1Wins || 0;
  const bike2Wins = verdicts?.summary?.bike2Wins || 0;
  const closestCall = verdicts?.summary?.closestCall || 'Close across the board';

  return `<role>You're writing final verdicts. Each persona gets a clear, confident recommendation.</role>

<task>Write 400-500 words total with 100-120 words per persona, plus 40-word summary. Be CONCISE - cut fluff.</task>

<verdict_data>
${verdictDescriptions}
</verdict_data>

<summary_stats>
Bike 1 wins: ${bike1Wins} personas
Bike 2 wins: ${bike2Wins} personas
Closest call: ${closestCall}
</summary_stats>

<structure>
## The Verdicts

For each persona (100-120 words):

### For [Persona Name]: [Winning Bike] ([Confidence]%)

[Opening: Address them directly, acknowledge THEIR specific priorities from persona data]

[Why this bike wins for THEM: 2-3 key reasons directly from verdict reasoning, grounded in their scenarios]

[The honest counter-argument: When would they reconsider? Use againstReasons data]

[Closing one-liner: Use or adapt the verdictOneLiner, make it memorable and specific to them]

---

After all personas:

### The Pattern

[50 words synthesizing: What's the common thread? When does each bike win? Who's the "default" winner vs the "specific" winner?]
</structure>

<requirements>
1. Total: 400-500 words (100-120 per persona + 40-word summary) - BE CONCISE
2. FIRST PERSON address: "For you, [Name]..." not "For [Name]..."
3. Confidence percentage PROMINENTLY displayed
4. Reference SPECIFIC priorities from persona data
5. End each verdict with ONE memorable closing line
6. Final pattern section: 40 words MAX
7. DO NOT re-describe personas - readers already know them from the Personas section
</requirements>

<tone>
Confident and direct. You're helping them decide, not hedging. No "it depends" energy.
</tone>

<anti_patterns>
❌ BAD opening: "Based on our analysis, we recommend..."
✅ GOOD opening: "Rahul, you told us your #1 priority is not being stranded on ORR. Let's talk about that."

❌ BAD reasoning: "Better performance and value"
✅ GOOD reasoning: "That 45km Whitefield commute you mentioned? The Honda's 42kmpl vs the RE's 35kmpl saves you ₹8,000/year"

❌ BAD counter: "The other bike is also good"
✅ GOOD counter: "One scenario where you'd regret this: If you get transferred to Mysore and suddenly it's 140km highway runs, the RE's cruise comfort becomes non-negotiable"

❌ BAD closing: "A great choice for your needs"
✅ GOOD closing: "Your wife gets a comfortable pillion seat. Your wallet gets the better mileage. Your dignity? That stays intact when it starts on the first kick every morning."

❌ BAD pattern: "Both bikes have their place"
✅ GOOD pattern: "The pattern is clear: commute-heavy riders lean Honda, weekend-warriors lean RE. If your week looks like 80% traffic/20% fun, Honda. Flip it, and RE wins."
</anti_patterns>

<critical_constraint>
DO NOT repeat persona backgrounds - readers already read the Personas section.
DO NOT re-explain bike strengths covered in Matrix sections.
Focus ONLY on the verdict and reasoning. Be surgical.
</critical_constraint>

<example_verdict>
### For Vikram: Honda CB350 (78%)

Vikram, your #1 priority was loud and clear: "I can't afford a breakdown on ORR." Let's address that directly.

The CB350 isn't the exciting choice—it's the smart one. Honda's service network in Bangalore means 8 authorized centers within your 10km radius. The closest RE workshop? 14km through traffic. When something goes wrong at 8:30 AM on a Monday, that difference isn't trivial—it's the difference between making your standup and explaining to your manager.

The numbers back this up: CB350 owners report 2 service visits per year vs 4 for Classic 350 owners. That's not just convenience—that's 8 fewer hours spent in service center waiting rooms annually.

But here's the honest counter: If you get that Mysore transfer you've been eyeing, the Classic's touring comfort becomes hard to ignore. Highway cruising is where RE shines, and 280km weekend runs would change the calculus entirely.

**The verdict:** For a reliability-obsessed upgrader whose biggest fear is being stranded on the ring road, Honda's proven track record beats RE's character. Your wife agrees.
</example_verdict>

Write the section now:`;
}
