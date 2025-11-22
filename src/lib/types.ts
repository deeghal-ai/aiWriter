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

export interface Persona {
  id: string;
  title: string;
  percentage: number;
  pattern: {
    cityCommute: number;
    highway: number;
    leisure: number;
    offroad: number;
  };
  demographics: {
    ageRange: string;
    location: string;
    occupation: string;
  };
  priorities: string[];
  quote: string;
  sampleSize: number;
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

