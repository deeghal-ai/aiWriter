import {
  InsightExtractionResult,
  PersonaGenerationResult,
  NarrativePlan,
} from '../../types';

/**
 * Build matrix section prompt with BALANCED, HOLISTIC content
 * Uses ALL relevant insights, not just keyword-filtered ones
 */
export function buildMatrixPrompt(
  bike1Name: string,
  bike2Name: string,
  focusArea: string,
  insights: InsightExtractionResult,
  personas: PersonaGenerationResult,
  narrativePlan: NarrativePlan,
  allocatedQuotes: string[]
): string {
  // Get comprehensive relevant insights using smart matching
  const relevantInsights = getRelevantInsightsForArea(focusArea, insights);
  
  // Get personas who care about this area
  const relevantPersonas = getPersonasForArea(focusArea, personas);
  
  // Get tension point for this area if exists
  const tensionPoint = (narrativePlan?.tension_points || [])
    .find(t => t.dimension.toLowerCase().includes(focusArea.toLowerCase().split(' ')[0]));

  return `<role>Writing the "${focusArea}" section of decision matrix for ${bike1Name} vs ${bike2Name}</role>

<focus_area>${focusArea}</focus_area>

<comprehensive_insights>
## ${bike1Name}

### Strengths in this area:
${relevantInsights.bike1.strengths.map(s => `• ${s.category} (${s.frequency} mentions)
  "${s.quote}"`).join('\n') || '• No specific strengths found - use general performance data'}

### Weaknesses in this area:
${relevantInsights.bike1.weaknesses.map(w => `• ${w.category} (${w.frequency} mentions)
  "${w.quote}"`).join('\n') || '• No specific weaknesses found'}

### Surprising findings:
${relevantInsights.bike1.surprising.map(s => `• ${s}`).join('\n') || '• None identified'}

---

## ${bike2Name}

### Strengths in this area:
${relevantInsights.bike2.strengths.map(s => `• ${s.category} (${s.frequency} mentions)
  "${s.quote}"`).join('\n') || '• No specific strengths found - use general performance data'}

### Weaknesses in this area:
${relevantInsights.bike2.weaknesses.map(w => `• ${w.category} (${w.frequency} mentions)
  "${w.quote}"`).join('\n') || '• No specific weaknesses found'}

### Surprising findings:
${relevantInsights.bike2.surprising.map(s => `• ${s}`).join('\n') || '• None identified'}
</comprehensive_insights>

${tensionPoint ? `<tension_point>
${bike1Name}: ${tensionPoint.bike1_wins}
${bike2Name}: ${tensionPoint.bike2_wins}
</tension_point>` : ''}

<relevant_personas>
${relevantPersonas.map(p => `• ${p.name}: "${p.priority}" | Usage: ${p.usage}`).join('\n') || 'All personas have some interest in this area'}
</relevant_personas>

<quotes_to_use>
${allocatedQuotes.length > 0 ? allocatedQuotes.map((q, i) => `${i + 1}. ${q}`).join('\n') : 'Use quotes from the insights above naturally'}
</quotes_to_use>

<writing_rules>
1. **NO SPEC DUMPS**: Translate specs to experiences
   ❌ "43 bhp, 37 Nm torque, 6-speed gearbox"
   ✅ "Pin the throttle in third at 4000rpm and the front wheel lightens—not wheelie-happy, but enough to grin"

2. **SCENARIO GROUNDING**: Every claim needs a real-world moment
   ❌ "Better suspension"
   ✅ "On Bangalore's Silk Board—where kidneys normally file for divorce—the adjustable forks let you dial out pain"

3. **BALANCED COVERAGE**: Both bikes MUST get fair treatment
   - Cover strengths AND weaknesses for BOTH bikes
   - Don't bury one bike's advantages
   - Show when EACH bike wins

4. **OWNER VOICES**: Use quotes naturally, not as block quotes
   ✅ "As one YouTube reviewer put it: 'The engine is butter smooth at 5000rpm—I can cruise all day at 90'"

5. **PERSONA TIE-INS**: Reference which persona cares about this
   ✅ "For Rahul—the weekender who needs highway comfort—this is a 70/30 win for the Apache"

6. **HOLISTIC VIEW**: Consider multiple aspects, not just the obvious
   - Primary metric (e.g., power for "Engine Character")
   - Secondary factors (refinement, heat, sound)
   - Long-term implications (reliability, maintenance)
</writing_rules>

<structure>
1. **Opening** (1-2 sentences): Central trade-off in this dimension
2. **${bike1Name} Reality** (2-3 paragraphs):
   - What it does well with scenario
   - Where it falls short
   - Owner quote
3. **${bike2Name} Reality** (2-3 paragraphs):
   - What it does well with scenario
   - Where it falls short
   - Owner quote
4. **Verdict for this dimension** (1 paragraph):
   - Who wins
   - When they win
   - For which persona
</structure>

<word_count>350-450 words for this section</word_count>

<anti_patterns>
❌ "Both bikes perform well in this category"
❌ "The [bike] has good [feature]"
❌ Only mentioning positives for one bike

✅ "The Duke wins on pure rush, but the Apache wins on not cooking your thighs in Indiranagar traffic"
✅ Specific scenarios: "On the NH48 stretch past Nelamangala, at 100kmph cruise..."
✅ Clear verdict: "For 80% highway, 20% city: Duke. Flip those numbers: Apache."
</anti_patterns>

Write the section now:`;
}

/**
 * Get insights relevant to focus area using smart matching
 */
function getRelevantInsightsForArea(
  focusArea: string,
  insights: InsightExtractionResult
): {
  bike1: { strengths: any[]; weaknesses: any[]; surprising: string[] };
  bike2: { strengths: any[]; weaknesses: any[]; surprising: string[] };
} {
  // Build keyword set from focus area
  const keywords = buildKeywordSet(focusArea);
  
  const filterByRelevance = (items: any[], isPositive: boolean) => {
    const relevant = items.filter(item => {
      const category = item.category.toLowerCase();
      return keywords.some(kw => category.includes(kw)) ||
        // Also check quotes for relevance
        (item.quotes || []).some((q: any) => 
          keywords.some(kw => q.text.toLowerCase().includes(kw))
        );
    });
    
    // If no direct matches, include top items by frequency for balance
    if (relevant.length === 0 && items.length > 0) {
      return items.slice(0, 2).map(item => ({
        category: item.category,
        frequency: item.frequency,
        quote: item.quotes?.[0]?.text || 'Owner feedback available',
      }));
    }
    
    return relevant.slice(0, 4).map(item => ({
      category: item.category,
      frequency: item.frequency,
      quote: item.quotes?.[0]?.text || 'Owner feedback available',
    }));
  };
  
  const filterSurprising = (surprises: string[]) => {
    return (surprises || []).filter(s => 
      keywords.some(kw => s.toLowerCase().includes(kw))
    ).slice(0, 2);
  };

  return {
    bike1: {
      strengths: filterByRelevance(insights.bike1?.praises || [], true),
      weaknesses: filterByRelevance(insights.bike1?.complaints || [], false),
      surprising: filterSurprising(insights.bike1?.surprising_insights || []),
    },
    bike2: {
      strengths: filterByRelevance(insights.bike2?.praises || [], true),
      weaknesses: filterByRelevance(insights.bike2?.complaints || [], false),
      surprising: filterSurprising(insights.bike2?.surprising_insights || []),
    },
  };
}

/**
 * Build comprehensive keyword set for focus area
 */
function buildKeywordSet(focusArea: string): string[] {
  const baseKeywords = focusArea.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  // Add synonyms and related terms
  const synonymMap: Record<string, string[]> = {
    engine: ['power', 'torque', 'rpm', 'performance', 'acceleration', 'speed', 'vib', 'refine', 'smooth'],
    comfort: ['seat', 'ergonomic', 'ride', 'position', 'fatigue', 'pillion', 'back', 'wind', 'heat'],
    handling: ['corner', 'turn', 'agile', 'stable', 'weight', 'balance', 'maneuver', 'traffic'],
    value: ['price', 'cost', 'money', 'worth', 'afford', 'emi', 'budget', 'resale'],
    ownership: ['service', 'maintain', 'dealer', 'spare', 'reliable', 'problem', 'issue', 'warranty'],
    build: ['quality', 'finish', 'paint', 'plastic', 'metal', 'premium', 'look', 'fit'],
    fuel: ['mileage', 'economy', 'petrol', 'efficient', 'kmpl', 'tank', 'range'],
    brakes: ['stop', 'abs', 'disc', 'brake', 'confidence', 'safety'],
    suspension: ['bump', 'pothole', 'road', 'absorb', 'stiff', 'soft', 'adjust'],
  };
  
  const expandedKeywords = new Set(baseKeywords);
  
  for (const keyword of baseKeywords) {
    for (const [key, synonyms] of Object.entries(synonymMap)) {
      if (keyword.includes(key) || key.includes(keyword)) {
        synonyms.forEach(s => expandedKeywords.add(s));
      }
    }
  }
  
  return Array.from(expandedKeywords);
}

/**
 * Get personas who care about this focus area
 */
function getPersonasForArea(
  focusArea: string,
  personas: PersonaGenerationResult
): Array<{ name: string; priority: string; usage: string }> {
  const keywords = buildKeywordSet(focusArea);
  const personasArray = personas?.personas || [];
  
  return personasArray
    .filter(p => {
      const priorities = (p.priorities || []).join(' ').toLowerCase();
      const painPoints = (p.painPoints || []).join(' ').toLowerCase();
      return keywords.some(kw => priorities.includes(kw) || painPoints.includes(kw));
    })
    .map(p => ({
      name: p.name,
      priority: (p.priorities || []).find(pri => 
        keywords.some(kw => pri.toLowerCase().includes(kw))
      ) || p.priorities?.[0] || 'General interest',
      usage: `${p.usagePattern?.cityCommute || 0}% city, ${p.usagePattern?.highway || 0}% highway`,
    }))
    .slice(0, 3);
}
