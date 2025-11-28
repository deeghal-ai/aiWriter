import {
  VerdictGenerationResult,
  PersonaGenerationResult,
  NarrativePlan,
} from '../../types';

export function buildVerdictsPrompt(
  verdicts: VerdictGenerationResult,
  personas: PersonaGenerationResult,
  narrativePlan: NarrativePlan
): string {
  // Safely access arrays with defaults
  const verdictsArray = verdicts?.verdicts || [];
  const personasArray = personas?.personas || [];
  
  const verdictsJson = JSON.stringify(verdictsArray, null, 2);
  const personasJson = JSON.stringify(
    personasArray.map(p => ({ 
      name: p.name, 
      title: p.title, 
      archetypeQuote: p.archetypeQuote 
    })), 
    null, 
    2
  );

  return `<role>
You're writing the final verdicts section. Each persona gets a clear recommendation with confidence percentage and reasoning.
</role>

<verdicts>
${verdictsJson}
</verdicts>

<personas>
${personasJson}
</personas>

<structure>
## The Verdicts

For each persona, write 150-200 words:

### For [Persona Name]: [Winning Bike] ([Confidence]%)

[Opening: Address them directly, acknowledge their priorities]

[Why this bike wins for them—2-3 key reasons from verdict]

[The honest counter-argument—when would they reconsider?]

[Closing one-liner that captures the verdict]

---

After all personas, add a 50-word summary:

### The Pattern

[What's the common thread? When does each bike win? Who's the "default" winner vs the "specific" winner?]
</structure>

<requirements>
1. Total: 600-800 words (150-200 per persona, plus 50-word summary)
2. Use FIRST PERSON address: "For you, Rahul..." not "For Rahul..."
3. Include the confidence percentage prominently
4. Reference specific priorities from their persona
5. Include the verdict one-liner from the data
6. End each verdict with a memorable closing line
</requirements>

<tone>
Confident and direct. You're helping them decide, not hedging.
</tone>

Write the section now:`;
}

