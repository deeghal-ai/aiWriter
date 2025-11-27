import { NarrativePlan, VerdictGenerationResult } from '../../types';

export function buildBottomLinePrompt(
  bike1Name: string,
  bike2Name: string,
  narrativePlan: NarrativePlan,
  verdicts: VerdictGenerationResult
): string {
  return `<role>
You're writing the closing section. Make it memorable—this is what they'll quote to friends.
</role>

<closing_insight>
${narrativePlan.closing_insight}
</closing_insight>

<verdict_summary>
${verdicts.summary.bike1Wins} personas choose ${bike1Name}
${verdicts.summary.bike2Wins} personas choose ${bike2Name}
Closest call: ${verdicts.summary.closestCall}
</verdict_summary>

<structure>
## The Bottom Line

[Open with the unexpected insight—something they didn't expect to learn]

[One paragraph synthesizing the entire comparison into a single truth]

[A memorable closing line—quotable, shareable]

[Optional: A "Next Steps" CTA—test ride, specific things to check]
</structure>

<requirements>
1. Word count: 150-200 words
2. Must include the closing insight from narrative plan
3. Must feel like a CONCLUSION, not a summary
4. End with something quotable
5. Optional: Include a practical next step
</requirements>

<bad_closing>
"Both bikes are excellent choices. It depends on your needs. Happy riding!"
</bad_closing>

<good_closing>
"Here's what nobody tells you: The 'better' bike is the one that survives your actual life—not your Instagram fantasy of it. For most riders in most Indian cities, that's the Apache. But if your life looks more like [specific scenario], the RE isn't the compromise—it's the smarter choice.

The question isn't which bike is better. It's which life you're actually living."
</good_closing>

Write the section now:`;
}

