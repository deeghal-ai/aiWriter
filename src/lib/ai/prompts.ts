/**
 * Prompt templates for AI insight extraction
 * Modular and reusable across different AI providers
 */

export function buildInsightExtractionPrompt(
  bike1Name: string,
  bike2Name: string,
  redditData: any,
  xbhpData: any
): string {
  return `You are an expert automotive analyst specializing in motorcycle comparisons. Your task is to analyze forum discussions and extract structured insights about two bikes.

# Bikes Being Compared
- Bike 1: ${bike1Name}
- Bike 2: ${bike2Name}

# Your Task

Analyze the provided forum data and extract:

1. **Praises**: Positive aspects mentioned by owners
   - Group similar feedback into categories
   - Count frequency (number of unique mentions)
   - Extract 2-3 representative quotes per category

2. **Complaints**: Negative aspects or issues reported
   - Group similar complaints into categories
   - Count frequency
   - Extract 2-3 representative quotes per category

3. **Surprising Insights**: Findings that contradict conventional wisdom or common assumptions
   - Look for patterns that go against marketing claims
   - Identify unexpected positives or negatives
   - Note any counter-intuitive owner experiences

# Source Data

<reddit_data>
${JSON.stringify(redditData, null, 2)}
</reddit_data>

<xbhp_data>
${JSON.stringify(xbhpData, null, 2)}
</xbhp_data>

# Critical Instructions

1. **Frequency Counting**:
   - Count unique mentions, not total occurrences
   - If 8 different owners mention "engine refinement", frequency = 8
   - Don't count the same user mentioning it twice

2. **Quote Extraction**:
   - Use EXACT quotes from the source data
   - Keep quotes under 100 words
   - Attribute to correct author and source (Reddit/xBhp)
   - Include context if needed for clarity

3. **Category Naming**:
   - Use clear, specific categories (e.g., "Highway stability at 100+ kmph")
   - Not vague terms like "Performance" or "Good"
   - Categories should be actionable and specific

4. **Surprising Insights**:
   - Must be backed by multiple data points
   - Should contradict common assumptions
   - Examples: "Owners report better fuel economy than claimed", "Pillion comfort worse than expected despite marketing"

5. **Source Attribution**:
   - Always cite whether quote came from Reddit or xBhp
   - Preserve author username (or use "Anonymous" if deleted)

# Output Format

Return a valid JSON object matching the provided schema. Do not include any text outside the JSON structure.

# Quality Standards

- Extract 3-7 praise categories per bike
- Extract 2-5 complaint categories per bike  
- Include 2-3 quotes per category (more for higher frequency)
- Identify 2-4 surprising insights per bike
- Ensure all frequencies are accurate counts

Begin your analysis now.`;
}

/**
 * Fallback prompt if structured outputs fail
 */
export function buildLegacyInsightPrompt(
  bike1Name: string,
  bike2Name: string,
  redditData: any,
  xbhpData: any
): string {
  return `${buildInsightExtractionPrompt(bike1Name, bike2Name, redditData, xbhpData)}

IMPORTANT: Your response must be ONLY valid JSON. No markdown, no explanations, no preamble. Start with { and end with }.`;
}

