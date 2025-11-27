/**
 * Optimized prompts for faster extraction
 * Uses XML tags, few-shot examples, and terse instructions
 */

/**
 * Single bike extraction prompt (for parallel processing)
 * Optimized for speed with Haiku model
 */
export function buildSingleBikeExtractionPrompt(
  bikeName: string,
  bikeData: any
): string {
  return `<task>Extract owner insights for "${bikeName}" from forum data</task>

<rules>
- frequency = count of UNIQUE users mentioning the topic
- quotes: exact text from source, max 80 words, include author
- categories: be specific ("Highway stability at 100kmph" not "Stability")
- surprising: must contradict common assumptions, needs 2+ data points
</rules>

<schema>
{
  "name": "${bikeName}",
  "praises": [
    {
      "category": "specific praise topic",
      "frequency": number,
      "quotes": [{"text": "exact quote", "author": "username", "source": "YouTube"}]
    }
  ],
  "complaints": [
    {
      "category": "specific complaint topic", 
      "frequency": number,
      "quotes": [{"text": "exact quote", "author": "username", "source": "YouTube"}]
    }
  ],
  "surprising_insights": ["insight that contradicts expectations, backed by data"]
}
</schema>

<example>
Input: 3 users mention smooth engine, 2 mention heat issues
Output:
{
  "name": "Bike X",
  "praises": [{"category": "Engine refinement at cruising speeds", "frequency": 3, "quotes": [{"text": "Butter smooth even at 5000rpm", "author": "RiderX", "source": "YouTube"}]}],
  "complaints": [{"category": "Heat on thighs in traffic", "frequency": 2, "quotes": [{"text": "My legs were burning after 20 mins in Bangalore traffic", "author": "CityCommuter", "source": "YouTube"}]}],
  "surprising_insights": ["Despite being a 'beginner bike', 40% of owners are upgrading from bigger motorcycles"]
}
</example>

<data>
${JSON.stringify(bikeData)}
</data>

Return valid JSON only. No explanations, no markdown fences.`;
}

/**
 * System prompt for extraction
 */
export const EXTRACTION_SYSTEM_PROMPT = "You are a data extraction expert. Output only valid JSON matching the provided schema. No preamble, no explanations.";

