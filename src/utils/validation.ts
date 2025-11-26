import type { InsightExtractionResult, BikeInsights } from "@/lib/types";

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

