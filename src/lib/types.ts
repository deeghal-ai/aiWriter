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

// Step 5: Verdict Generation Types

export interface VerdictReason {
  point: string;              // The reasoning statement
  priority: string;           // Which persona priority this addresses
  evidence: string;           // Quote or data from insights backing this
}

export interface Verdict {
  personaId: string;          // "persona-1" — links to Persona
  personaName: string;        // "Arjun" — for easy display
  personaTitle: string;       // "The First Big Bike Upgrader" — for context
  
  // The recommendation
  recommendedBike: string;    // "KTM Duke 390" — the winner
  otherBike: string;          // "Bajaj Dominar 400" — the loser
  
  // Confidence score (50-95%)
  confidence: number;         // 78
  confidenceExplanation: string;  // "78% because Duke wins on top 3 priorities but price gap is significant"
  
  // Why this bike wins (3-5 reasons, evidence-backed)
  reasoning: VerdictReason[];
  
  // The case against (2-3 reasons when the other bike might win)
  againstReasons: string[];
  
  // Tangible impact (optional but powerful)
  tangibleImpact?: {
    metric: string;           // "Fuel savings over 3 years"
    value: string;            // "₹7,920"
    explanation: string;      // "42kmpl vs 38kmpl at 900km/month"
  };
  
  // Summary one-liner for the article
  verdictOneLiner: string;    // "For Arjun, the Duke isn't just better—it's the only choice that matches his priorities."
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

// Step 5: Verdict Generation Result Types

export interface VerdictGenerationResult {
  verdicts: Verdict[];
  metadata: {
    generated_at: string;
    total_verdicts: number;
    average_confidence: number;
    processing_time_ms: number;
  };
  summary: {
    bike1Wins: number;        // How many personas prefer bike1
    bike2Wins: number;        // How many personas prefer bike2
    closestCall: string;      // "Persona 3 was closest at 55% confidence"
  };
}

export interface VerdictGenerationResponse {
  success: boolean;
  data?: VerdictGenerationResult;
  error?: string;
  details?: string;
}

// Step 6: Article Generation Types

export interface NarrativePlan {
  story_angle: string;
  hook_strategy: 'WhatsApp Debate' | 'Unexpected Truth' | 'Specific Scenario' | 'Price Paradox';
  hook_elements: {
    scenario: string;
    tension: string;
    promise: string;
  };
  truth_bomb: string;
  quote_allocation: {
    hook: string[];
    matrix_engine: string[];
    matrix_comfort: string[];
    matrix_ownership: string[];
    verdict: string[];
  };
  tension_points: Array<{
    dimension: string;
    bike1_wins: string;
    bike2_wins: string;
  }>;
  matrix_focus_areas: string[];
  contrarian_angle: {
    target_persona: string;
    why_they_might_hate_winner: string;
  };
  closing_insight: string;
  callbacks: Array<{
    introduce_in: string;
    callback_in: string;
    element: string;
  }>;
}

export interface CoherenceEdits {
  transitions_added: Array<{
    between: string;
    transition: string;
  }>;
  callbacks_added: Array<{
    in_section: string;
    callback: string;
  }>;
  contradictions_found: Array<{
    section1: string;
    section2: string;
    issue: string;
  }>;
  word_count_suggestion: string;
}

export interface QualityReport {
  wordCount: {
    total: number;
    inRange: boolean;
  };
  bannedPhrases: {
    found: string[];
  };
  quoteCount: {
    total: number;
    hasEnough: boolean;
  };
  specificityCheck: {
    hasSpecificCities: boolean;
    hasSpecificRoads: boolean;
    hasSpecificPrices: boolean;
    hasSpecificMileage: boolean;
  };
  balanceCheck: {
    bike1Mentions: number;
    bike2Mentions: number;
    isBalanced: boolean;
  };
  personaReferences: {
    [personaName: string]: boolean;
  };
  structureCheck: {
    hasHook: boolean;
    hasVerdicts: boolean;
    hasContrarian: boolean;
  };
}

export interface ArticleGenerationResult {
  sections: ArticleSection[];
  narrativePlan: NarrativePlan;
  qualityReport?: QualityReport;
  metadata: {
    generated_at: string;
    total_words: number;
    section_count: number;
    processing_time_ms: number;
  };
}

export interface ArticleGenerationResponse {
  success: boolean;
  data?: ArticleGenerationResult;
  error?: string;
  details?: string;
}

