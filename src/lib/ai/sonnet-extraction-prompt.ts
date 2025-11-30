// Sonnet-optimized prompt for extracting rich, specific insights

import { PreparedBikeData } from '../scrapers/sonnet-data-prep';

export const SONNET_SYSTEM_PROMPT = `You are an expert motorcycle analyst extracting owner insights from Indian YouTube and Reddit data.

Your extraction quality is measured by:
1. SPECIFICITY - "Engine refinement at 4000-6000 RPM" not "Good engine"
2. EVIDENCE - Every category needs 3-5 supporting quotes from YouTube OR Reddit
3. FREQUENCY ACCURACY - Count unique users, not mentions
4. ACTIONABILITY - Insights that help buyers decide
5. SOURCE ATTRIBUTION - Correctly mark quotes as "YouTube" or "Reddit"

You ONLY output valid JSON. No explanations. No markdown.`;

export function buildSonnetExtractionPrompt(
  bikeName: string,
  preparedData: string
): string {
  return `<context>
Bike: ${bikeName}
Task: Extract comprehensive owner insights from YouTube comments, Reddit discussions, and reviews
Output: Detailed JSON with categories, frequencies, and supporting quotes (properly attributed to YouTube or Reddit)
</context>

<quality_requirements>
1. CATEGORY SPECIFICITY
   ❌ BAD: "Engine performance" | "Good handling" | "Value for money"
   ✅ GOOD: "Engine refinement at cruising speeds (4000-6000 RPM)"
   ✅ GOOD: "Cornering confidence on twisty ghats"
   ✅ GOOD: "Better equipped than competitors at ₹1.5L price point"

2. QUOTE RICHNESS
   - Minimum 3 quotes per category (aim for 4-5)
   - Quotes must be EXACT text from the data
   - Include author and like count for credibility
   - Prefer quotes with specific numbers/experiences

3. FREQUENCY ACCURACY
   - Count UNIQUE users mentioning the topic
   - 10 comments about "mileage" from 8 users = frequency 8
   - Don't count same user twice

4. SURPRISING INSIGHTS
   - Must contradict common assumptions or marketing
   - Need evidence from multiple users (not one-off comments)
   - Example: "Despite sporty positioning, 60% of owners use it for daily commute"
</quality_requirements>

<output_schema>
{
  "name": "${bikeName}",
  "praises": [
    {
      "category": "specific descriptive category name",
      "frequency": number_of_unique_users,
      "quotes": [
        {"text": "exact quote", "author": "username", "source": "YouTube or Reddit", "likes": N},
        // 3-5 quotes per category, mixing YouTube and Reddit sources when available
      ]
    }
    // 8-10 praise categories
  ],
  "complaints": [
    {
      "category": "specific issue description",
      "frequency": number_of_unique_users,
      "quotes": [
        {"text": "exact quote", "author": "username", "source": "YouTube or Reddit", "likes": N}
      ]
    }
    // 6-8 complaint categories
  ],
  "surprising_insights": [
    "Insight that contradicts expectations, with evidence basis"
    // 4-6 insights
  ]
}
</output_schema>

<example_output>
{
  "name": "TVS Apache RTR 200 4V",
  "praises": [
    {
      "category": "Engine refinement at cruising speeds (80-100 kmph)",
      "frequency": 14,
      "quotes": [
        {"text": "Butter smooth at 5000rpm, can cruise all day at 90 without fatigue", "author": "nikhileswar_r", "source": "YouTube", "likes": 45},
        {"text": "The engine feels more refined than my friend's Duke 200, especially on highways", "author": "MotorHead_Chennai", "source": "YouTube", "likes": 32},
        {"text": "After 15000kms, the engine is still as smooth as day one. Did a 600km round trip to Goa last weekend without issues.", "author": "u/bangalorebikerboy", "source": "Reddit", "likes": 28},
        {"text": "No vibes on handlebar even at 8000rpm, TVS nailed the balance", "author": "TechRider", "source": "YouTube", "likes": 19}
      ]
    },
    {
      "category": "Suspension setup for Indian road conditions",
      "frequency": 11,
      "quotes": [
        {"text": "The preload adjustability saved my spine on Bangalore's crater roads", "author": "WhitfieldRider", "source": "YouTube", "likes": 67},
        {"text": "Handles potholes way better than Pulsar, suspension soaks everything", "author": "u/daily_rider_hyd", "source": "Reddit", "likes": 41}
      ]
    }
  ],
  "complaints": [
    {
      "category": "After-sales service quality at TVS dealerships",
      "frequency": 12,
      "quotes": [
        {"text": "TVS service network is a joke, my dealership took 3 weeks for a simple oil change", "author": "FrustratedOwner", "source": "YouTube", "likes": 89},
        {"text": "Went to 3 different dealerships in Pune, same story everywhere - clueless service advisors pushing unnecessary parts", "author": "u/moto_enthusiast_pune", "source": "Reddit", "likes": 54}
      ]
    }
  ],
  "surprising_insights": [
    "Despite being marketed as a sporty 200cc, 65% of owners across both YouTube and Reddit primarily use it for daily office commute, not weekend rides",
    "Long-term owners (40,000+ kms) report better reliability than initial batch buyers, suggesting TVS fixed early quality issues"
  ]
}
</example_output>

<anti_patterns>
AVOID these generic, unhelpful categories:
❌ "Engine performance" — too vague
❌ "Good value for money" — no specific price context
❌ "Comfortable for long rides" — what distance? what rider type?
❌ "Build quality issues" — which parts? how common?

INSTEAD write:
✅ "Engine refinement at highway speeds (90-110 kmph)"
✅ "Feature-rich compared to competitors at ₹1.8L price point"
✅ "Pillion comfort on 400+ km highway trips"
✅ "Rear footpeg bracket cracking issue (reported by 8 owners)"
</anti_patterns>

<data>
${preparedData}
</data>

Extract comprehensive insights now. Output ONLY valid JSON:`;
}

/**
 * Build a prompt for comparing extraction quality
 * Useful for testing and validation
 */
export function buildQualityCheckPrompt(
  bikeName: string,
  extraction: any
): string {
  return `Review this insight extraction for quality:

Bike: ${bikeName}

Extraction:
${JSON.stringify(extraction, null, 2)}

Rate each aspect (1-10):
1. Category Specificity (specific vs generic)
2. Quote Quality (rich with context vs bare minimum)
3. Frequency Accuracy (realistic counts)
4. Surprising Insights (truly surprising vs obvious)

Provide feedback on improvements needed.`;
}

