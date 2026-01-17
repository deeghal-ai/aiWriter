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
    internal: boolean;  // BikeDekho internal reviews & expert insights
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

  // Enhanced context fields for later stages (not displayed in Extract UI)
  // These provide richer prose context for Persona, Verdict, and Article generation
  contextual_summary?: {
    // Prose summary of what reviewers/owners are saying (weighted: transcripts > comments)
    reviewer_consensus: string;      // What do professional reviewers agree on?
    owner_consensus: string;         // What do actual owners agree on?
    key_controversies: string;       // What do they disagree about?
  };

  // Specific real-world observations (from transcripts with higher authority)
  real_world_observations?: {
    daily_use: string[];            // "In Bangalore traffic, the clutch is too heavy"
    long_distance: string[];        // "On NH44, the wind buffeting becomes tiring after 100km"
    pillion_experience: string[];   // "My wife finds the seat narrow"
    ownership_quirks: string[];     // "The chain needs lubrication every 500km"
  };

  // Usage patterns detected from discussions
  usage_patterns?: {
    primary_use_case: string;       // "Mostly city commute with occasional highway"
    typical_daily_distance: string; // "20-30km daily"
    common_modifications: string[]; // "Many owners add crash guards and tank pads"
  };

  // Comparison-specific context (when compared against the other bike)
  comparison_context?: {
    wins_against_competitor: string[];   // "Clearly better mileage than [other bike]"
    loses_against_competitor: string[];  // "Service cost higher than [other bike]"
    subjective_preferences: string[];    // "Some prefer RE's thump, others find it tiring"
  };
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

// ============================================
// SINGLE VEHICLE RESEARCH TYPES
// ============================================

/**
 * Input configuration for single vehicle research
 */
export interface SingleVehicleResearch {
  vehicle: string;
  researchSources: {
    youtube: boolean;
    reddit: boolean;
    internal: boolean;
    webSearch: boolean;
  };
}

/**
 * YouTube video data for single vehicle
 */
export interface SingleVehicleYouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: string;
  transcript?: string | null;
  transcriptKeyMoments?: Array<{ topic: string; text: string }>;
  comments: Array<{
    author: string;
    text: string;
    likeCount: number;
    publishedAt: string;
  }>;
}

/**
 * Reddit post data for single vehicle
 */
export interface SingleVehicleRedditPost {
  title: string;
  url: string;
  selftext: string;
  author: string;
  created_utc: number;
  num_comments: number;
  score: number;
  permalink: string;
  comments: Array<{
    author: string;
    body: string;
    score: number;
    created_utc: number;
  }>;
}

/**
 * Internal review data for single vehicle
 */
export interface SingleVehicleInternalReview {
  id: string;
  author: {
    name: string;
    isVerifiedOwner: boolean;
    ownershipDuration?: string;
    kmsDriven?: number;
  };
  title: string;
  content: string;
  rating?: number;
  pros?: string[];
  cons?: string[];
  helpfulVotes?: number;
  createdAt: string;
}

/**
 * Expert insight for single vehicle
 */
export interface SingleVehicleExpertInsight {
  category: string;
  insight: string;
  author: string;
  isPositive: boolean;
}

/**
 * Web search result for a single query
 */
export interface WebSearchResult {
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    source: string;
  }>;
  searchedAt: string;
}

/**
 * Complete web search data for a single vehicle
 */
export interface SingleVehicleWebData {
  specs: WebSearchResult;
  variants: WebSearchResult;
  pricing: WebSearchResult;
  lifecycle: WebSearchResult;
  salesData: WebSearchResult;
  competitors: WebSearchResult;
}

/**
 * Complete corpus of scraped data for a single vehicle
 */
export interface SingleVehicleCorpus {
  youtube?: {
    vehicle: string;
    videos: SingleVehicleYouTubeVideo[];
    total_videos: number;
    total_comments: number;
  };
  reddit?: {
    vehicle: string;
    posts: SingleVehicleRedditPost[];
    metadata: {
      scraped_at: string;
      source: string;
      subreddit: string;
      total_posts: number;
      total_comments: number;
    };
  };
  internal?: {
    vehicle: string;
    reviews: SingleVehicleInternalReview[];
    expertInsights?: SingleVehicleExpertInsight[];
    metadata: {
      source: string;
      fetchedAt: string;
      totalReviews: number;
      isMockData: boolean;
    };
  };
  webSearch?: SingleVehicleWebData;
  metadata: {
    vehicle: string;
    scrapedAt: string;
    totalPosts: number;
    totalComments: number;
    sourcesUsed: string[];
    validation?: {
      isValid: boolean;
      confidence: number;
      warnings: string[];
      modelName: string;
      videosWithTarget: number;
      totalVideos: number;
      unexpectedVehicles: Array<{ name: string; mentionCount: number }>;
    };
  };
}

/**
 * Single vehicle scraping progress
 */
export interface SingleVehicleScrapingProgress {
  source: string;
  status: 'pending' | 'in-progress' | 'complete' | 'error';
  message?: string;
  stats?: {
    posts?: number;
    comments?: number;
    videos?: number;
    reviews?: number;
    searches?: number;
  };
}

/**
 * Single vehicle workflow state
 */
export interface SingleVehicleState {
  vehicle: SingleVehicleResearch | null;
  currentStep: number;
  completedSteps: number[];
  scrapingProgress: SingleVehicleScrapingProgress[];
  corpus: SingleVehicleCorpus | null;
}

// ============================================
// SINGLE VEHICLE PAGE CONTENT TYPES
// ============================================

/**
 * Vehicle basic information
 */
export interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  segment: string;
}

/**
 * Price range with optional placeholder marker
 */
export interface PriceRange {
  min: string;
  max: string;
  minValue?: number;
  maxValue?: number;
  priceType?: string;
  _placeholder?: boolean;
  _source?: string;
}

/**
 * Ideal buyer segment
 */
export interface IdealForSegment {
  label: string;
  icon: string;
}

/**
 * Quick decision verdict
 */
export interface QuickDecisionVerdict {
  headline: string;
  summary: string;
  highlightType: 'positive' | 'negative' | 'neutral';
}

/**
 * Quick decision section - helps buyers make fast decisions
 */
export interface QuickDecisionSection {
  priceRange: PriceRange;
  idealFor: IdealForSegment[];
  verdict: QuickDecisionVerdict;
  perfectIf: string;
  skipIf: string;
  keyAdvantage: string;
}

/**
 * Cost breakdown components
 */
export interface CostBreakdown {
  exShowroom: number;
  rto: number;
  insurance: number;
  accessories: number;
  _placeholder?: boolean;
}

/**
 * Monthly burn item
 */
export interface MonthlyBurnItem {
  amount: string;
  value: number;
  [key: string]: any; // Allow additional properties like loanAmount, tenure, etc.
}

/**
 * How much it really costs section
 */
export interface HowMuchItReallyCostsSection {
  location: string;
  locationDefault: boolean;
  selectedVariant: string;
  realOnRoadPrice: {
    amount: string;
    value: number;
    breakdown: CostBreakdown;
  };
  monthlyBurn: {
    emi: MonthlyBurnItem;
    fuel: MonthlyBurnItem;
    service: MonthlyBurnItem;
  };
  totalMonthly: {
    amount: string;
    value: number;
  };
  savingsNote?: {
    text: string;
    comparisonBasis: string;
  };
  ctaLink?: {
    text: string;
    url: string;
  };
  _placeholder?: boolean;
}

/**
 * Fuel type option
 */
export interface FuelTypeOption {
  label: string;
  value: string;
  isDefault?: boolean;
  variants: string[];
}

/**
 * Transmission option
 */
export interface TransmissionOption {
  label: string;
  value: string;
  availableWith: string[];
}

/**
 * Engine type option
 */
export interface EngineTypeOption {
  label: string;
  value: string;
  power: string;
  torque: string;
  fuelType: string;
}

/**
 * Wheel type option
 */
export interface WheelTypeOption {
  label: string;
  value: string;
  availableOn: string[];
}

/**
 * Hero feature
 */
export interface HeroFeature {
  label: string;
  icon: string;
  availableFrom: string;
}

/**
 * Variant options section
 */
export interface VariantOptionsSection {
  fuelType: FuelTypeOption[];
  transmission: TransmissionOption[];
  engineType: EngineTypeOption[];
  wheelTypes?: WheelTypeOption[];
  heroFeatures: HeroFeature[];
  cta?: {
    text: string;
    url: string;
  };
  _placeholder?: boolean;
}

/**
 * Segment category ranking
 */
export interface SegmentCategory {
  name: string;
  rank: string;
  rankNumber: number;
  totalInSegment: number;
  status: string;
  statusType: 'positive' | 'negative' | 'neutral';
  highlights: string[];
}

/**
 * Segment scorecard section
 */
export interface SegmentScorecardSection {
  leadingCount: number;
  badge: string;
  categories: SegmentCategory[];
  summary: string;
}

/**
 * Main competitor
 */
export interface MainCompetitor {
  name: string;
  tag: string;
  tagType: 'primary' | 'secondary' | 'neutral';
  priceRange: string;
  imageUrl?: string;
  keyDifferentiator: string;
}

/**
 * Stock availability by color
 */
export interface StockAvailability {
  color: string;
  colorCode: string;
  waitingPeriod: string;
}

/**
 * Good time to buy section
 */
export interface GoodTimeToBuySection {
  overallSignal: string;
  overallSignalType: 'positive' | 'negative' | 'neutral';
  salesRank: {
    label: string;
    value: string;
    description: string;
  };
  lifecycleCheck: {
    label: string;
    status: string;
    statusType: 'positive' | 'negative' | 'neutral';
    faceliftExpected: string;
    generationYear: number;
  };
  timingSignal: {
    label: string;
    status: string;
    statusType: 'positive' | 'negative' | 'neutral';
    reason: string;
  };
  stockAvailability: StockAvailability[];
  _placeholder?: boolean;
}

/**
 * Praised or criticized item
 */
export interface OwnerSentimentItem {
  text: string;
  category: string;
}

/**
 * Owner pulse section - aggregated owner sentiment
 */
export interface OwnerPulseSection {
  rating: number;
  totalReviews: number;
  mostPraised: OwnerSentimentItem[];
  mostCriticized: OwnerSentimentItem[];
}

/**
 * Data source metadata
 */
export interface DataSourceMetadata {
  corpus: string;
  totalVideos: number;
  totalComments: number;
  sources: string[];
  extractedAt: string;
  lastUpdated: string;
}

/**
 * Complete page content structure for a single vehicle
 */
export interface SingleVehiclePageContent {
  vehicle: VehicleInfo;
  quickDecision: QuickDecisionSection;
  howMuchItReallyCosts: HowMuchItReallyCostsSection;
  variantOptions: VariantOptionsSection;
  segmentScorecard: SegmentScorecardSection;
  mainCompetitors: MainCompetitor[];
  goodTimeToBuy: GoodTimeToBuySection;
  ownerPulse: OwnerPulseSection;
  dataSource: DataSourceMetadata;
}

/**
 * Generation progress for single vehicle content
 */
export interface SingleVehicleGenerationProgress {
  step: string;
  status: 'pending' | 'in-progress' | 'complete' | 'error';
  message?: string;
  duration?: number;
}

/**
 * Single vehicle content generation result
 */
export interface SingleVehicleContentResult {
  content: SingleVehiclePageContent;
  metadata: {
    generated_at: string;
    processing_time_ms: number;
    model_used: string;
    steps_completed: number;
  };
}
