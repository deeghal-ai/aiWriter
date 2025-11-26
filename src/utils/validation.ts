import type { InsightExtractionResult, BikeInsights, PersonaGenerationResult, Persona } from "@/lib/types";

/**
 * Validate insight extraction results
 */
export function validateInsights(insights: InsightExtractionResult): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate bike1
  const bike1Errors = validateBikeInsights(insights.bike1, "bike1");
  errors.push(...bike1Errors);
  
  // Validate bike2
  const bike2Errors = validateBikeInsights(insights.bike2, "bike2");
  errors.push(...bike2Errors);
  
  // Validate metadata
  if (!insights.metadata) {
    errors.push("Missing metadata");
  } else {
    if (insights.metadata.total_praises < 0) {
      errors.push("Invalid total_praises count");
    }
    if (insights.metadata.total_complaints < 0) {
      errors.push("Invalid total_complaints count");
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

function validateBikeInsights(bike: BikeInsights, bikeName: string): string[] {
  const errors: string[] = [];
  
  // Check required fields
  if (!bike.name) {
    errors.push(`${bikeName}: Missing bike name`);
  }
  
  if (!Array.isArray(bike.praises)) {
    errors.push(`${bikeName}: Praises must be an array`);
  }
  
  if (!Array.isArray(bike.complaints)) {
    errors.push(`${bikeName}: Complaints must be an array`);
  }
  
  if (!Array.isArray(bike.surprising_insights)) {
    errors.push(`${bikeName}: Surprising insights must be an array`);
  }
  
  // Validate praises
  bike.praises?.forEach((praise, idx) => {
    if (!praise.category) {
      errors.push(`${bikeName}: Praise ${idx} missing category`);
    }
    if (typeof praise.frequency !== "number" || praise.frequency < 0) {
      errors.push(`${bikeName}: Praise ${idx} has invalid frequency`);
    }
    if (!Array.isArray(praise.quotes)) {
      errors.push(`${bikeName}: Praise ${idx} quotes must be an array`);
    }
    
    // Validate quotes
    praise.quotes?.forEach((quote, qIdx) => {
      if (!quote.text || quote.text.length === 0) {
        errors.push(`${bikeName}: Praise ${idx} quote ${qIdx} missing text`);
      }
      if (!quote.author) {
        errors.push(`${bikeName}: Praise ${idx} quote ${qIdx} missing author`);
      }
      if (!quote.source) {
        errors.push(`${bikeName}: Praise ${idx} quote ${qIdx} missing source`);
      }
    });
  });
  
  // Validate complaints (same structure as praises)
  bike.complaints?.forEach((complaint, idx) => {
    if (!complaint.category) {
      errors.push(`${bikeName}: Complaint ${idx} missing category`);
    }
    if (typeof complaint.frequency !== "number" || complaint.frequency < 0) {
      errors.push(`${bikeName}: Complaint ${idx} has invalid frequency`);
    }
  });
  
  return errors;
}

/**
 * Check if insights are reasonable (heuristic quality check)
 */
export function checkInsightQuality(insights: InsightExtractionResult): {
  quality: "good" | "acceptable" | "poor";
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Check praise counts
  const bike1Praises = insights.bike1.praises.length;
  const bike2Praises = insights.bike2.praises.length;
  
  if (bike1Praises === 0 || bike2Praises === 0) {
    warnings.push("One or both bikes have no praises extracted");
  }
  
  if (bike1Praises < 3 || bike2Praises < 3) {
    warnings.push("Low praise count (expected 3-7 per bike)");
  }
  
  // Check frequency ranges
  const allFrequencies = [
    ...insights.bike1.praises.map(p => p.frequency),
    ...insights.bike1.complaints.map(c => c.frequency),
    ...insights.bike2.praises.map(p => p.frequency),
    ...insights.bike2.complaints.map(c => c.frequency)
  ];
  
  const maxFreq = Math.max(...allFrequencies);
  if (maxFreq > 50) {
    warnings.push("Unusually high frequency counts detected (may indicate counting error)");
  }
  
  // Check quote availability
  const totalQuotes = insights.metadata.total_quotes;
  if (totalQuotes < 10) {
    warnings.push("Very few quotes extracted (expected 20-40 total)");
  }
  
  // Determine quality
  let quality: "good" | "acceptable" | "poor";
  if (warnings.length === 0) {
    quality = "good";
  } else if (warnings.length <= 2) {
    quality = "acceptable";
  } else {
    quality = "poor";
  }
  
  return { quality, warnings };
}

/**
 * Validate persona generation results
 */
export function validatePersonas(result: PersonaGenerationResult): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check personas array exists
  if (!result.personas || !Array.isArray(result.personas)) {
    errors.push("Missing personas array");
    return { valid: false, errors };
  }
  
  // Check count
  if (result.personas.length < 3 || result.personas.length > 4) {
    errors.push(`Expected 3-4 personas, got ${result.personas.length}`);
  }
  
  // Validate each persona
  result.personas.forEach((persona, index) => {
    const prefix = `Persona ${index + 1}`;
    
    // Required fields
    if (!persona.name) errors.push(`${prefix}: Missing name`);
    if (!persona.title) errors.push(`${prefix}: Missing title`);
    if (typeof persona.percentage !== 'number') errors.push(`${prefix}: Missing percentage`);
    
    // Usage pattern must sum to 100
    if (persona.usagePattern) {
      const sum = 
        (persona.usagePattern.cityCommute || 0) +
        (persona.usagePattern.highway || 0) +
        (persona.usagePattern.urbanLeisure || 0) +
        (persona.usagePattern.offroad || 0);
      
      if (sum !== 100) {
        errors.push(`${prefix}: Usage pattern sums to ${sum}, expected 100`);
      }
    } else {
      errors.push(`${prefix}: Missing usagePattern`);
    }
    
    // Evidence quotes required
    if (!persona.evidenceQuotes || persona.evidenceQuotes.length < 2) {
      errors.push(`${prefix}: Needs at least 2 evidence quotes`);
    }
    
    // Archetype quote required
    if (!persona.archetypeQuote) {
      errors.push(`${prefix}: Missing archetypeQuote`);
    }
  });
  
  // Check percentage sum (should be 85-100%)
  const totalPercentage = result.personas.reduce((sum, p) => sum + (p.percentage || 0), 0);
  if (totalPercentage < 70 || totalPercentage > 100) {
    errors.push(`Total percentage is ${totalPercentage}%, expected 85-100%`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check persona quality (heuristic checks)
 */
export function checkPersonaQuality(result: PersonaGenerationResult): {
  quality: "excellent" | "good" | "poor";
  warnings: string[];
} {
  const warnings: string[] = [];
  
  result.personas.forEach((persona, index) => {
    const prefix = `Persona ${index + 1}`;
    
    // Check for generic titles
    const genericTitles = [
      "The Commuter", "The Enthusiast", "The Professional",
      "The Value Buyer", "The Performance Seeker", "The City Rider"
    ];
    if (genericTitles.some(g => persona.title?.toLowerCase().includes(g.toLowerCase()))) {
      warnings.push(`${prefix}: Title "${persona.title}" seems generic`);
    }
    
    // Check archetype quote length
    if (persona.archetypeQuote) {
      const words = persona.archetypeQuote.split(' ').length;
      if (words < 10 || words > 30) {
        warnings.push(`${prefix}: Archetype quote should be 15-25 words, got ${words}`);
      }
    }
    
    // Check priorities specificity
    const genericPriorities = ["performance", "value", "quality", "comfort"];
    if (persona.priorities?.some(p => genericPriorities.includes(p.toLowerCase()))) {
      warnings.push(`${prefix}: Some priorities are too generic`);
    }
    
    // Check for Indian context
    const indianIndicators = ["₹", "km", "India", "Bangalore", "Mumbai", "Delhi", "pillion"];
    const hasIndianContext = [
      persona.demographics?.cityType,
      persona.demographics?.incomeIndicator,
      ...persona.painPoints || [],
      persona.archetypeQuote
    ].some(text => text && indianIndicators.some(ind => text.includes(ind)));
    
    if (!hasIndianContext) {
      warnings.push(`${prefix}: May lack Indian context`);
    }
  });
  
  // Determine overall quality
  let quality: "excellent" | "good" | "poor";
  if (warnings.length === 0) {
    quality = "excellent";
  } else if (warnings.length <= 3) {
    quality = "good";
  } else {
    quality = "poor";
  }
  
  return { quality, warnings };
}

