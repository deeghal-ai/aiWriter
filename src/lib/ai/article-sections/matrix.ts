import {
  InsightExtractionResult,
  PersonaGenerationResult,
  NarrativePlan,
} from '../../types';

export function buildMatrixPrompt(
  bike1Name: string,
  bike2Name: string,
  focusArea: string,
  insights: InsightExtractionResult,
  personas: PersonaGenerationResult,
  narrativePlan: NarrativePlan,
  allocatedQuotes: string[]
): string {
  const focusKeyword = focusArea.toLowerCase().split(' ')[0];
  
  const bike1Praises = insights.bike1.praises
    .filter(p => p.category.toLowerCase().includes(focusKeyword))
    .map(p => `• ${p.category} (${p.frequency} mentions): "${p.quotes[0]?.text}"`)
    .join('\n');
    
  const bike1Complaints = insights.bike1.complaints
    .filter(c => c.category.toLowerCase().includes(focusKeyword))
    .map(c => `• ${c.category} (${c.frequency} mentions): "${c.quotes[0]?.text}"`)
    .join('\n');
    
  const bike2Praises = insights.bike2.praises
    .filter(p => p.category.toLowerCase().includes(focusKeyword))
    .map(p => `• ${p.category} (${p.frequency} mentions): "${p.quotes[0]?.text}"`)
    .join('\n');
    
  const bike2Complaints = insights.bike2.complaints
    .filter(c => c.category.toLowerCase().includes(focusKeyword))
    .map(c => `• ${c.category} (${c.frequency} mentions): "${c.quotes[0]?.text}"`)
    .join('\n');
    
  const relevantPersonas = personas.personas
    .filter(p => 
      p.priorities.some(pri => pri.toLowerCase().includes(focusKeyword))
    )
    .map(p => `${p.name} cares about ${focusArea} because: ${p.priorities.find(pri => pri.toLowerCase().includes(focusKeyword))}`)
    .join('\n');

  return `<role>
You're writing the "${focusArea}" section of the decision matrix. This is where readers learn which bike wins in this dimension—and for WHOM.
</role>

<focus_area>${focusArea}</focus_area>

<bikes>
Bike 1: ${bike1Name}
Bike 2: ${bike2Name}
</bikes>

<relevant_insights>
${bike1Name}:
${bike1Praises}
${bike1Complaints}

${bike2Name}:
${bike2Praises}
${bike2Complaints}
</relevant_insights>

<quotes_to_use>
${allocatedQuotes.map((q, i) => `${i + 1}. "${q}"`).join('\n')}
</quotes_to_use>

<personas_relevance>
${relevantPersonas}
</personas_relevance>

<writing_rules>
1. **NO SPEC DUMPS**: Don't list specs. Translate them to experiences.
   ❌ "The Duke has 43 bhp and 37 Nm of torque"
   ✅ "Pin the Duke's throttle at 4,000rpm in third, and the front wheel lightens—not wheelie-happy, but enough to grin past the Neemrana toll plaza"

2. **ALWAYS GROUND IN SCENARIOS**: Every claim needs a real-world moment.
   ❌ "The suspension is better"
   ✅ "On Bangalore's Silk Board stretch—where your kidneys normally file for divorce—the Apache's adjustable forks let you dial out the pain. The Duke? You'll feel every construction patch."

3. **INCLUDE OWNER VOICES**: Use the quotes naturally, not as block quotes.
   ✅ "As one owner on YouTube put it: 'The engine is butter smooth at 5000rpm—I can cruise all day at 90 without fatigue.'"

4. **BALANCE IS NOT FENCE-SITTING**: Both bikes can win in DIFFERENT scenarios.
   ✅ "${bike1Name} wins on: [specific scenario]. ${bike2Name} takes it when: [different specific scenario]."

5. **TIE TO PERSONAS**: Reference which persona cares about this.
   ✅ "For Rahul—the weekender who needs highway comfort—this is a 70/30 win for the Apache."
</writing_rules>

<structure>
1. Open with the central trade-off in this dimension (1-2 sentences)
2. [Bike 1] reality (2-3 paragraphs with scenarios and quotes)
3. [Bike 2] reality (2-3 paragraphs with scenarios and quotes)
4. The verdict for this dimension: Who wins, when, for whom (1 paragraph)
</structure>

<word_count>
350-450 words for this sub-section
</word_count>

Write the section now:`;
}

