/**
 * Supabase Database Types
 * 
 * These types match the schema in your Supabase database.
 * Based on the comparisons table structure.
 */

// Import your existing types (adjust path as needed)
import type {
  InsightExtractionResult,
  PersonaGenerationResult,
  VerdictGenerationResult,
  NarrativePlan,
  ArticleSection,
  QualityReport,
  QualityCheck,
} from '../types';

// Scraped data structure
export interface ScrapedData {
  reddit?: {
    bike1?: any;
    bike2?: any;
  };
  xbhp?: {
    bike1?: any;
    bike2?: any;
  };
  youtube?: {
    bike1?: any;
    bike2?: any;
  };
}

// Comparison status enum
export type ComparisonStatus = 'draft' | 'in_progress' | 'completed' | 'archived';

// Main Comparison type matching database schema
export interface Comparison {
  id: string;
  bike1_name: string;
  bike2_name: string;
  comparison_type: string | null;
  current_step: number | null;
  completed_steps: number[] | null;
  scraped_data: ScrapedData | null;
  insights: InsightExtractionResult | null;
  personas: PersonaGenerationResult | null;
  verdicts: VerdictGenerationResult | null;
  narrative_plan: NarrativePlan | null;
  article_sections: ArticleSection[] | null;
  article_word_count: number | null;
  quality_report: QualityReport | null;
  quality_checks: QualityCheck[] | null;
  final_article: string | null;
  status: ComparisonStatus | null;
  created_at: string | null;
  updated_at: string | null;
  display_name: string | null;
}

// Type for creating a new comparison (id and timestamps are auto-generated)
export interface ComparisonInsert {
  bike1_name: string;
  bike2_name: string;
  comparison_type?: string;
  current_step?: number;
  completed_steps?: number[];
  scraped_data?: ScrapedData;
  insights?: InsightExtractionResult | null;
  personas?: PersonaGenerationResult | null;
  verdicts?: VerdictGenerationResult | null;
  narrative_plan?: NarrativePlan | null;
  article_sections?: ArticleSection[];
  article_word_count?: number;
  quality_report?: QualityReport | null;
  quality_checks?: QualityCheck[];
  final_article?: string;
  status?: ComparisonStatus;
  display_name?: string;
}

// Type for updating a comparison (all fields optional)
export interface ComparisonUpdate {
  bike1_name?: string;
  bike2_name?: string;
  comparison_type?: string;
  current_step?: number;
  completed_steps?: number[];
  scraped_data?: ScrapedData;
  insights?: InsightExtractionResult | null;
  personas?: PersonaGenerationResult | null;
  verdicts?: VerdictGenerationResult | null;
  narrative_plan?: NarrativePlan | null;
  article_sections?: ArticleSection[];
  article_word_count?: number;
  quality_report?: QualityReport | null;
  quality_checks?: QualityCheck[];
  final_article?: string;
  status?: ComparisonStatus;
  display_name?: string;
}

// Summary type for list view (lighter weight)
export interface ComparisonSummary {
  id: string;
  bike1_name: string;
  bike2_name: string;
  display_name: string | null;
  current_step: number | null;
  completed_steps: number[] | null;
  status: ComparisonStatus | null;
  created_at: string | null;
  updated_at: string | null;
}

// Database type definition for Supabase client
export interface Database {
  public: {
    Tables: {
      comparisons: {
        Row: Comparison;
        Insert: ComparisonInsert;
        Update: ComparisonUpdate;
      };
      scraping_progress: {
        Row: {
          id: string;
          comparison_id: string;
          source: string;
          bike: string;
          status: string;
          progress: number;
          message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          comparison_id: string;
          source: string;
          bike: string;
          status?: string;
          progress?: number;
          message?: string;
        };
        Update: {
          status?: string;
          progress?: number;
          message?: string;
        };
      };
    };
  };
}
