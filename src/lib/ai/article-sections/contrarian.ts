import { NarrativePlan, VerdictGenerationResult } from '../../types';

export function buildContrarianPrompt(
  winningBike: string,
  losingBike: string,
  narrativePlan: NarrativePlan,
  verdicts: VerdictGenerationResult
): string {
  const againstReasons = verdicts.verdicts
    .flatMap(v => v.againstReasons)
    .join('\n• ');

  return `<role>
You're writing the "Why You Might Hate the Winner" section. This is where you build TRUST by being honest about the recommended bike's flaws.
</role>

<winning_bike>${winningBike}</winning_bike>
<losing_bike>${losingBike}</losing_bike>

<contrarian_angle>
Target persona: ${narrativePlan.contrarian_angle.target_persona}
Why they might hate it: ${narrativePlan.contrarian_angle.why_they_might_hate_winner}
</contrarian_angle>

<against_reasons_from_verdicts>
• ${againstReasons}
</against_reasons_from_verdicts>

<structure>
## When ${winningBike} Is the Wrong Choice

Even though ${winningBike} wins for most riders, here's who should walk away:

**You value [specific thing] over everything else**
[Explain when the winning bike fails at this, with specific scenario]

**You're [specific situation/persona type]**
[Explain this edge case honestly]

**You [specific preference/constraint]**
[Explain why this makes the other bike better]

If any of these hit home, the ${losingBike} isn't the consolation prize—it's your winner.
</structure>

<requirements>
1. Word count: 200-300 words
2. List 3-4 genuine reasons to choose the losing bike
3. Make these feel like real concerns, not strawmen
4. End by validating the losing bike as a legitimate choice
5. Tone: Honest, not apologetic
</requirements>

Write the section now:`;
}

