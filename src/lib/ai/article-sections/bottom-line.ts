import { NarrativePlan, VerdictGenerationResult, InsightExtractionResult, PersonaGenerationResult } from '../../types';

/**
 * Build bottom line prompt with comprehensive closing
 * Synthesizes all insights for memorable, quotable conclusion
 */
export function buildBottomLinePrompt(
  bike1Name: string,
  bike2Name: string,
  narrativePlan: NarrativePlan,
  verdicts: VerdictGenerationResult,
  insights?: InsightExtractionResult,
  personas?: PersonaGenerationResult
): string {
  // Get closing insight from narrative plan
  const closingInsight = narrativePlan?.closing_insight || 
    `The best bike isn't the one with better specs—it's the one that matches your actual riding life`;
  
  // Get verdict summary
  const summary = verdicts?.summary || { bike1Wins: 0, bike2Wins: 0, closestCall: 'N/A' };
  
  // Get callbacks to tie together
  const callbacks = narrativePlan?.callbacks || [];
  
  // Get the story angle for synthesis
  const storyAngle = narrativePlan?.story_angle || 'Two bikes, different philosophies';
  
  // Get key tension points
  const tensionPoints = narrativePlan?.tension_points || [];

  // Determine overall winner (if any)
  const overallWinner = summary.bike1Wins > summary.bike2Wins 
    ? bike1Name 
    : summary.bike2Wins > summary.bike1Wins 
      ? bike2Name 
      : 'Neither (split decision)';

  return `<role>You're writing the closing section. Make it MEMORABLE—this is what readers quote to friends.</role>

<task>Write 150-200 words that stick with readers long after they close the tab</task>

<closing_insight>
${closingInsight}
</closing_insight>

<verdict_summary>
${summary.bike1Wins} personas choose ${bike1Name}
${summary.bike2Wins} personas choose ${bike2Name}
Closest call: ${summary.closestCall}
Overall: ${overallWinner}
</verdict_summary>

<story_angle>
${storyAngle}
</story_angle>

<key_tension_points>
${tensionPoints.map(t => `• ${t.dimension}: ${bike1Name} wins "${t.bike1_wins}", ${bike2Name} wins "${t.bike2_wins}"`).join('\n') || '• Multiple dimensions with trade-offs'}
</key_tension_points>

<callbacks_to_complete>
${callbacks.map(c => `• From ${c.introduce_in}: "${c.element}" → callback in ${c.callback_in}`).join('\n') || '• Tie back to opening hook'}
</callbacks_to_complete>

<structure>
## The Bottom Line

[Open with unexpected insight—something they didn't expect to learn. NOT a summary.]

[One paragraph SYNTHESIZING the entire comparison into a SINGLE truth. Not listing points—finding the pattern.]

[Memorable closing line—quotable, shareable, makes them think. This should feel like wisdom, not summary.]

[Optional: "Next Steps" CTA—specific things to check on test ride, or specific question to ask at showroom]
</structure>

<requirements>
1. Word count: 150-200 words
2. Must include closing insight from narrative plan
3. Must feel like CONCLUSION, not summary
4. Must end with something QUOTABLE
5. Optional: Include practical next step
6. Tie back to hook/opening if possible
</requirements>

<anti_patterns>
❌ BAD closing: "Both bikes are excellent choices. It depends on your needs."
✅ GOOD closing: "The 'better' bike is the one that survives your actual life—not your Instagram fantasy of it."

❌ BAD structure: Summary of all points covered
✅ GOOD structure: One insight that reframes everything

❌ BAD ending: "Happy riding!"
✅ GOOD ending: "The question isn't which bike is better. It's which life you're actually living."

❌ BAD synthesis: "We looked at engine, comfort, and value..."
✅ GOOD synthesis: "After 47 owner conversations, one pattern became impossible to ignore: the bike you want and the bike you need are rarely the same."
</anti_patterns>

<example>
## The Bottom Line

Here's what nobody tells you about the ${bike1Name} vs ${bike2Name} debate: The "winner" changes depending on what time you ask the question.

Ask at 7 AM on a Monday in Bangalore traffic, and the ${summary.bike1Wins > summary.bike2Wins ? bike1Name : bike2Name} wins—refinement and reliability matter when you're already annoyed at the world. Ask at 6 AM on a Saturday morning with empty roads ahead, and suddenly character beats convenience.

Most buyers make the decision based on Saturday morning dreams but live Monday morning reality. The ${summary.bike1Wins > summary.bike2Wins ? bike1Name : bike2Name} wins ${summary.bike1Wins > summary.bike2Wins ? summary.bike1Wins : summary.bike2Wins} out of ${(verdicts?.verdicts || []).length} personas not because it's the better bike—but because most riders spend most of their time in traffic, not in their fantasies.

**The question isn't which bike is better. It's honest: What does your actual week look like?**

*Test ride both. But ride them on a Tuesday at 8:30 AM, not a Sunday at sunrise. That's where the truth lives.*
</example>

Write the section now:`;
}
