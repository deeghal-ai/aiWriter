import { PersonaGenerationResult, NarrativePlan } from '../../types';

export function buildPersonasPrompt(
  personas: PersonaGenerationResult,
  narrativePlan: NarrativePlan
): string {
  // Safely access personas array with default
  const personasArray = personas?.personas || [];
  
  return `<role>
You're introducing the rider personas. Each reader should finish this section thinking "That's me!" about one of them.
</role>

<personas>
${JSON.stringify(personasArray, null, 2)}
</personas>

<structure>
For each persona (3-4 total), write 100-125 words following this template:

**[Name] — The [Title]**

[Opening line that captures their essence in a relatable way]

[Usage pattern described as a day/week in their life, not percentages]

[Their top 3 priorities translated into real scenarios]

[Their internal dilemma in their own voice—use the archetypeQuote as inspiration]

</structure>

<requirements>
1. Total: 400-500 words (100-125 per persona)
2. Each persona gets:
   - A memorable one-line introduction
   - Their riding life as a STORY, not a stat list
   - Their priorities as REAL SCENARIOS
   - Their dilemma in FIRST PERSON voice
3. Use specific Indian context (cities, roads, situations)
4. Make the personas feel like people you could meet at a petrol pump
5. End with: "Now let's see how each bike actually performs for these four riders."
</requirements>

<bad_example>
"Rahul is a 28-year-old software engineer who commutes 70% of the time and values fuel economy and comfort."
</bad_example>

<good_example>
"Rahul, 28, just moved to a Hinjewadi apartment with a 18km commute that takes anywhere from 25 minutes to 90 minutes depending on whether IT parks are running late standups. His girlfriend joins him for Lonavala runs every second weekend—and has opinions about wind blast and seat comfort. His priority isn't the bike. It's not explaining to his parents why he spent ₹2.5 lakhs on something with two wheels."
</good_example>

Write the section now:`;
}

