import { NarrativePlan, InsightExtractionResult } from '../../types';

/**
 * Build hook prompt using narrative plan's dynamic hook strategy
 * Incorporates insights and personas for grounded, specific opening
 */
export function buildHookPrompt(
  bike1Name: string,
  bike2Name: string,
  narrativePlan: NarrativePlan,
  insights: InsightExtractionResult
): string {
  // Use the dynamically chosen strategy from narrative planning
  const hookStrategy = narrativePlan?.hook_strategy || 'Unexpected Truth';
  const hookElements = narrativePlan?.hook_elements || {
    scenario: `Comparing ${bike1Name} and ${bike2Name}`,
    tension: 'Which bike is the smarter choice?',
    promise: 'We analyzed real owner experiences to find out'
  };

  // Extract key data points for grounding
  const bike1TopPraise = insights?.bike1?.praises?.[0]?.category || 'performance';
  const bike2TopPraise = insights?.bike2?.praises?.[0]?.category || 'comfort';
  const surprisingInsight = narrativePlan?.truth_bomb || 
    insights?.bike1?.surprising_insights?.[0] || 
    insights?.bike2?.surprising_insights?.[0] || 
    'Real owner experiences reveal unexpected truths';

  // Get allocated quotes for hook
  const hookQuotes = (narrativePlan?.quote_allocation?.hook || []).slice(0, 2);

  return `<role>You're writing the opening hook of a ${bike1Name} vs ${bike2Name} comparison article.</role>

<task>Write 150-200 words that make readers NEED to continue reading</task>

<strategy>
Hook Type: ${hookStrategy}
Scenario: ${hookElements.scenario}
Tension: ${hookElements.tension}
Promise: ${hookElements.promise}
</strategy>

<grounding_data>
${bike1Name} top strength: ${bike1TopPraise}
${bike2Name} top strength: ${bike2TopPraise}
Key insight: ${surprisingInsight}
${hookQuotes.length > 0 ? `Allocated quotes: ${hookQuotes.join(', ')}` : ''}
</grounding_data>

<hook_templates>
**${hookStrategy === 'WhatsApp Debate' ? '→ ' : ''}WhatsApp Debate:**
Start with group chat argument. Specific city names, prices, scenarios.
"Your WhatsApp group is split. Half swear ${bike1Name} is smarter—[specific reason]. Others defend ${bike2Name}—[counter]. You're stuck with ₹X lakhs and a decision."

**${hookStrategy === 'Unexpected Truth' ? '→ ' : ''}Unexpected Truth:**
Lead with contrarian insight. Make them say "wait, what?"
"Everything you've read about ${bike1Name} vs ${bike2Name} misses the point. [Truth bomb]. This changes everything."

**${hookStrategy === 'Specific Scenario' ? '→ ' : ''}Specific Scenario:**
Put reader in a moment. Make it visceral.
"It's 8:47 AM on Outer Ring Road. You're in second gear, watching temperature climb. [Build tension]. This is where these bikes stop being spec sheets."

**${hookStrategy === 'Price Paradox' ? '→ ' : ''}Price Paradox:**
Challenge the obvious value calculation.
"The ${bike1Name} costs ₹X less. Obvious choice, right? Not so fast. We crunched real numbers—insurance, maintenance, resale."
</hook_templates>

<requirements>
1. Word count: 150-200 words STRICT
2. MUST mention both bike names
3. MUST include ONE specific number (price, distance, %)
4. MUST include ONE specific Indian city/location
5. MUST end with clear promise
6. BANNED phrases: "Let's dive in", "In this article", "Without further ado", "comprehensive guide"
7. Tone: Conversational, confident, slightly provocative
</requirements>

<anti_patterns>
❌ "Welcome to our comparison of these two popular motorcycles"
❌ "Both bikes are great options for Indian riders"
❌ "In this comprehensive guide, we'll explore..."

✅ "Your colleague Vikram just bought a Duke. He won't shut up about it. Your gut says Apache—but what if you're wrong?"
✅ "₹2.5 lakhs. One decision. Five years of living with it. Here's what 47 real owners wish they'd known."
</anti_patterns>

Write the hook now. Output ONLY the article text:`;
}
