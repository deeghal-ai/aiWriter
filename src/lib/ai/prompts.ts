/**
 * Prompt templates for AI insight extraction
 * Modular and reusable across different AI providers
 */

import type { InsightExtractionResult } from "../types";

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

/**
 * Persona Generation Prompt
 */
export function buildPersonaGenerationPrompt(
  bike1Name: string,
  bike2Name: string,
  insights: InsightExtractionResult
): string {
  return `You are an expert in Indian motorcycle buyer psychology and market segmentation. Your task is to identify 3-4 distinct rider personas from real forum discussions—not invent marketing segments.

# Context

You're analyzing owner discussions about two motorcycles:
- **Bike 1:** ${bike1Name}
- **Bike 2:** ${bike2Name}

These personas will be used to make specific, per-persona bike recommendations. Generic personas = useless recommendations.

# The Golden Rule

**Every persona trait MUST be backed by patterns in the provided insights.** If you can't find evidence for a persona in the data, don't invent it.

# Extracted Insights to Analyze

<bike1_insights>
Name: ${insights.bike1.name}

## Praises (What owners love):
${insights.bike1.praises.map(p => `
### ${p.category} (mentioned ${p.frequency} times)
Quotes:
${p.quotes.map(q => `- "${q.text}" — ${q.author}, ${q.source}`).join('\n')}
`).join('\n')}

## Complaints (What owners dislike):
${insights.bike1.complaints.map(c => `
### ${c.category} (mentioned ${c.frequency} times)
Quotes:
${c.quotes.map(q => `- "${q.text}" — ${q.author}, ${q.source}`).join('\n')}
`).join('\n')}

## Surprising Insights:
${insights.bike1.surprising_insights.map(s => `- ${s}`).join('\n')}
</bike1_insights>

<bike2_insights>
Name: ${insights.bike2.name}

## Praises (What owners love):
${insights.bike2.praises.map(p => `
### ${p.category} (mentioned ${p.frequency} times)
Quotes:
${p.quotes.map(q => `- "${q.text}" — ${q.author}, ${q.source}`).join('\n')}
`).join('\n')}

## Complaints (What owners dislike):
${insights.bike2.complaints.map(c => `
### ${c.category} (mentioned ${c.frequency} times)
Quotes:
${c.quotes.map(q => `- "${q.text}" — ${q.author}, ${q.source}`).join('\n')}
`).join('\n')}

## Surprising Insights:
${insights.bike2.surprising_insights.map(s => `- ${s}`).join('\n')}
</bike2_insights>

# Your Task: Generate 3-4 Rider Personas

For each persona, you must provide:

## 1. Identity
- **name**: A realistic Indian name (gendered appropriately to the context). Examples: Naveen, Priya, Arjun, Kavitha, Rahul, Meera
- **title**: A specific, memorable descriptor (NOT generic like "The Commuter"). 
  - BAD: "The City Rider"
  - GOOD: "The Whitefield Commuter with Weekend Highway Dreams"
  - GOOD: "The Pillion-Heavy Family Man"
  - GOOD: "The First Big Bike Upgrader from Activa"

## 2. Prevalence
- **percentage**: What percentage of the forum discussions reflect this persona's priorities? (All personas should sum to roughly 85-95%, leaving room for edge cases)
- **sampleSize**: How many distinct users/comments map to this persona? (Be realistic—if you analyzed 40 posts, don't claim 30 users per persona)

## 3. Usage Pattern (MUST sum to 100%)
- **cityCommute**: Daily office/work commute percentage
- **highway**: Long-distance touring, highway runs
- **urbanLeisure**: Weekend city rides, cafe runs, short trips
- **offroad**: Trails, unpaved roads, adventure riding

Look for explicit mentions like "daily commute", "weekend rides", "highway to [city]", "office ride" in the quotes.

## 4. Demographics (Indian Context)
- **ageRange**: Be specific ("28-34" not "young adult")
- **cityType**: "Metro (Bangalore, Mumbai, Delhi)" or "Tier-2 (Pune, Jaipur, Lucknow)" or "Tier-3 (smaller cities)"
- **occupation**: "IT Professional", "Business Owner", "Government Employee", "Student", etc.
- **incomeIndicator**: Realistic for the bike price point ("Can afford ₹2-3L, probably on EMI", "Cash buyer, budget not primary concern")
- **familyContext**: "Single", "Married, spouse is regular pillion", "Married with young kids", "Parents are primary concern"

## 5. Psychographics
- **buyingMotivation**: What's really driving this purchase?
  - "Practical upgrade from 150cc"
  - "Status symbol / road presence"
  - "Pure passion, impractical but desired"
  - "Nostalgia for classic motorcycles"
  
- **decisionStyle**: How do they decide?
  - "Spec-sheet researcher, compares everything"
  - "Emotional buyer, test-ride decides"
  - "Forum-influenced, follows expert opinions"
  - "Brand loyalist, limited consideration set"
  
- **brandLoyalty**: 
  - "Open to any brand with good reviews"
  - "Prefers Japanese reliability"
  - "Royal Enfield loyalist"
  - "Avoids certain brands (specify which)"
  
- **riskTolerance**:
  - "Conservative - only proven, popular models"
  - "Moderate - new models okay if reviews are good"
  - "Early adopter - wants latest tech"

## 6. Priorities (Ordered List)
List 4-6 priorities in order of importance. Derive from what they mention MOST in discussions.
Examples: "Pillion comfort", "Service network accessibility", "Highway stability", "Fuel economy", "Exhaust note character", "LED lights for visibility", "Resale value"

## 7. Pain Points (Specific)
What problems do they face? Be vivid and specific.
- BAD: "Parking challenges"
- GOOD: "Lives in 4th floor walk-up apartment, 190kg bike is a daily struggle"
- GOOD: "Wife complains about the seat after 20km"
- GOOD: "Nearest authorized service center is 60km away"

## 8. Evidence Quotes
Include 2-3 direct quotes from the insights that support this persona's existence. These should be actual quotes from the data provided.

## 9. Archetype Quote
Write ONE quote (15-25 words) that captures this persona's core need. This should sound like something they'd actually say.
Examples:
- "I need it to survive Silk Board traffic AND have something left for weekend highway runs"
- "Wife rides pillion 70% of the time. Her comfort isn't optional—it's the dealbreaker"
- "That exhaust note at 50kmph? That's why I'm paying ₹2 lakh. Power doesn't matter"

## 10. Color Assignment
Assign a color for UI display: "blue", "green", "purple", or "orange" (one per persona)

# Persona Generation Rules

1. **NO GENERIC PERSONAS**: If you find yourself writing "The Performance Enthusiast" or "The Value Buyer", start over.

2. **EVIDENCE REQUIRED**: Every persona must have at least 2-3 quotes from the insights supporting their existence.

3. **INDIAN CONTEXT**: Use Indian names, Indian cities, Indian price ranges (₹), Indian concerns (pillion riding, monsoon riding, service network, resale value).

4. **MUTUALLY EXCLUSIVE**: Personas should be distinct. A "Weekend Tourer" and "Highway Enthusiast" are too similar.

5. **COLLECTIVELY EXHAUSTIVE**: Together, the personas should cover 85-95% of the discussion participants.

6. **REALISTIC NUMBERS**: If the insights contain ~40 posts with ~100 comments, don't claim a sampleSize of 50 for each persona.

# Output Format

Return a valid JSON object with the structure defined in the schema. Do not include any text outside the JSON structure.

Begin your persona generation now.`;
}

