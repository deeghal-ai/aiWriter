/**
 * Prompts for Single Vehicle Content Generation
 * Specialized prompts for extracting and synthesizing vehicle page content
 * 
 * Updated: Uses transcripts + web search data, ignores YouTube comments
 */

import type { 
  SingleVehicleCorpus, 
  OwnerPulseSection,
  SingleVehicleWebData,
  VariantOptionsSection,
  HowMuchItReallyCostsSection,
  GoodTimeToBuySection
} from '../../types';

/**
 * System prompt for owner pulse extraction
 */
export const OWNER_PULSE_SYSTEM_PROMPT = `You are an expert automotive analyst specializing in extracting owner sentiment patterns from reviews and discussions.

Your task is to identify the most commonly praised and criticized aspects of a vehicle based on real owner feedback.

Key principles:
1. EVIDENCE-BASED: Only extract patterns mentioned by multiple owners
2. SPECIFIC: Use concrete descriptions, not vague terms
3. BALANCED: Include both positives and negatives fairly
4. CATEGORIZED: Assign appropriate categories to each item
5. CONCISE: Keep descriptions under 50 characters`;

/**
 * Build prompt for extracting owner pulse from corpus
 * UPDATED: Uses only transcripts (high authority) + web search specs
 * YouTube comments are excluded to focus on expert reviews
 */
export function buildOwnerPulsePrompt(corpus: SingleVehicleCorpus): string {
  const vehicleName = corpus.metadata?.vehicle || 'the vehicle';
  
  // Collect transcripts (high authority source) - PRIMARY DATA
  const transcripts = corpus.youtube?.videos?.filter(v => v.transcript)
    .map(v => `[Expert Review - ${v.channelTitle}]\n${v.transcript?.substring(0, 3000)}`) || [];
  
  // Video titles and descriptions (context, not comments)
  const videoContext = corpus.youtube?.videos?.map(v => 
    `[Video: ${v.title}] ${v.description.substring(0, 300)}`
  ) || [];
  
  // Reddit posts (but not individual comments - focus on post content)
  const redditPosts = corpus.reddit?.posts?.map(p => 
    `[Reddit Discussion] ${p.title}\n${p.selftext.substring(0, 500)}`
  ) || [];
  
  // Internal reviews (verified owner content)
  const internalReviews = corpus.internal?.reviews?.map(r => 
    `[${r.author?.isVerifiedOwner ? 'Verified Owner' : 'User Review'} - ${r.author?.name}]\n${r.title}\n${r.content}${r.pros ? '\nPros: ' + r.pros.join(', ') : ''}${r.cons ? '\nCons: ' + r.cons.join(', ') : ''}`
  ) || [];
  
  // Web search specs data (if available)
  const webSearchContext = corpus.webSearch ? formatWebSearchContext(corpus.webSearch) : '';
  
  // Prioritize: transcripts > internal reviews > reddit posts > video context
  const allFeedback = [...transcripts, ...internalReviews, ...redditPosts, ...videoContext];
  
  return `# Task: Extract Owner Pulse for ${vehicleName}

Analyze expert reviews and owner feedback to extract commonly praised and criticized aspects.

## Expert Review Transcripts & Owner Feedback (${allFeedback.length} items)

<feedback_data>
${allFeedback.slice(0, 100).join('\n\n---\n\n')}
</feedback_data>
${webSearchContext ? `\n## Web Search Specs Context\n\n${webSearchContext}` : ''}

## Instructions

1. **Rating**: Infer an overall rating (1-5) based on sentiment balance from expert reviews
2. **Total Reviews**: Estimate based on sources analyzed
3. **Most Praised**: Extract 3-6 commonly praised aspects
   - Each praise should be specific (e.g., "Punchy turbo petrol engine" not "Good engine")
   - Use actual specs from web search when available
   - Assign category: performance, value, technology, drivability, comfort, safety, design, reliability, features, variety
4. **Most Criticized**: Extract 3-6 commonly criticized aspects
   - Each criticism should be specific (e.g., "Turbo petrol fuel economy (8-9 kmpl city)" not "Bad mileage")
   - Assign category: efficiency, space, features, value, comfort, reliability, build-quality, performance, pricing

## Output Format

Return valid JSON with keys in this EXACT order:
{
  "rating": 4.2,
  "totalReviews": 150,
  "mostPraised": [
    { "text": "Punchy turbo petrol engine", "category": "performance" },
    { "text": "Feature-rich for the price", "category": "value" }
  ],
  "mostCriticized": [
    { "text": "Turbo petrol fuel economy (8-9 kmpl city)", "category": "efficiency" },
    { "text": "Rear seat space for tall passengers", "category": "space" }
  ]
}

Extract patterns now. Focus on specificity and evidence from expert reviews.`;
}

/**
 * Format web search context for inclusion in prompts
 */
function formatWebSearchContext(webData: SingleVehicleWebData): string {
  const sections: string[] = [];
  
  if (webData.specs?.results?.length > 0) {
    const specsSnippets = webData.specs.results.slice(0, 3).map(r => r.snippet).join('\n');
    sections.push(`### Specifications\n${specsSnippets}`);
  }
  
  if (webData.pricing?.results?.length > 0) {
    const pricingSnippets = webData.pricing.results.slice(0, 2).map(r => r.snippet).join('\n');
    sections.push(`### Pricing\n${pricingSnippets}`);
  }
  
  if (webData.variants?.results?.length > 0) {
    const variantSnippets = webData.variants.results.slice(0, 2).map(r => r.snippet).join('\n');
    sections.push(`### Variants\n${variantSnippets}`);
  }
  
  return sections.join('\n\n');
}

/**
 * System prompt for quick decision generation
 */
export const QUICK_DECISION_SYSTEM_PROMPT = `You are an expert automotive content strategist who helps buyers make fast decisions.

Your task is to synthesize owner feedback into actionable buying advice.

Key principles:
1. DECISIVE: Take a clear stance, don't hedge
2. SPECIFIC: Reference actual features and scenarios
3. BUYER-FOCUSED: Address real buyer concerns
4. HONEST: Include both "perfect if" and "skip if" scenarios
5. MEMORABLE: Headlines should be punchy and memorable`;

/**
 * Build prompt for quick decision generation
 * UPDATED: Includes web search data for accurate specs/pricing
 */
export function buildQuickDecisionPrompt(
  corpus: SingleVehicleCorpus,
  ownerPulse: OwnerPulseSection
): string {
  const vehicleName = corpus.metadata?.vehicle || 'the vehicle';
  
  // Get key transcripts for deeper context
  const keyTranscripts = corpus.youtube?.videos?.filter(v => v.transcript)
    .slice(0, 3)
    .map(v => v.transcript?.substring(0, 1500)) || [];
  
  // Extract web search pricing data
  const pricingContext = corpus.webSearch?.pricing?.results?.slice(0, 2)
    .map(r => r.snippet).join('\n') || '';
  
  // Extract web search specs data
  const specsContext = corpus.webSearch?.specs?.results?.slice(0, 2)
    .map(r => r.snippet).join('\n') || '';
  
  return `# Task: Generate Quick Decision Content for ${vehicleName}

Based on owner sentiment, expert reviews, and market data, generate buying decision content.

## Owner Pulse Summary

Rating: ${ownerPulse.rating}/5 (${ownerPulse.totalReviews} reviews)

**Most Praised:**
${ownerPulse.mostPraised.map(p => `- ${p.text} (${p.category})`).join('\n')}

**Most Criticized:**
${ownerPulse.mostCriticized.map(c => `- ${c.text} (${c.category})`).join('\n')}
${pricingContext ? `\n## Pricing Data (from web search)\n\n${pricingContext}` : ''}
${specsContext ? `\n## Specifications (from web search)\n\n${specsContext}` : ''}

## Expert Review Context

<expert_reviews>
${keyTranscripts.join('\n\n---\n\n')}
</expert_reviews>

## Instructions

Generate the following:

1. **priceRange**: Extract actual price range from data
   - min: Starting price (e.g., "₹7.89L")
   - max: Top variant price (e.g., "₹16.89L")
   - minValue: Numeric value in rupees
   - maxValue: Numeric value in rupees
   - priceType: "ex-showroom"

2. **idealFor**: 3-5 buyer segments this vehicle suits best
   - Each with a label and icon
   - Icons: steering-wheel, city, smartphone, family, highway, value, safety, comfort, performance

3. **verdict**: Overall verdict
   - headline: Punchy one-liner (under 60 chars)
   - summary: 2-3 sentences on value proposition
   - highlightType: positive/negative/neutral

4. **perfectIf**: Describe ideal buyer (under 150 chars)
   Example: "You prioritize driving engagement, want multiple powertrain choices, and value connected car tech"

5. **skipIf**: Describe who should skip (under 150 chars)
   Example: "You need maximum rear seat space, want a panoramic sunroof, or prioritize fuel efficiency"

6. **keyAdvantage**: Key selling points (under 100 chars)
   Example: "120 HP turbo + 7-speed DCT + Dual 12.3\" screens + Level 2 ADAS"

## Output Format

Return valid JSON with keys in this EXACT order:
{
  "priceRange": {
    "min": "₹7.89L",
    "max": "₹16.89L",
    "minValue": 789000,
    "maxValue": 1689000,
    "priceType": "ex-showroom"
  },
  "idealFor": [
    { "label": "Driving Enthusiasts", "icon": "steering-wheel" }
  ],
  "verdict": {
    "headline": "Compact SUV that prioritizes driving fun",
    "summary": "The most engaging compact SUV to drive...",
    "highlightType": "positive"
  },
  "perfectIf": "You prioritize driving engagement...",
  "skipIf": "You need maximum rear seat space...",
  "keyAdvantage": "120 HP turbo + 7-speed DCT + Level 2 ADAS"
}

Use REAL pricing from the data. Be specific and decisive.`;
}

/**
 * System prompt for segment scorecard generation
 */
export const SEGMENT_SCORECARD_SYSTEM_PROMPT = `You are an automotive market analyst specializing in competitive positioning.

Your task is to rank a vehicle across key categories based on owner feedback and market position.

Key principles:
1. COMPARATIVE: Always rank relative to segment competitors
2. EVIDENCE-BASED: Rankings must be supported by feedback
3. FAIR: Acknowledge weaknesses honestly
4. CATEGORY-SPECIFIC: Each category gets distinct highlights
5. ACTIONABLE: Help buyers understand competitive position`;

/**
 * Build prompt for segment scorecard generation
 */
export function buildSegmentScorecardPrompt(
  corpus: SingleVehicleCorpus,
  ownerPulse: OwnerPulseSection
): string {
  const vehicleName = corpus.metadata?.vehicle || 'the vehicle';
  
  // Get comparison mentions from corpus (transcripts + descriptions only - no comments)
  const allText = [
    ...(corpus.youtube?.videos?.map(v => v.transcript || '') || []),
    ...(corpus.youtube?.videos?.map(v => v.description || '') || [])
  ].join(' ').toLowerCase();
  
  // Detect mentioned competitors for context
  const competitorMentions = {
    brezza: (allText.match(/brezza/g) || []).length,
    nexon: (allText.match(/nexon/g) || []).length,
    sonet: (allText.match(/sonet/g) || []).length,
    xuv: (allText.match(/xuv/g) || []).length,
    ecosport: (allText.match(/ecosport/g) || []).length,
  };
  
  return `# Task: Generate Segment Scorecard for ${vehicleName}

Rank this vehicle across key categories relative to its segment competitors.

## Owner Pulse

Rating: ${ownerPulse.rating}/5

**Praised:** ${ownerPulse.mostPraised.map(p => p.text).join(', ')}
**Criticized:** ${ownerPulse.mostCriticized.map(c => c.text).join(', ')}

## Competitor Mentions in Discussions

${Object.entries(competitorMentions).filter(([_, count]) => count > 0).map(([name, count]) => `- ${name}: ${count} mentions`).join('\n')}

## Instructions

Generate rankings for 5 categories:

1. **Safety & Security** - ADAS, airbags, build quality, crash ratings
2. **Fuel Efficiency** - Real-world mileage, range
3. **Value for Money** - Features vs price, service costs
4. **Style & Design** - Exterior, interior, premium feel
5. **Performance & Drive** - Power, handling, driving engagement

For each category object, use these keys in order:
- name: Category name (e.g., "Safety & Security")
- rank: "#X of Y" format (assume 6 competitors in segment)
- rankNumber: 1-6
- totalInSegment: 6
- status: "Best in class" / "Leads segment" / "Above Average" / "Average" / "Below Average"
- statusType: positive (rank 1-2) / neutral (rank 3-4) / negative (rank 5-6)
- highlights: 2-3 specific points supporting the rank

## Output Format

Return valid JSON with keys in this EXACT order:
{
  "leadingCount": 2,
  "badge": "2 Leading",
  "categories": [
    {
      "name": "Safety & Security",
      "rank": "#1 of 6",
      "rankNumber": 1,
      "totalInSegment": 6,
      "status": "Best in class",
      "statusType": "positive",
      "highlights": ["Level 2 ADAS", "6 airbags", "All-wheel disc brakes"]
    }
  ],
  "summary": "Vehicle positioning statement here..."
}`;
}

/**
 * System prompt for competitor analysis
 */
export const COMPETITOR_ANALYSIS_SYSTEM_PROMPT = `You are an automotive market analyst extracting competitor information.

Your task is to identify competitors mentioned in owner discussions and their key differentiators.

Key principles:
1. EVIDENCE-BASED: Only include competitors actually mentioned
2. SPECIFIC: Include concrete differentiators
3. FAIR: Acknowledge competitor strengths
4. RELEVANT: Focus on direct competitors in the segment
5. CURRENT: Use recent market positioning`;

/**
 * Build prompt for competitor analysis extraction
 * UPDATED: Pass raw transcripts + web search to AI without pre-filtering
 */
/**
 * Segment-based competitor hints for Indian market
 */
const SEGMENT_COMPETITOR_HINTS: Record<string, string> = {
  'Compact SUV': `Known Compact SUV competitors in India:
- Maruti Brezza (segment bestseller)
- Tata Nexon (safety leader, 5-star NCAP)
- Kia Sonet (feature-rich)
- Hyundai Venue (turbo performance)
- Mahindra XUV 3XO (value proposition)
- Nissan Magnite (aggressive pricing)
- Renault Kiger (affordable turbo)
- Toyota Urban Cruiser Taisor (reliability)`,

  'Midsize SUV': `Known Midsize SUV competitors in India:
- Hyundai Creta (segment leader)
- Kia Seltos (feature-rich)
- Maruti Grand Vitara (hybrid option)
- Toyota Urban Cruiser Hyryder (hybrid)
- Skoda Kushaq (driving dynamics)
- VW Taigun (build quality)
- MG Astor (AI features)
- Honda Elevate (ride comfort)`,

  'Compact Sedan': `Known Compact Sedan competitors in India:
- Maruti Dzire (bestseller)
- Hyundai Aura (features)
- Tata Tigor (safety, EV option)
- Honda Amaze (ride quality)`,

  'Hatchback': `Known Hatchback competitors in India:
- Maruti Swift (sporty)
- Maruti Baleno (premium)
- Hyundai i20 (features)
- Tata Altroz (safety)
- Toyota Glanza (reliability)
- VW Polo (driving dynamics)`,

  'Premium SUV': `Known Premium SUV competitors in India:
- Mahindra XUV700 (value leader)
- Tata Harrier (5-star safety)
- Tata Safari (7-seater)
- Hyundai Tucson (premium)
- Jeep Compass (off-road)
- MG Hector (features)`,
};

export function buildCompetitorAnalysisPrompt(corpus: SingleVehicleCorpus): string {
  const vehicleName = corpus.metadata?.vehicle || 'the vehicle';
  const vehicleNameLower = vehicleName.toLowerCase();
  
  // PRIMARY SOURCE: Dedicated competitor search results (if available)
  const competitorSearchResults = corpus.webSearch?.competitors?.results?.map(r => 
    `[${r.source}] ${r.title}\n${r.snippet}`
  ) || [];
  
  // SECONDARY SOURCE: Video descriptions often explicitly mention rivals
  // This is very reliable as reviewers list competitors in descriptions
  const videoDescriptions = corpus.youtube?.videos?.filter(v => {
    const desc = (v.description || '').toLowerCase();
    return desc.includes('rival') || desc.includes('competitor') || desc.includes(' vs ') || 
           desc.includes('take on') || desc.includes('competes') || desc.includes('alternative');
  }).map(v => `[${v.channelTitle}] ${v.title}\n${v.description?.substring(0, 500)}`) || [];
  
  // If no filtered descriptions, just take first 3 descriptions as they often mention competitors
  const allDescriptions = videoDescriptions.length > 0 ? videoDescriptions : 
    corpus.youtube?.videos?.slice(0, 5).map(v => `[${v.channelTitle}] ${v.title}\n${v.description?.substring(0, 400)}`) || [];
  
  // TERTIARY SOURCE: Sales data often lists segment rankings
  const salesContext = corpus.webSearch?.salesData?.results?.map(r => r.snippet) || [];
  
  // QUATERNARY SOURCE: YouTube transcripts that mention comparisons
  const transcripts = corpus.youtube?.videos?.filter(v => {
    const text = (v.transcript || '' + v.title).toLowerCase();
    return text.includes(' vs ') || text.includes('comparison') || text.includes('competes') || text.includes('rival');
  })
    .map(v => `[${v.channelTitle}] ${v.title}\n${v.transcript?.substring(0, 1500)}`)
    .slice(0, 3) || [];
  
  // Detect segment from vehicle name itself first, then from web data
  let segmentHint = '';
  
  // Direct vehicle name detection for known models
  const knownCompactSedans = ['dzire', 'amaze', 'aura', 'tigor', 'aspire'];
  const knownHatchbacks = ['swift', 'baleno', 'i20', 'i10', 'altroz', 'glanza', 'polo', 'tiago'];
  const knownCompactSUVs = ['venue', 'brezza', 'nexon', 'sonet', 'xuv300', 'xuv 3xo', 'magnite', 'kiger', 'punch', 'fronx', 'exter'];
  const knownMidsizeSUVs = ['creta', 'seltos', 'grand vitara', 'hyryder', 'kushaq', 'taigun', 'astor', 'elevate', 'curvv'];
  
  if (knownCompactSedans.some(s => vehicleNameLower.includes(s))) {
    segmentHint = SEGMENT_COMPETITOR_HINTS['Compact Sedan'];
  } else if (knownHatchbacks.some(s => vehicleNameLower.includes(s))) {
    segmentHint = SEGMENT_COMPETITOR_HINTS['Hatchback'];
  } else if (knownCompactSUVs.some(s => vehicleNameLower.includes(s))) {
    segmentHint = SEGMENT_COMPETITOR_HINTS['Compact SUV'];
  } else if (knownMidsizeSUVs.some(s => vehicleNameLower.includes(s))) {
    segmentHint = SEGMENT_COMPETITOR_HINTS['Midsize SUV'];
  }
  
  // Fallback: detect from web data if not detected from name
  if (!segmentHint) {
    const webText = [
      ...(corpus.webSearch?.specs?.results?.map(r => r.snippet) || []),
      ...(corpus.webSearch?.competitors?.results?.map(r => r.snippet) || [])
    ].join(' ').toLowerCase();
  
    if (webText.includes('compact suv') || webText.includes('sub-4m suv') || webText.includes('sub 4m suv')) {
      segmentHint = SEGMENT_COMPETITOR_HINTS['Compact SUV'];
    } else if (webText.includes('midsize suv') || webText.includes('mid-size suv') || webText.includes('c-segment suv')) {
      segmentHint = SEGMENT_COMPETITOR_HINTS['Midsize SUV'];
    } else if (webText.includes('compact sedan') || webText.includes('sub-4m sedan') || webText.includes('entry sedan')) {
      segmentHint = SEGMENT_COMPETITOR_HINTS['Compact Sedan'];
    } else if (webText.includes('hatchback') || webText.includes('premium hatch')) {
      segmentHint = SEGMENT_COMPETITOR_HINTS['Hatchback'];
    } else if (webText.includes('premium suv') || webText.includes('full-size suv') || webText.includes('d-segment')) {
      segmentHint = SEGMENT_COMPETITOR_HINTS['Premium SUV'];
    }
  }
  
  return `# Task: Extract Competitor Analysis for ${vehicleName}

Identify the main competitors for ${vehicleName} based on the data sources below.

IMPORTANT: ${vehicleName} is a compact sedan. Only extract OTHER compact sedans as competitors.
Do NOT include SUVs (Nexon, Creta, Venue) or hatchbacks (Swift) as competitors - they are different segments.

## PRIMARY SOURCE: Video Descriptions (Reviewers often list rivals here)

<video_descriptions>
${allDescriptions.length > 0 ? allDescriptions.join('\n\n---\n\n') : 'No video descriptions available.'}
</video_descriptions>

## Competitor Comparison Articles

<competitor_search>
${competitorSearchResults.length > 0 ? competitorSearchResults.join('\n\n---\n\n') : 'No dedicated competitor search results available.'}
</competitor_search>

## Sales & Segment Data

<sales_context>
${salesContext.length > 0 ? salesContext.join('\n\n') : 'No sales ranking data available.'}
</sales_context>

## Expert Review Transcripts

<transcripts>
${transcripts.length > 0 ? transcripts.join('\n\n---\n\n') : 'No comparison-focused transcripts available.'}
</transcripts>

${segmentHint ? `## Segment Context (MUST match this segment)

${segmentHint}

CRITICAL: Only extract competitors from this list that are ACTUALLY mentioned in the data above.
Do NOT include vehicles from other segments even if mentioned in passing.
` : ''}
## Instructions

1. **FIRST check video descriptions** - reviewers typically list "rivals like X, Y, Z" explicitly
2. Look for phrases like "takes on", "competes with", "rivals", "alternative to"
3. Cross-reference with the segment context - only include vehicles from the SAME segment
4. Do NOT include ${vehicleName} itself as a competitor
5. Do NOT include vehicles from different segments (e.g., SUVs for a sedan)

Extract 3-5 main competitors with:

1. **name**: Full competitor name (e.g., "Honda Amaze", "Hyundai Aura")
2. **tag**: Positioning based on how the data describes it
   - "Segment Leader" - market leader / best seller
   - "Safety Champion" - known for safety ratings
   - "Feature Rich" - loaded with features
   - "Value King" - best value proposition  
   - "Tech Forward" - technology leader
   - "Comfort Focused" - ride/comfort specialist
   - "Premium Choice" - upmarket positioning
   - "Upcoming Challenger" - new/upcoming model
3. **tagType**: primary (main rival), secondary (notable), neutral (mentioned)
4. **priceRange**: Approximate price range if mentioned (e.g., "₹8-14L")
5. **keyDifferentiator**: One key strength vs ${vehicleName} based on data

## Output Format

Return valid JSON with exact key order:
{
  "competitors": [
    {
      "name": "Honda Amaze",
      "tag": "Comfort Focused",
      "tagType": "primary",
      "priceRange": "₹7-10L",
      "keyDifferentiator": "Best-in-class ride quality in compact sedan segment"
    },
    {
      "name": "Hyundai Aura",
      "tag": "Feature Rich",
      "tagType": "primary",
      "priceRange": "₹6-9L",
      "keyDifferentiator": "More features and modern design"
    }
  ]
}

IMPORTANT: 
- Extract ONLY competitors explicitly mentioned in the data
- ONLY include vehicles from the SAME segment (sedan competitors for sedan, SUV for SUV)
- Quality over quantity - if only 2 competitors are clearly mentioned, return only 2`;
}

/**
 * Build prompt for vehicle info extraction
 */
export function buildVehicleInfoPrompt(vehicleName: string): string {
  return `# Task: Extract Vehicle Information

Parse the vehicle name and extract structured information.

Vehicle Name: ${vehicleName}

## Instructions

Extract:
1. **make**: Manufacturer (e.g., "Hyundai", "Maruti Suzuki", "Tata")
2. **model**: Model name (e.g., "Venue", "Brezza", "Nexon")
3. **year**: Model year (use 2025 if unclear, or extract from context)
4. **segment**: Vehicle segment
   - "Compact SUV" (sub-4m SUV)
   - "Midsize SUV" (Creta-size)
   - "Premium SUV"
   - "Hatchback"
   - "Sedan"
   - "Sports Bike"
   - "Commuter Bike"
   - "Adventure Tourer"

## Output Format

Return valid JSON:
{
  "make": "Hyundai",
  "model": "Venue",
  "year": 2025,
  "segment": "Compact SUV"
}`;
}

/**
 * Build prompt for good time to buy analysis
 * UPDATED: Uses web search lifecycle/sales data instead of comments
 */
export function buildGoodTimeToBuyPrompt(
  corpus: SingleVehicleCorpus,
  vehicleInfo: { make: string; model: string; year: number }
): string {
  const vehicleName = `${vehicleInfo.make} ${vehicleInfo.model}`;
  
  // Get lifecycle data from web search (primary source)
  const lifecycleData = corpus.webSearch?.lifecycle?.results?.map(r => 
    `[${r.source}] ${r.snippet}`
  ).join('\n\n') || '';
  
  // Get sales data from web search
  const salesData = corpus.webSearch?.salesData?.results?.map(r => 
    `[${r.source}] ${r.snippet}`
  ).join('\n\n') || '';
  
  // Look for timing mentions in transcripts (secondary source)
  const transcriptTimingMentions = corpus.youtube?.videos?.filter(v => v.transcript)
    .map(v => {
      const transcript = v.transcript || '';
      const lowerTranscript = transcript.toLowerCase();
      if (lowerTranscript.includes('launch') || 
          lowerTranscript.includes('facelift') || 
          lowerTranscript.includes('new generation') ||
          lowerTranscript.includes('update')) {
        // Extract relevant section
        const matches = transcript.match(/.{0,200}(launch|facelift|new generation|update).{0,200}/gi) || [];
        return `[${v.channelTitle}] ${matches.slice(0, 2).join(' ... ')}`;
      }
      return null;
    }).filter(Boolean) || [];
  
  return `# Task: Analyze Good Time to Buy for ${vehicleName}

Based on web search data and expert reviews, determine if now is a good time to buy.

## Vehicle Info
- Model Year: ${vehicleInfo.year}
- Make: ${vehicleInfo.make}
- Model: ${vehicleInfo.model}
${lifecycleData ? `\n## Lifecycle Data (from web search)\n\n<lifecycle_data>\n${lifecycleData}\n</lifecycle_data>` : ''}
${salesData ? `\n## Sales Data (from web search)\n\n<sales_data>\n${salesData}\n</sales_data>` : ''}
${transcriptTimingMentions.length > 0 ? `\n## Expert Review Mentions\n\n${transcriptTimingMentions.slice(0, 5).join('\n\n')}` : ''}

## Instructions

Analyze and generate:

1. **overallSignal**: "Right Timing" / "Consider Waiting" / "Proceed with Caution"
2. **overallSignalType**: positive/negative/neutral

3. **salesRank**:
   - label: "Sales Rank"
   - value: Extract from sales data (e.g., "#4 in segment", "Top 5")
   - description: Brief context with monthly units if available

4. **lifecycleCheck**:
   - label: "Lifecycle Check"
   - status: "Fresh Launch" / "Mid-Cycle" / "Due for Update"
   - statusType: positive/neutral/negative
   - faceliftExpected: Extract from lifecycle data
   - generationYear: Current generation year

5. **timingSignal**:
   - label: "Timing Signal"
   - status: "Safe to buy" / "Wait recommended" / "Neutral"
   - statusType: positive/negative/neutral
   - reason: Brief explanation based on lifecycle data

6. **stockAvailability**: (if data available)
   - Array of colors with waiting periods

## Output Format

Return valid JSON matching the goodTimeToBuy schema. Use REAL data from web search.`;
}

/**
 * Build placeholder variant options structure
 */
export function buildVariantOptionsPlaceholder(vehicleName: string): string {
  return `{
  "fuelType": [
    { "label": "Petrol", "value": "petrol", "isDefault": true, "variants": ["Base", "Mid", "Top"] },
    { "label": "Diesel", "value": "diesel", "isDefault": false, "variants": ["Base", "Mid", "Top"] }
  ],
  "transmission": [
    { "label": "Manual", "value": "manual", "availableWith": ["petrol", "diesel"] },
    { "label": "Automatic", "value": "automatic", "availableWith": ["petrol"] }
  ],
  "engineType": [
    { "label": "1.2L Petrol", "value": "1.2l-petrol", "power": "XX PS", "torque": "XX Nm", "fuelType": "petrol" },
    { "label": "1.5L Diesel", "value": "1.5l-diesel", "power": "XX PS", "torque": "XX Nm", "fuelType": "diesel" }
  ],
  "heroFeatures": [
    { "label": "Feature 1", "icon": "display", "availableFrom": "Mid" },
    { "label": "Feature 2", "icon": "safety", "availableFrom": "Top" }
  ],
  "_placeholder": true,
  "_source": "Requires variant API for ${vehicleName}"
}`;
}

/**
 * Build placeholder cost structure
 */
export function buildCostPlaceholder(vehicleName: string): string {
  return `{
  "location": "Delhi NCR",
  "locationDefault": true,
  "selectedVariant": "Top Variant",
  "realOnRoadPrice": {
    "amount": "₹X.XXL",
    "value": 0,
    "breakdown": {
      "exShowroom": 0,
      "rto": 0,
      "insurance": 0,
      "accessories": 0
    }
  },
  "monthlyBurn": {
    "emi": { "amount": "₹XX,XXX", "value": 0 },
    "fuel": { "amount": "₹X,XXX", "value": 0 },
    "service": { "amount": "₹X,XXX", "value": 0 }
  },
  "totalMonthly": { "amount": "₹XX,XXX", "value": 0 },
  "_placeholder": true,
  "_source": "Requires pricing API for ${vehicleName}"
}`;
}

// ============================================
// AI-POWERED BUILDERS FROM WEB SEARCH DATA
// ============================================

/**
 * System prompt for variant options extraction
 */
export const VARIANT_OPTIONS_SYSTEM_PROMPT = `You are an automotive data analyst extracting structured variant information from web search results.

Your task is to parse pricing and variant data into a structured format.

Key principles:
1. ACCURATE: Use exact prices and specs from the data
2. COMPLETE: Include all fuel types, transmissions, and variants mentioned
3. STRUCTURED: Follow the exact schema format
4. INDIAN MARKET: Use Indian naming conventions and pricing`;

/**
 * Build prompt for extracting variant options from web search
 */
export function buildVariantOptionsPrompt(
  vehicleName: string,
  webData: SingleVehicleWebData
): string {
  const variantsData = webData.variants.results.map(r => 
    `[${r.source}] ${r.title}\n${r.snippet}`
  ).join('\n\n');
  
  const specsData = webData.specs.results.map(r => 
    `[${r.source}] ${r.snippet}`
  ).join('\n\n');
  
  const pricingData = webData.pricing.results.map(r => 
    `[${r.source}] ${r.snippet}`
  ).join('\n\n');
  
  return `# Task: Extract Variant Options for ${vehicleName}

Parse the web search data to extract structured variant information.

## Variants Data

<variants_data>
${variantsData}
</variants_data>

## Specifications Data

<specs_data>
${specsData}
</specs_data>

## Pricing Data

<pricing_data>
${pricingData}
</pricing_data>

## Instructions

Extract and structure:

1. **fuelType**: Array of fuel options
   - label: Display name (e.g., "Petrol", "Turbo Petrol", "Diesel")
   - value: slug (e.g., "petrol", "turbo-petrol", "diesel")
   - isDefault: true for most common option
   - variants: Array of variant names available with this fuel

2. **transmission**: Array of transmission options
   - label: Display name (e.g., "6-Speed Manual", "7-Speed DCT")
   - value: slug (e.g., "manual", "dct", "automatic")
   - availableWith: Array of fuel types this transmission works with

3. **engineType**: Array of engine specifications
   - label: Engine name (e.g., "1.0L Turbo (3-Cyl)")
   - value: slug
   - power: Power output (e.g., "120 PS")
   - torque: Torque output (e.g., "172 Nm")
   - fuelType: Which fuel type this engine uses

4. **wheelTypes**: Array of wheel options (if mentioned)
   - label: Description (e.g., "16\" Alloy")
   - value: slug
   - availableOn: Which variants get this

5. **heroFeatures**: Key features across variants
   - label: Feature name
   - icon: display/safety/camera/speaker/seat/wireless
   - availableFrom: Starting variant

## Output Format

Return valid JSON with keys in this EXACT order:
{
  "fuelType": [
    { "label": "Petrol", "value": "petrol", "isDefault": true, "variants": ["E", "S", "S+"] }
  ],
  "transmission": [
    { "label": "6-Speed Manual", "value": "manual", "availableWith": ["petrol", "diesel"] }
  ],
  "engineType": [
    { "label": "1.0L Turbo (3-Cyl)", "value": "1.0l-turbo", "power": "120 PS", "torque": "172 Nm", "fuelType": "turbo-petrol" }
  ],
  "wheelTypes": [
    { "label": "16\\" Alloy", "value": "16-alloy", "availableOn": ["S+", "SX"] }
  ],
  "heroFeatures": [
    { "label": "Dual 12.3\\" Screens", "icon": "display", "availableFrom": "S+" }
  ]
}

Extract REAL data only.`;
}

/**
 * System prompt for cost structure extraction
 */
export const COST_STRUCTURE_SYSTEM_PROMPT = `You are an automotive finance analyst creating cost breakdowns from web search data.

Your task is to parse pricing data into a structured ownership cost format.

Key principles:
1. REALISTIC: Use actual market prices and rates
2. COMPLETE: Include all cost components
3. INDIAN CONTEXT: Use Indian pricing conventions (lakhs, RTO rates)
4. PRACTICAL: Include EMI, fuel, and service estimates`;

/**
 * Build prompt for extracting cost structure from web search
 */
export function buildCostStructurePrompt(
  vehicleName: string,
  webData: SingleVehicleWebData
): string {
  const pricingData = webData.pricing.results.map(r => 
    `[${r.source}] ${r.snippet}`
  ).join('\n\n');
  
  const specsData = webData.specs.results.map(r => 
    `[${r.source}] ${r.snippet}`
  ).join('\n\n');
  
  return `# Task: Build Cost Structure for ${vehicleName}

Parse web search data to create a complete ownership cost breakdown.

## Pricing Data

<pricing_data>
${pricingData}
</pricing_data>

## Specs Data (for mileage)

<specs_data>
${specsData}
</specs_data>

## Instructions

Extract and calculate:

1. **location**: Default to "Delhi NCR"
2. **locationDefault**: true

3. **selectedVariant**: Use top/popular variant name

4. **realOnRoadPrice**:
   - amount: Formatted price (e.g., "₹14.85L")
   - value: Numeric value in rupees
   - breakdown:
     - exShowroom: Base price
     - rto: ~8% of ex-showroom for Delhi
     - insurance: ~4% of ex-showroom
     - accessories: Estimate ₹30,000

5. **monthlyBurn**:
   - emi: Calculate based on 80% loan, 60 months, 9.5% interest
     - Include loanAmount, tenure, interestRate
   - fuel: Calculate based on 1000km/month, mileage from specs, ₹103/L petrol
     - Include assumedKmPerMonth, fuelEfficiency, fuelPrice
   - service: Annual service cost / 12
     - Include basis

6. **totalMonthly**: Sum of EMI + fuel + service

7. **savingsNote**: (optional) Compare fuel cost with diesel variant if available

## Output Format

Return valid JSON with keys in this EXACT order:
{
  "location": "Delhi NCR",
  "locationDefault": true,
  "selectedVariant": "SX(O) Turbo DCT",
  "realOnRoadPrice": {
    "amount": "₹14.85L",
    "value": 1485000,
    "breakdown": {
      "exShowroom": 1299000,
      "rto": 103920,
      "insurance": 52000,
      "accessories": 30000
    }
  },
  "monthlyBurn": {
    "emi": { "amount": "₹26,800", "value": 26800, "loanAmount": 1200000, "tenure": "60 months", "interestRate": "9.5%" },
    "fuel": { "amount": "₹6,200", "value": 6200, "assumedKmPerMonth": 1000, "fuelEfficiency": "10 kmpl", "fuelPrice": "₹103/L" },
    "service": { "amount": "₹1,100", "value": 1100, "basis": "Annual service cost averaged monthly" }
  },
  "totalMonthly": { "amount": "₹34,100", "value": 34100 },
  "savingsNote": { "text": "Diesel saves ₹4K monthly", "comparisonBasis": "1000 km/month" }
}

Use REAL pricing data from web search.`;
}

/**
 * System prompt for good time to buy from web search
 */
export const GOOD_TIME_TO_BUY_SYSTEM_PROMPT = `You are an automotive market analyst evaluating purchase timing.

Your task is to analyze lifecycle and sales data to determine if now is a good time to buy.

Key principles:
1. DATA-DRIVEN: Base recommendations on actual data
2. LIFECYCLE-AWARE: Consider model generation and facelift timing
3. MARKET-AWARE: Consider sales performance and competition
4. PRACTICAL: Give actionable advice`;

/**
 * Build prompt for good time to buy from web search
 */
export function buildGoodTimeToBuyFromWebSearchPrompt(
  vehicleName: string,
  webData: SingleVehicleWebData,
  vehicleInfo: { make: string; model: string; year: number }
): string {
  const lifecycleData = webData.lifecycle.results.map(r => 
    `[${r.source}] ${r.snippet}`
  ).join('\n\n');
  
  const salesData = webData.salesData.results.map(r => 
    `[${r.source}] ${r.snippet}`
  ).join('\n\n');
  
  return `# Task: Analyze Good Time to Buy for ${vehicleName}

Based on web search data, determine if now is a good time to buy.

## Vehicle Info
- Make: ${vehicleInfo.make}
- Model: ${vehicleInfo.model}
- Model Year: ${vehicleInfo.year}

## Lifecycle Data

<lifecycle_data>
${lifecycleData}
</lifecycle_data>

## Sales Data

<sales_data>
${salesData}
</sales_data>

## Instructions

Analyze and generate:

1. **overallSignal**: "Right Timing" / "Consider Waiting" / "Proceed with Caution"
   - "Right Timing" if fresh launch or mid-cycle with no imminent update
   - "Consider Waiting" if facelift/update expected within 6 months
   - "Proceed with Caution" if end of lifecycle or declining sales

2. **overallSignalType**: positive/negative/neutral

3. **salesRank**:
   - label: "Sales Rank"
   - value: Extract position (e.g., "#4 in segment", "Top 5")
   - description: Include monthly units if available

4. **lifecycleCheck**:
   - label: "Lifecycle Check"
   - status: "Fresh Launch" / "Mid-Cycle" / "Due for Update"
   - statusType: positive (fresh) / neutral (mid) / negative (due)
   - faceliftExpected: Extract from data (e.g., "Not expected before 2028")
   - generationYear: Year current generation launched

5. **timingSignal**:
   - label: "Timing Signal"
   - status: "Safe to buy" / "Wait recommended" / "Neutral"
   - statusType: positive/negative/neutral
   - reason: One-line explanation

6. **stockAvailability**: Array with common colors and waiting periods
   - Extract from data or use typical patterns:
   - Popular colors: 2-3 weeks
   - Other colors: 3-4 weeks

## Output Format

Return valid JSON with keys in this EXACT order:
{
  "overallSignal": "Right Timing",
  "overallSignalType": "positive",
  "salesRank": {
    "label": "Sales Rank",
    "value": "#4 in segment",
    "description": "8,500 units/month"
  },
  "lifecycleCheck": {
    "label": "Lifecycle Check",
    "status": "Fresh Launch",
    "statusType": "positive",
    "faceliftExpected": "Not expected before 2028",
    "generationYear": 2025
  },
  "timingSignal": {
    "label": "Timing Signal",
    "status": "Safe to buy",
    "statusType": "positive",
    "reason": "Brand new model, no refresh expected soon"
  },
  "stockAvailability": [
    { "color": "White", "colorCode": "#FFFFFF", "waitingPeriod": "2-3 Weeks" }
  ]
}

Use REAL data from web search.`;
}
