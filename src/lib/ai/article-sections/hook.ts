import { NarrativePlan, InsightExtractionResult } from '../../types';

export function buildHookPrompt(
  bike1Name: string,
  bike2Name: string,
  narrativePlan: NarrativePlan,
  insights: InsightExtractionResult
): string {
  // Defensive checks with fallbacks
  const hookStrategy = narrativePlan?.hook_strategy || 'Unexpected Truth';
  const hookElements = narrativePlan?.hook_elements || {
    scenario: `Comparing ${bike1Name} and ${bike2Name}`,
    tension: 'Which bike is the smarter choice?',
    promise: 'We analyzed real owner experiences to find out'
  };

  return `<role>
You are writing the opening hook of a motorcycle comparison article. You have 150-200 words to make readers NEED to continue reading.
</role>

<strategy>
Hook type: ${hookStrategy}
Scenario: ${hookElements.scenario}
Tension: ${hookElements.tension}
Promise: ${hookElements.promise}
</strategy>

<bikes>
${bike1Name} vs ${bike2Name}
</bikes>

<hook_templates>

**If WhatsApp Debate:**
Start with a group chat argument. Make it specific—real city names, real scenarios, real price points. End with the reader stuck in the middle.

Example structure:
"Your WhatsApp group is split. Half swear [Bike A] is the smarter buy—[specific reason from insights]. The other half defend [Bike B]—[specific counter-reason]. You're stuck with ₹X lakhs and a decision that'll define your daily commute for the next 5 years.

We [did something specific—rode both, tested both, talked to X owners]. Here's what we found."

**If Unexpected Truth:**
Lead with the contrarian insight. Make them say "wait, what?"

Example structure:
"Everything you've read about [Bike A] vs [Bike B] is missing the point. The forums obsess over [common comparison point]. But after [our research/testing], we found something nobody's talking about: [truth bomb].

This changes everything. Here's why."

**If Specific Scenario:**
Put the reader in a moment. Make it visceral.

Example structure:
"It's 8:47 AM on Outer Ring Road. You're in second gear, watching the temperature gauge climb. Your right hand is cramping. The Activa next to you looks annoyingly comfortable.

This is where [Bike A] and [Bike B] stop being spec sheets and start being life choices. We spent [time period] living with both. Here's the truth about which one survives Bangalore."

**If Price Paradox:**
Challenge the obvious value calculation.

Example structure:
"The [cheaper bike] costs ₹X less. Over 5 years, that's [calculation]. Obvious choice, right?

Not so fast. We crunched the real numbers—insurance, maintenance, resale, fuel. The [more expensive bike] actually costs ₹Y less to own. Here's the math nobody shows you."

</hook_templates>

<requirements>
1. Word count: 150-200 words (STRICT)
2. Must mention both bike names
3. Must include at least ONE specific number (price, distance, percentage)
4. Must include at least ONE specific Indian city/location
5. Must end with a clear promise of what's coming
6. NO generic phrases like "Let's dive in" or "In this article we'll explore"
7. Tone: Conversational but confident
</requirements>

<output>
Write the hook section now. Output ONLY the article text, no JSON or labels:`;
}

