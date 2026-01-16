import { NarrativePlan, InsightExtractionResult } from '../../types';

/**
 * Build truth bomb prompt with comprehensive insights
 * Uses ALL surprising insights for balanced perspective
 */
export function buildTruthBombPrompt(
  narrativePlan: NarrativePlan,
  insights: InsightExtractionResult
): string {
  // Get all surprising insights from both bikes
  const bike1Surprises = insights?.bike1?.surprising_insights || [];
  const bike2Surprises = insights?.bike2?.surprising_insights || [];
  const allSurprises = [...bike1Surprises, ...bike2Surprises];
  
  // Use narrative plan's truth bomb as primary, with fallbacks
  const truthBomb = narrativePlan?.truth_bomb || 
    allSurprises[0] || 
    'The real difference between these bikes isn\'t what the brochures tell you';

  // Get supporting evidence from top insights
  const bike1TopPraise = insights?.bike1?.praises?.[0];
  const bike2TopPraise = insights?.bike2?.praises?.[0];
  const bike1TopComplaint = insights?.bike1?.complaints?.[0];
  const bike2TopComplaint = insights?.bike2?.complaints?.[0];

  return `<role>You're writing the "truth bomb" section—the surprising insight that builds reader trust</role>

<task>Write 100-150 words revealing what others miss about this comparison</task>

<primary_truth_bomb>
${truthBomb}
</primary_truth_bomb>

<all_surprising_insights>
${insights?.bike1?.name || 'Bike 1'}:
${bike1Surprises.map(s => `• ${s}`).join('\n') || '• Standard expectations met'}

${insights?.bike2?.name || 'Bike 2'}:
${bike2Surprises.map(s => `• ${s}`).join('\n') || '• Standard expectations met'}
</all_surprising_insights>

<supporting_evidence>
${insights?.bike1?.name || 'Bike 1'}:
• Top praise: ${bike1TopPraise?.category || 'N/A'} (${bike1TopPraise?.frequency || 0} mentions)
  "${bike1TopPraise?.quotes?.[0]?.text?.slice(0, 100) || 'Owner feedback positive'}"
• Top complaint: ${bike1TopComplaint?.category || 'N/A'} (${bike1TopComplaint?.frequency || 0} mentions)
  "${bike1TopComplaint?.quotes?.[0]?.text?.slice(0, 100) || 'Minor concerns noted'}"

${insights?.bike2?.name || 'Bike 2'}:
• Top praise: ${bike2TopPraise?.category || 'N/A'} (${bike2TopPraise?.frequency || 0} mentions)
  "${bike2TopPraise?.quotes?.[0]?.text?.slice(0, 100) || 'Owner feedback positive'}"
• Top complaint: ${bike2TopComplaint?.category || 'N/A'} (${bike2TopComplaint?.frequency || 0} mentions)
  "${bike2TopComplaint?.quotes?.[0]?.text?.slice(0, 100) || 'Minor concerns noted'}"
</supporting_evidence>

<structure>
1. **Lead with the surprising claim** (1-2 sentences)
   - Make reader say "wait, what?"
   - Be specific, not vague

2. **Back it up immediately** (2-3 sentences)
   - Use a quote or data point
   - Make it credible

3. **Explain why it matters** (2-3 sentences)
   - Connect to buying decision
   - Create stakes

4. **Transition** (1 sentence)
   - Lead to personas section
   - "But first, let's understand who's actually buying these bikes..."
</structure>

<requirements>
1. Word count: 80-120 words STRICT - be PUNCHY
2. Lead with CONTRARIAN insight
3. Must include evidence (quote or data)
4. Must explain WHY it matters for buyers
5. Must transition to "let's meet the riders..."
6. DO NOT repeat general bike positioning from the hook
</requirements>

<tone>
Confident but not arrogant. Sharing insider knowledge, not lecturing.
</tone>

<anti_patterns>
❌ "Both bikes have their pros and cons"
❌ "It depends on what you're looking for"
❌ "There's no clear winner"

✅ "Here's what the spec-sheet comparisons miss: [specific insight]"
✅ "After talking to 47 owners, one pattern shocked us: [data point]"
✅ "The bike that 'wins' on paper loses where it matters most: [scenario]"
</anti_patterns>

<example>
"Here's what the spec-sheet comparisons miss: The Duke's 'superior' engine makes you slower in real Bangalore traffic.

Three owners independently mentioned this: 'The torque is addictive on the highway, but in stop-go traffic, I'm constantly riding the clutch while Dominars cruise in second.' That's not subjective preference—that's daily commute reality.

This matters because 70% of Indian riders spend 70% of their time in exactly this scenario. It's not about which bike is 'better'—it's about which bike matches YOUR commute.

And 'your commute' isn't generic. We found four distinct types of buyers in the forums. Let's meet them."
</example>

Write the section now:`;
}
