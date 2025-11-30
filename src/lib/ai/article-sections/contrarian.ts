import { NarrativePlan, VerdictGenerationResult, InsightExtractionResult } from '../../types';

/**
 * Build contrarian section prompt with comprehensive counter-arguments
 * Uses insights and verdicts for balanced, honest coverage
 */
export function buildContrarianPrompt(
  winningBike: string,
  losingBike: string,
  narrativePlan: NarrativePlan,
  verdicts: VerdictGenerationResult,
  insights?: InsightExtractionResult
): string {
  // Collect ALL against reasons from verdicts
  const verdictsArray = verdicts?.verdicts || [];
  const allAgainstReasons = verdictsArray
    .flatMap(v => v?.againstReasons || [])
    .filter((reason, index, self) => self.indexOf(reason) === index) // Dedupe
    .slice(0, 6);

  // Get contrarian angle from narrative plan
  const contrarianAngle = narrativePlan?.contrarian_angle || {
    target_persona: 'specific riders',
    why_they_might_hate_winner: 'edge cases where the losing bike excels'
  };

  // Get losing bike's strengths from insights
  const losingBikeStrengths = insights 
    ? (winningBike === insights.bike1?.name 
        ? insights.bike2?.praises 
        : insights.bike1?.praises) || []
    : [];

  const losingBikeTopStrengths = losingBikeStrengths
    .sort((a: any, b: any) => b.frequency - a.frequency)
    .slice(0, 3)
    .map((p: any) => `${p.category} (${p.frequency} mentions): "${p.quotes?.[0]?.text?.slice(0, 80) || 'Owner praise'}"`);

  // Get winning bike's weaknesses
  const winningBikeWeaknesses = insights
    ? (winningBike === insights.bike1?.name
        ? insights.bike1?.complaints
        : insights.bike2?.complaints) || []
    : [];

  const winningBikeTopWeaknesses = winningBikeWeaknesses
    .sort((a: any, b: any) => b.frequency - a.frequency)
    .slice(0, 3)
    .map((c: any) => `${c.category} (${c.frequency} mentions): "${c.quotes?.[0]?.text?.slice(0, 80) || 'Owner concern'}"`);

  return `<role>You're writing the "Why You Might Hate the Winner" section. Build TRUST through honesty.</role>

<task>Write 200-300 words about why ${winningBike} might be WRONG for some buyers</task>

<winning_bike>${winningBike}</winning_bike>
<losing_bike>${losingBike}</losing_bike>

<contrarian_angle>
Target persona: ${contrarianAngle.target_persona}
Why they might hate it: ${contrarianAngle.why_they_might_hate_winner}
</contrarian_angle>

<against_reasons_from_verdicts>
${allAgainstReasons.map(r => `• ${r}`).join('\n') || '• Specific scenarios where the other bike excels'}
</against_reasons_from_verdicts>

<losing_bike_actual_strengths>
${losingBikeTopStrengths.map(s => `• ${s}`).join('\n') || '• Has genuine advantages in specific scenarios'}
</losing_bike_actual_strengths>

<winning_bike_actual_weaknesses>
${winningBikeTopWeaknesses.map(w => `• ${w}`).join('\n') || '• Has real trade-offs to consider'}
</winning_bike_actual_weaknesses>

<structure>
## When ${winningBike} Is the Wrong Choice

[Opening: Acknowledge that ${winningBike} wins for most, but some should walk away]

**You value [specific thing] over everything else**
[Explain with SPECIFIC scenario from the data when ${losingBike} wins]

**You're [specific situation/persona type]**
[Another genuine edge case with real-world grounding]

**You [specific preference/constraint]**
[Third reason, tied to actual owner feedback]

[Closing: Validate ${losingBike} as legitimate winner for these scenarios]
</structure>

<requirements>
1. Word count: 200-300 words
2. List 3-4 GENUINE reasons to choose ${losingBike}
3. Make these feel REAL, not strawmen
4. Use specific scenarios, not vague "some people might prefer"
5. End by validating ${losingBike} as legitimate choice
6. Tone: Honest, not apologetic
</requirements>

<anti_patterns>
❌ BAD: "Some people might prefer the ${losingBike}"
✅ GOOD: "If your commute includes the Pune-Mumbai expressway twice a week, the ${losingBike}'s wind protection becomes non-negotiable"

❌ BAD: "The ${losingBike} is also a good bike"
✅ GOOD: "For 140km weekend runs to Pondicherry, the ${losingBike}'s cruise comfort at 100kmph is genuinely superior—and 47 owners agree"

❌ BAD: "Both bikes have their pros and cons"
✅ GOOD: "Three specific scenarios where you'll regret buying the ${winningBike}:"
</anti_patterns>

<example>
## When ${winningBike} Is the Wrong Choice

Even though ${winningBike} wins for most riders, here's who should walk away:

**You live for the highway**
If your riding is 60%+ highway—weekend trips to Goa, late-night blasts on NICE Road, regular Mysore runs—the ${winningBike}'s aggressive riding position becomes punishment after hour one. The ${losingBike}'s upright stance and wind protection aren't "old school"—they're engineering for exactly your use case. Owner feedback is unanimous: "Past 80kmph for more than 30 minutes, I wish I'd bought the ${losingBike}."

**Your pillion has veto power**
Your partner's comfort isn't a nice-to-have—it's a make-or-break. The ${losingBike}'s rear seat and grab rails aren't premium features; they're marriage insurance. If your Sunday plan requires two happy people, the math changes.

**You hate frequent service visits**
The ${winningBike}'s technology comes with a price: more things that can go wrong. If the nearest authorized service center is 15km of traffic away, every scheduled visit becomes a half-day affair.

If any of these hit home, the ${losingBike} isn't the consolation prize—it's your winner.
</example>

Write the section now:`;
}
