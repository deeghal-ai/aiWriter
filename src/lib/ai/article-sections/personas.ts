import { PersonaGenerationResult, NarrativePlan, InsightExtractionResult } from '../../types';

/**
 * Build personas section prompt with comprehensive persona data
 * Makes each persona feel like a real person readers can identify with
 */
export function buildPersonasPrompt(
  personas: PersonaGenerationResult,
  narrativePlan: NarrativePlan,
  insights?: InsightExtractionResult
): string {
  const personasArray = personas?.personas || [];
  
  // Build rich persona descriptions
  const personaDescriptions = personasArray.map(p => {
    const usage = p.usagePattern || { cityCommute: 50, highway: 30, urbanLeisure: 15, offroad: 5 };
    const demo = p.demographics || {};
    const psych = p.psychographics || {};
    
    return `<persona id="${p.id}">
Name: ${p.name}
Title: ${p.title}
Percentage: ${p.percentage}% of buyers

Usage Pattern:
- City commute: ${usage.cityCommute}%
- Highway: ${usage.highway}%
- Urban leisure: ${usage.urbanLeisure}%
- Off-road: ${usage.offroad}%

Demographics:
- Age: ${demo.ageRange || '25-35'}
- City type: ${demo.cityType || 'Metro'}
- Occupation: ${demo.occupation || 'Professional'}
- Income: ${demo.incomeIndicator || 'Middle-class'}
- Family: ${demo.familyContext || 'Single/Young family'}

Decision Style: ${psych.decisionStyle || 'Research-heavy'}
Risk Tolerance: ${psych.riskTolerance || 'Medium'}

Top Priorities:
${(p.priorities || []).map((pri, i) => `${i + 1}. ${pri}`).join('\n')}

Pain Points:
${(p.painPoints || []).map(pp => `• ${pp}`).join('\n')}

Evidence Quotes:
${(p.evidenceQuotes || []).map(q => `"${q}"`).join('\n')}

Archetype Quote: "${p.archetypeQuote || 'I need the right bike for my life'}"
</persona>`;
  }).join('\n\n');

  return `<role>You're introducing rider personas. Each reader should finish thinking "That's me!" about one of them.</role>

<task>Write 400-500 words introducing ${personasArray.length} personas (100-125 words each)</task>

<personas_data>
${personaDescriptions}
</personas_data>

<writing_template>
For each persona, use this structure:

**[Name] — The [Title]**

[Opening: One memorable line capturing their essence - vivid, relatable, NOT generic]

[Usage pattern as STORY: Describe their week, not percentages. "Monday through Friday, it's the 22km Whitefield crawl..." NOT "70% city commute"]

[Their priorities as SCENARIOS: "His priority isn't top speed—it's not explaining to his wife why he's drenched in sweat after a 45-minute commute"]

[Their internal dilemma in FIRST PERSON: Use their archetypeQuote as inspiration. Make it feel like their actual voice.]

---

After all personas, close with:
"Now let's see how each bike actually performs for these [N] riders."
</writing_template>

<requirements>
1. Total: 400-500 words (100-125 per persona)
2. Each persona gets:
   - Memorable one-line intro (NOT generic titles)
   - Riding life as STORY (specific routes, scenarios)
   - Priorities as REAL situations (not abstract values)
   - Dilemma in FIRST PERSON voice
3. Use SPECIFIC Indian context:
   - Real city areas (Whitefield, Andheri, Hinjewadi)
   - Real roads (ORR, NH48, Silk Board)
   - Real situations (traffic, monsoon, pillion)
4. Make them feel like people you'd meet at a petrol pump
5. End with transition to bike comparison
</requirements>

<anti_patterns>
❌ BAD intro: "Rahul is a 28-year-old software engineer who values fuel economy"
✅ GOOD intro: "Rahul, 28, just discovered that his new Hinjewadi apartment comes with a 45-minute traffic sentence every morning"

❌ BAD priorities: "He prioritizes reliability and comfort"
✅ GOOD priorities: "His priority isn't horsepower—it's not having to explain to his manager why he's late again because the bike decided to throw a tantrum on ITPL road"

❌ BAD dilemma: "He's looking for a balanced motorcycle"
✅ GOOD dilemma: "I don't need the fastest bike on Sunday morning. I need the one that won't make me question my life choices at 8:47 AM on Tuesday."

❌ Generic: "The commuter", "The enthusiast", "The practical buyer"
✅ Specific: "The Silk Board Survivor", "The Lonavala Weekend Dreamer", "The First-Bike-After-Activa Upgrader"
</anti_patterns>

<example_paragraph>
**Priya — The Reluctant Pillion-to-Rider Graduate**

At 31, Priya's done being the passenger. Ten years of sitting behind her husband on his Pulsar, and she's finally got the license and the budget for her own machine. Her daily reality: 18km from Koramangala to Manyata Tech Park, minimum 50 minutes if the traffic gods are kind.

Her Monday through Friday is survival mode—filtering through buses on Marathahalli bridge, praying the roads dry before monsoon peak. But Saturdays? That's her 6 AM ride to Nandi Hills before the tourists wake up. She needs a bike that won't intimidate her at red lights but won't bore her on the ghats.

"I've spent a decade telling my husband to slow down. Now I understand why he didn't. I just need a bike that lets me feel alive without terrifying my mother."
</example_paragraph>

Write the section now:`;
}
