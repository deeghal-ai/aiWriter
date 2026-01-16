/**
 * Optimized prompts for faster extraction
 * Uses XML tags, few-shot examples, and terse instructions
 */

/**
 * Single bike extraction prompt (for parallel processing)
 * Optimized for speed with Haiku model
 * Enhanced with prose context for later stages (persona, verdict, article)
 */
export function buildSingleBikeExtractionPrompt(
  bikeName: string,
  bikeData: any
): string {
  // Check if we have transcript data (YouTube videos) - this gets higher authority
  const hasTranscripts = bikeData?.videos?.some((v: any) => v.transcript && v.transcript.length > 100);

  return `<task>Extract owner insights for "${bikeName}" from YouTube and Reddit data</task>

<source_authority>
IMPORTANT: Weight information by source authority:
1. YouTube VIDEO TRANSCRIPTS (reviewers speaking) = HIGHEST authority - professional reviewers with hands-on experience
2. BikeDekho/Internal verified owners = HIGH authority - verified ownership
3. YouTube COMMENTS = MEDIUM authority - may or may not be owners
4. Reddit discussions = MEDIUM authority - authentic but unverified

When extracting contextual_summary, prioritize insights from transcripts and verified owners over comments.
</source_authority>

<rules>
- frequency = count of UNIQUE users mentioning the topic
- quotes: exact text from source, max 80 words, include author
- source: use "YouTube" or "Reddit" - attribute correctly based on where comment came from
- categories: be specific ("Highway stability at 100kmph" not "Stability")
- surprising: must contradict common assumptions, needs 2+ data points
- TRANSLATE: If ANY text is in Hindi/Hinglish, translate to English. ALL output must be in English.
</rules>

<schema>
{
  "name": "${bikeName}",
  "praises": [
    {
      "category": "specific praise topic",
      "frequency": number,
      "quotes": [{"text": "exact quote", "author": "username", "source": "YouTube or Reddit"}]
    }
  ],
  "complaints": [
    {
      "category": "specific complaint topic",
      "frequency": number,
      "quotes": [{"text": "exact quote", "author": "username", "source": "YouTube or Reddit"}]
    }
  ],
  "surprising_insights": ["insight that contradicts expectations, backed by data"],

  "contextual_summary": {
    "reviewer_consensus": "1-2 sentences: What do the YouTube reviewers (from transcripts) agree on? Focus on their main takeaways.",
    "owner_consensus": "1-2 sentences: What do actual owners in comments/Reddit agree on? Common real-world experiences.",
    "key_controversies": "1 sentence: What do they disagree about? Polarizing opinions."
  },

  "real_world_observations": {
    "daily_use": ["specific observation about city/daily riding - e.g., 'Clutch heavy in Bangalore traffic'"],
    "long_distance": ["specific observation about highway/touring - e.g., 'Wind buffeting tiring after 150km'"],
    "pillion_experience": ["specific observation about carrying passengers - e.g., 'Pillion footpegs too high'"],
    "ownership_quirks": ["maintenance/ownership specific - e.g., 'Chain needs lubing every 500km'"]
  },

  "usage_patterns": {
    "primary_use_case": "How most owners use this bike - e.g., '80% city commute, 20% weekend rides'",
    "typical_daily_distance": "Average daily km from discussions - e.g., '25-40km daily'",
    "common_modifications": ["Popular aftermarket additions - e.g., 'Crash guards', 'Phone mount'"]
  }
}
</schema>

<example>
{
  "name": "Bike X",
  "praises": [{"category": "Engine refinement at cruising speeds", "frequency": 3, "quotes": [{"text": "Butter smooth even at 5000rpm", "author": "RiderX", "source": "YouTube"}]}],
  "complaints": [{"category": "Heat on thighs in traffic", "frequency": 2, "quotes": [{"text": "My legs were burning after 20 mins in Bangalore traffic", "author": "CityCommuter", "source": "YouTube"}]}],
  "surprising_insights": ["Despite being a 'beginner bike', 40% of owners are upgrading from bigger motorcycles"],
  "contextual_summary": {
    "reviewer_consensus": "Reviewers praise the refined engine and modern features, but consistently note the aggressive riding position isn't for everyone.",
    "owner_consensus": "Owners love the build quality and highway stability, but unanimously complain about service costs and part availability.",
    "key_controversies": "The exhaust note divides opinion - some love the sporty sound, others find it too quiet for a 'big bike'."
  },
  "real_world_observations": {
    "daily_use": ["In stop-and-go Bangalore traffic, the clutch pull becomes tiring after 30 mins", "Easy to filter through gaps due to slim profile"],
    "long_distance": ["Above 100kmph, the windblast on the chest requires frequent breaks", "Fuel range of 350km means relaxed touring without fuel anxiety"],
    "pillion_experience": ["Pillion seat comfortable for short rides, but grab rails are positioned awkwardly", "Wife's dupatta got caught in chain once"],
    "ownership_quirks": ["First service at dealer took 4 hours despite appointment", "Rear tyre replacement available only at dealer at 2x market price"]
  },
  "usage_patterns": {
    "primary_use_case": "70% daily office commute (15-25km), 30% weekend leisure rides",
    "typical_daily_distance": "20-35km weekdays, 100-150km weekend rides",
    "common_modifications": ["Crash guard (almost universal)", "Tank pad", "Touring screen for highway use"]
  }
}
</example>

<data>
${JSON.stringify(bikeData)}
</data>

${hasTranscripts ? '<note>This bike has video transcripts - prioritize insights from reviewer transcripts as they have tested the bike extensively.</note>' : ''}

Return valid JSON only. No explanations, no markdown fences.`;
}

/**
 * System prompt for extraction
 */
export const EXTRACTION_SYSTEM_PROMPT = "You are a data extraction expert. Output only valid JSON matching the provided schema. No preamble, no explanations. IMPORTANT: If any source text is in Hindi/Hinglish, translate it to English in your output. All quotes and insights must be in English.";

/**
 * Condense insights for persona generation (reduce token count)
 * Enhanced to include prose context for richer persona creation
 */
export function condenseInsightsForPersonas(insights: any): any {
  return {
    bike1: {
      name: insights.bike1.name,
      // Only top 5 praises with frequency
      topPraises: insights.bike1.praises
        .sort((a: any, b: any) => b.frequency - a.frequency)
        .slice(0, 5)
        .map((p: any) => ({ category: p.category, frequency: p.frequency, quote: p.quotes[0]?.text })),
      topComplaints: insights.bike1.complaints
        .sort((a: any, b: any) => b.frequency - a.frequency)
        .slice(0, 4)
        .map((c: any) => ({ category: c.category, frequency: c.frequency, quote: c.quotes[0]?.text })),
      surprising: insights.bike1.surprising_insights.slice(0, 3),
      // Enhanced prose context
      reviewerConsensus: insights.bike1.contextual_summary?.reviewer_consensus || '',
      ownerConsensus: insights.bike1.contextual_summary?.owner_consensus || '',
      keyControversies: insights.bike1.contextual_summary?.key_controversies || '',
      usagePattern: insights.bike1.usage_patterns?.primary_use_case || '',
      realWorldObservations: {
        dailyUse: insights.bike1.real_world_observations?.daily_use?.slice(0, 2) || [],
        pillion: insights.bike1.real_world_observations?.pillion_experience?.slice(0, 2) || [],
        ownership: insights.bike1.real_world_observations?.ownership_quirks?.slice(0, 2) || []
      }
    },
    bike2: {
      name: insights.bike2.name,
      topPraises: insights.bike2.praises
        .sort((a: any, b: any) => b.frequency - a.frequency)
        .slice(0, 5)
        .map((p: any) => ({ category: p.category, frequency: p.frequency, quote: p.quotes[0]?.text })),
      topComplaints: insights.bike2.complaints
        .sort((a: any, b: any) => b.frequency - a.frequency)
        .slice(0, 4)
        .map((c: any) => ({ category: c.category, frequency: c.frequency, quote: c.quotes[0]?.text })),
      surprising: insights.bike2.surprising_insights.slice(0, 3),
      // Enhanced prose context
      reviewerConsensus: insights.bike2.contextual_summary?.reviewer_consensus || '',
      ownerConsensus: insights.bike2.contextual_summary?.owner_consensus || '',
      keyControversies: insights.bike2.contextual_summary?.key_controversies || '',
      usagePattern: insights.bike2.usage_patterns?.primary_use_case || '',
      realWorldObservations: {
        dailyUse: insights.bike2.real_world_observations?.daily_use?.slice(0, 2) || [],
        pillion: insights.bike2.real_world_observations?.pillion_experience?.slice(0, 2) || [],
        ownership: insights.bike2.real_world_observations?.ownership_quirks?.slice(0, 2) || []
      }
    },
    totalDataPoints: insights.metadata.total_quotes
  };
}

/**
 * Optimized persona generation prompt
 */
export function buildOptimizedPersonaPrompt(
  bike1Name: string,
  bike2Name: string,
  insights: any
): string {
  // Pre-process insights to reduce token count
  const condensedInsights = condenseInsightsForPersonas(insights);
  
  return `<context>
Bikes: ${bike1Name} vs ${bike2Name}
Task: Identify 3-4 DISTINCT rider personas from forum discussions
Purpose: Each persona gets a specific bike recommendation later
</context>

<golden_rule>Every trait must have evidence in the data. No invented personas.</golden_rule>

<anti_patterns>
❌ BAD persona names: "The Performance Enthusiast", "The Value Seeker", "Budget Buyer"
✅ GOOD persona names: "Arjun - The Silk Board Survivor", "Priya - The Weekend Highway Chaser"

❌ BAD titles: "Daily Commuter", "Adventure Rider"  
✅ GOOD titles: "First Big Bike After 5 Years on Activa", "IT Corridor Warrior with Goa Dreams"

❌ BAD pain points: "Parking challenges", "Traffic issues"
✅ GOOD pain points: "Lives in 4th floor walk-up, 190kg bike is daily torture", "Wife's dupatta caught in chain twice"
</anti_patterns>

<persona_schema>
{
  "id": "persona-N",
  "name": "Indian name - Descriptive Title",
  "title": "Specific situation, not generic role",
  "percentage": 20-35,
  "sampleSize": realistic based on data,
  "usagePattern": {"cityCommute": N, "highway": N, "urbanLeisure": N, "offroad": N}, // must sum to 100
  "demographics": {
    "ageRange": "specific range",
    "cityType": "metro/tier2/tier3",
    "occupation": "specific job",
    "incomeIndicator": "specific range in ₹",
    "familyContext": "specific situation"
  },
  "psychographics": {
    "buyingMotivation": "specific trigger",
    "decisionStyle": "research-heavy/impulse/peer-influenced",
    "brandLoyalty": "specific pattern",
    "riskTolerance": "low/medium/high with context"
  },
  "priorities": ["specific priority from data", ...], // 4-6 items
  "painPoints": ["vivid specific pain", ...], // 2-4 items
  "evidenceQuotes": ["exact quote from data", ...], // 2-4 quotes
  "archetypeQuote": "15-25 word quote they'd actually say",
  "color": "blue|green|purple|orange"
}
</persona_schema>

<example_persona>
{
  "id": "persona-1",
  "name": "Vikram - The Reluctant Upgrader",
  "title": "Finally replacing the trusty Pulsar after 8 years of peer pressure",
  "percentage": 28,
  "sampleSize": 12,
  "usagePattern": {"cityCommute": 70, "highway": 20, "urbanLeisure": 10, "offroad": 0},
  "demographics": {
    "ageRange": "32-38",
    "cityType": "metro",
    "occupation": "Mid-level IT manager",
    "incomeIndicator": "₹18-25 LPA",
    "familyContext": "Married, 1 kid, wife uses car for school runs"
  },
  "psychographics": {
    "buyingMotivation": "Colleagues all upgraded, feeling left behind",
    "decisionStyle": "research-heavy, 3+ months of forum lurking",
    "brandLoyalty": "Was Bajaj loyalist, now brand-agnostic",
    "riskTolerance": "Low - needs proven reliability track record"
  },
  "priorities": [
    "Reliability above all - can't afford breakdown on ORR",
    "Comfortable for 25km daily Whitefield commute",
    "Service center within 5km of home",
    "Resale value after 4-5 years"
  ],
  "painPoints": [
    "Current Pulsar's seat destroys lower back after 15km",
    "Nearest authorized center is 12km away in traffic",
    "Wife refuses pillion because of vibration"
  ],
  "evidenceQuotes": [
    "Been riding Pulsar 150 for 8 years, time to upgrade but scared of new tech issues",
    "My main concern is service network - I can't take leave every time bike needs attention"
  ],
  "archetypeQuote": "I don't need the fastest bike, I need the one that won't leave me stranded on the ring road",
  "color": "blue"
}
</example_persona>

<insights_data>
${JSON.stringify(condensedInsights, null, 2)}
</insights_data>

<context_clues>
Use these real-world observations to make personas more grounded:
- Reviewer consensus tells you what experts emphasize
- Owner consensus tells you what real users experience daily
- Key controversies reveal what divides opinions (persona differentiators!)
- Real-world observations (daily use, pillion, ownership) ground personas in reality
</context_clues>

<instructions>
1. Identify 3-4 DISTINCT personas from the insights
2. Each must have evidence quotes from the data
3. Percentages should sum to 85-100%
4. Usage patterns per persona must sum to 100
5. Make them REAL people, not marketing segments
6. USE the real-world observations to create specific, vivid pain points
7. USE owner consensus to inform priorities - what do actual owners care about?
8. Key controversies often reveal different persona types - those who love vs hate something
</instructions>

Generate personas JSON:`;
}

/**
 * System prompt for persona generation
 */
export const PERSONA_SYSTEM_PROMPT = 'You are an expert in Indian motorcycle buyer psychology. Generate specific, evidence-backed personas. Output only valid JSON. All output must be in English - translate any Hindi/Hinglish content.';

/**
 * Condense personas for verdict generation
 */
export function condensePersonasForVerdicts(personas: any[]): any[] {
  return personas.map(p => ({
    id: p.id,
    name: p.name,
    title: p.title,
    usage: p.usagePattern,
    topPriorities: p.priorities.slice(0, 3),
    topPainPoints: p.painPoints.slice(0, 2),
    decisionStyle: p.psychographics.decisionStyle,
    riskTolerance: p.psychographics.riskTolerance
  }));
}

/**
 * Extract verdict-relevant insights
 * Enhanced with prose context for more informed verdicts
 */
export function extractVerdictRelevantInsights(insights: any): any {
  return {
    bike1: {
      name: insights.bike1.name,
      strengths: insights.bike1.praises.slice(0, 4).map((p: any) => p.category),
      weaknesses: insights.bike1.complaints.slice(0, 3).map((c: any) => c.category),
      // Enhanced context
      reviewerConsensus: insights.bike1.contextual_summary?.reviewer_consensus || '',
      ownerConsensus: insights.bike1.contextual_summary?.owner_consensus || '',
      realWorld: {
        dailyUse: insights.bike1.real_world_observations?.daily_use?.slice(0, 2) || [],
        longDistance: insights.bike1.real_world_observations?.long_distance?.slice(0, 2) || [],
        pillion: insights.bike1.real_world_observations?.pillion_experience?.slice(0, 1) || []
      }
    },
    bike2: {
      name: insights.bike2.name,
      strengths: insights.bike2.praises.slice(0, 4).map((p: any) => p.category),
      weaknesses: insights.bike2.complaints.slice(0, 3).map((c: any) => c.category),
      // Enhanced context
      reviewerConsensus: insights.bike2.contextual_summary?.reviewer_consensus || '',
      ownerConsensus: insights.bike2.contextual_summary?.owner_consensus || '',
      realWorld: {
        dailyUse: insights.bike2.real_world_observations?.daily_use?.slice(0, 2) || [],
        longDistance: insights.bike2.real_world_observations?.long_distance?.slice(0, 2) || [],
        pillion: insights.bike2.real_world_observations?.pillion_experience?.slice(0, 1) || []
      }
    }
  };
}

/**
 * Optimized verdict generation prompt (batch - all personas)
 */
export function buildOptimizedVerdictPrompt(
  bike1Name: string,
  bike2Name: string,
  personas: any[],
  insights: any
): string {
  const condensedPersonas = condensePersonasForVerdicts(personas);
  const bikeComparison = extractVerdictRelevantInsights(insights);

  return `<task>Generate definitive bike recommendations for each persona</task>

<golden_rules>
1. ONE WINNER per persona - no "both are good"
2. Confidence 50-95% - never 100%, never below 50%
3. Every reason must link to persona's priorities
4. Counter-arguments must be genuine scenarios where other bike wins
</golden_rules>

<bikes>
${bike1Name}:
  Strengths: ${bikeComparison.bike1.strengths.join(', ')}
  Weaknesses: ${bikeComparison.bike1.weaknesses.join(', ')}
  Reviewer says: ${bikeComparison.bike1.reviewerConsensus || 'N/A'}
  Owners say: ${bikeComparison.bike1.ownerConsensus || 'N/A'}
  Daily use reality: ${bikeComparison.bike1.realWorld?.dailyUse?.join(' | ') || 'N/A'}
  Long distance reality: ${bikeComparison.bike1.realWorld?.longDistance?.join(' | ') || 'N/A'}

${bike2Name}:
  Strengths: ${bikeComparison.bike2.strengths.join(', ')}
  Weaknesses: ${bikeComparison.bike2.weaknesses.join(', ')}
  Reviewer says: ${bikeComparison.bike2.reviewerConsensus || 'N/A'}
  Owners say: ${bikeComparison.bike2.ownerConsensus || 'N/A'}
  Daily use reality: ${bikeComparison.bike2.realWorld?.dailyUse?.join(' | ') || 'N/A'}
  Long distance reality: ${bikeComparison.bike2.realWorld?.longDistance?.join(' | ') || 'N/A'}
</bikes>

<personas>
${JSON.stringify(condensedPersonas, null, 2)}
</personas>

<decision_framework>
For each persona:
1. Match their TOP 3 priorities to bike strengths → which bike wins more?
2. Check their usage pattern → which bike excels for that use?
3. Consider their pain points → which bike avoids/solves them?
4. Factor in decision style → research-heavy needs more evidence
5. Calculate confidence: 
   - 3/3 priorities match = 85-95%
   - 2/3 priorities match = 70-84%
   - Close call = 55-69%
</decision_framework>

<verdict_schema>
{
  "personaId": "persona-N",
  "personaName": "Name",
  "personaTitle": "Title",
  "recommendedBike": "full bike name",
  "otherBike": "full bike name",
  "confidence": 50-95,
  "confidenceExplanation": "one sentence why this confidence level",
  "reasoning": [
    {
      "point": "specific reason",
      "priority": "which persona priority this addresses",
      "evidence": "data point supporting this"
    }
  ], // 3-5 reasons
  "againstReasons": [
    "specific scenario where other bike wins"
  ], // 2-3 counter-arguments
  "tangibleImpact": {
    "metric": "Fuel cost/year",
    "value": "₹8,000 savings",
    "explanation": "Based on 15,000km/year at 45 vs 38 kmpl"
  }, // optional but powerful
  "verdictOneLiner": "15-30 word punchy summary"
}
</verdict_schema>

<example_verdict>
{
  "personaId": "persona-1",
  "personaName": "Vikram",
  "personaTitle": "The Reluctant Upgrader",
  "recommendedBike": "Honda CB350",
  "otherBike": "Royal Enfield Classic 350",
  "confidence": 78,
  "confidenceExplanation": "Clear winner on 2 of 3 priorities, but RE's resale value keeps it competitive",
  "reasoning": [
    {
      "point": "Superior reliability track record",
      "priority": "Reliability above all",
      "evidence": "Zero major complaints about breakdowns in 40+ forum posts"
    },
    {
      "point": "Dense service network in Bangalore",
      "priority": "Service center within 5km",
      "evidence": "8 authorized centers within 10km of Whitefield vs 3 for RE"
    }
  ],
  "againstReasons": [
    "If resale value in 5 years is the deciding factor, RE Classic holds value 15-20% better",
    "If Vikram's colleagues all ride RE, social pressure might outweigh practical benefits"
  ],
  "tangibleImpact": {
    "metric": "Service visits/year",
    "value": "2 vs 4 visits",
    "explanation": "Based on owner reports of service intervals and issues"
  },
  "verdictOneLiner": "For a reliability-obsessed upgrader who can't afford ring road breakdowns, Honda's proven track record beats RE's charm—and his wife agrees."
}
</example_verdict>

<anti_patterns>
❌ BAD reasoning: "Better performance" | "Good value" | "Nice features"
✅ GOOD reasoning: "40% better fuel economy for his 50km daily commute saves ₹12K/year"

❌ BAD against: "The other bike is also good" | "Some people might prefer it"
✅ GOOD against: "If he gets transferred to a hill station, RE's torque at low RPM becomes crucial"

❌ BAD one-liner: "A good choice for daily commuting needs"
✅ GOOD one-liner: "For someone whose wife has veto power, the bike she'll actually sit on wins"
</anti_patterns>

Generate verdicts for all ${personas.length} personas:`;
}

/**
 * System prompt for verdict generation
 */
export const VERDICT_SYSTEM_PROMPT = 'You are an expert motorcycle advisor. Make definitive recommendations with evidence. No fence-sitting. Output only valid JSON. All output must be in English - translate any Hindi/Hinglish content.';

/**
 * Filter insights relevant to a specific persona's priorities
 * Enhanced with prose context for more informed single-verdict generation
 */
export function filterInsightsForPersona(persona: any, insights: any): any {
  // Match persona priorities to relevant praises/complaints
  const priorityKeywords = persona.priorities.flatMap((p: string) =>
    p.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4)
  );

  const filterByRelevance = (items: any[]) =>
    items.filter((item: any) =>
      priorityKeywords.some((kw: string) => item.category.toLowerCase().includes(kw))
    ).slice(0, 3);

  return {
    bike1: {
      strengths: filterByRelevance(insights.bike1.praises).map((p: any) => p.category),
      weaknesses: filterByRelevance(insights.bike1.complaints).map((c: any) => c.category),
      // Enhanced context
      reviewerConsensus: insights.bike1.contextual_summary?.reviewer_consensus || '',
      ownerConsensus: insights.bike1.contextual_summary?.owner_consensus || '',
      dailyUseReality: insights.bike1.real_world_observations?.daily_use?.slice(0, 2) || [],
      longDistanceReality: insights.bike1.real_world_observations?.long_distance?.slice(0, 2) || [],
      pillionReality: insights.bike1.real_world_observations?.pillion_experience?.slice(0, 1) || []
    },
    bike2: {
      strengths: filterByRelevance(insights.bike2.praises).map((p: any) => p.category),
      weaknesses: filterByRelevance(insights.bike2.complaints).map((c: any) => c.category),
      // Enhanced context
      reviewerConsensus: insights.bike2.contextual_summary?.reviewer_consensus || '',
      ownerConsensus: insights.bike2.contextual_summary?.owner_consensus || '',
      dailyUseReality: insights.bike2.real_world_observations?.daily_use?.slice(0, 2) || [],
      longDistanceReality: insights.bike2.real_world_observations?.long_distance?.slice(0, 2) || [],
      pillionReality: insights.bike2.real_world_observations?.pillion_experience?.slice(0, 1) || []
    }
  };
}

/**
 * Optimized single verdict prompt (for parallel processing)
 */
export function buildSingleVerdictPrompt(
  bike1Name: string,
  bike2Name: string,
  persona: any,
  insights: any
): string {
  // Only include insights relevant to this persona's priorities
  const relevantInsights = filterInsightsForPersona(persona, insights);
  
  return `<task>Recommend ${bike1Name} or ${bike2Name} for this specific persona</task>

<persona>
Name: ${persona.name}
Title: ${persona.title}
Usage: City ${persona.usagePattern.cityCommute}% | Highway ${persona.usagePattern.highway}% | Leisure ${persona.usagePattern.urbanLeisure}% | Offroad ${persona.usagePattern.offroad}%
Top Priorities: ${persona.priorities.slice(0, 3).join(' | ')}
Key Pain Points: ${persona.painPoints.slice(0, 2).join(' | ')}
Decision Style: ${persona.psychographics.decisionStyle}
Risk Tolerance: ${persona.psychographics.riskTolerance}
Archetype: "${persona.archetypeQuote}"
</persona>

<bike_comparison>
${bike1Name}:
  Strengths: ${relevantInsights.bike1.strengths.join(' | ') || 'None specific'}
  Weaknesses: ${relevantInsights.bike1.weaknesses.join(' | ') || 'None specific'}
  Reviewer consensus: ${relevantInsights.bike1.reviewerConsensus || 'N/A'}
  Owner consensus: ${relevantInsights.bike1.ownerConsensus || 'N/A'}
  Daily use reality: ${relevantInsights.bike1.dailyUseReality?.join(' | ') || 'N/A'}
  Long distance reality: ${relevantInsights.bike1.longDistanceReality?.join(' | ') || 'N/A'}
  Pillion reality: ${relevantInsights.bike1.pillionReality?.join(' | ') || 'N/A'}

${bike2Name}:
  Strengths: ${relevantInsights.bike2.strengths.join(' | ') || 'None specific'}
  Weaknesses: ${relevantInsights.bike2.weaknesses.join(' | ') || 'None specific'}
  Reviewer consensus: ${relevantInsights.bike2.reviewerConsensus || 'N/A'}
  Owner consensus: ${relevantInsights.bike2.ownerConsensus || 'N/A'}
  Daily use reality: ${relevantInsights.bike2.dailyUseReality?.join(' | ') || 'N/A'}
  Long distance reality: ${relevantInsights.bike2.longDistanceReality?.join(' | ') || 'N/A'}
  Pillion reality: ${relevantInsights.bike2.pillionReality?.join(' | ') || 'N/A'}
</bike_comparison>

<rules>
- Pick ONE winner
- Confidence 50-95%
- 3-5 reasons linked to priorities
- 2-3 genuine counter-arguments
- One punchy verdict line
</rules>

<output>
{
  "personaId": "${persona.id}",
  "personaName": "${persona.name}",
  "personaTitle": "${persona.title}",
  "recommendedBike": "winner name",
  "otherBike": "other name",
  "confidence": N,
  "confidenceExplanation": "...",
  "reasoning": [{"point": "...", "priority": "...", "evidence": "..."}],
  "againstReasons": ["...", "..."],
  "verdictOneLiner": "..."
}
</output>

JSON verdict:`;
}

