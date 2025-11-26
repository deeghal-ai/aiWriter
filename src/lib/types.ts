export type StepStatus = 'completed' | 'current' | 'upcoming';

export interface Step {
  id: number;
  title: string;
  description: string;
  status: StepStatus;
  component: React.ComponentType;
}

export interface BikeComparison {
  bike1: string;
  bike2: string;
  researchSources: {
    xbhp: boolean;
    teamBhp: boolean;
    reddit: boolean;
    youtube: boolean;
    instagram: boolean;
  };
}

export interface ScrapingProgress {
  source: string;
  total: number;
  completed: number;
  currentThread?: string;
  status: 'pending' | 'in-progress' | 'complete';
}

export interface Insight {
  type: 'praise' | 'complaint';
  text: string;
  frequency: number;
  quotes: Array<{
    text: string;
    author: string;
    source: string;
  }>;
}

// Enhanced Persona Interface for Step 4
export interface Persona {
  id: string;                    // "persona-1", "persona-2", etc.
  
  // Identity (specific, not generic)
  name: string;                  // "Naveen" - an actual Indian name
  title: string;                 // "The Whitefield Commuter with Weekend Highway Dreams"
  
  // Prevalence in data
  percentage: number;            // 28 (represents 28% of forum discussions match this pattern)
  sampleSize: number;            // 12 (actual count of users matching this pattern)
  
  // Usage Pattern (percentages must sum to 100)
  usagePattern: {
    cityCommute: number;         // 60
    highway: number;             // 25
    urbanLeisure: number;        // 10
    offroad: number;             // 5
  };
  
  // Demographics (specific to Indian context)
  demographics: {
    ageRange: string;            // "28-34"
    cityType: string;            // "Metro (Bangalore, Mumbai)" or "Tier-2 (Pune, Jaipur)"
    occupation: string;          // "IT Professional, Mid-level"
    incomeIndicator: string;     // "Can afford ₹2-3L bike, EMI-conscious"
    familyContext: string;       // "Married, spouse is regular pillion"
  };
  
  // Psychographics
  psychographics: {
    buyingMotivation: string;    // "Practical upgrade" or "Status symbol" or "Pure passion"
    decisionStyle: string;       // "Spec-sheet researcher" or "Emotional, test-ride driven"
    brandLoyalty: string;        // "Open to all" or "RE loyalist" or "Japanese-only"
    riskTolerance: string;       // "Conservative (proven models only)" or "Early adopter"
  };
  
  // Priorities (ordered by importance)
  priorities: string[];          // ["Pillion comfort", "Service network", "Fuel economy"]
  
  // Pain Points (specific, not generic)
  painPoints: string[];          // ["4th floor walk-up, heavy bike is a problem", "Wife complains about heat"]
  
  // Evidence from data
  evidenceQuotes: string[];      // Direct quotes from insights that support this persona
  
  // The persona's voice
  archetypeQuote: string;        // "I need it to survive Silk Board AND have something left for weekends"
  
  // For UI display
  color: string;                 // "blue" | "green" | "purple" | "orange"
}

export interface Verdict {
  personaId: string;
  recommendedBike: string;
  confidence: number;
  reasoning: string[];
  againstReasons: string[];
  evidence: string[];
}

export interface ArticleSection {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  status: 'pending' | 'generating' | 'complete';
}

export interface QualityCheck {
  category: string;
  status: 'pending' | 'checking' | 'complete';
  items: Array<{
    text: string;
    passed: boolean;
  }>;
  issues?: Array<{
    severity: 'warning' | 'error';
    message: string;
  }>;
}

// Step 3: Insight Extraction Types

export interface InsightQuote {
  text: string;
  author: string;
  source: string; // "Reddit" or "xBhp"
  url?: string;
}

export interface InsightCategory {
  category: string;
  frequency: number;
  quotes: InsightQuote[];
}

export interface BikeInsights {
  name: string;
  praises: InsightCategory[];
  complaints: InsightCategory[];
  surprising_insights: string[];
}

export interface InsightExtractionResult {
  bike1: BikeInsights;
  bike2: BikeInsights;
  metadata: {
    extracted_at: string;
    total_praises: number;
    total_complaints: number;
    total_quotes: number;
    processing_time_ms: number;
  };
}

// API Response types
export interface InsightExtractionResponse {
  success: boolean;
  data?: InsightExtractionResult;
  error?: string;
  details?: string;
}

// Step 4: Persona Generation Types

export interface PersonaGenerationResult {
  personas: Persona[];
  metadata: {
    generated_at: string;
    total_personas: number;
    total_evidence_quotes: number;
    processing_time_ms: number;
  };
}

export interface PersonaGenerationResponse {
  success: boolean;
  data?: PersonaGenerationResult;
  error?: string;
  details?: string;
}

