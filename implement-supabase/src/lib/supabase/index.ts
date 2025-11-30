/**
 * Supabase Utilities Export
 */

export { createClient, getSupabaseClient } from './client';
export { createServerSupabaseClient } from './server';
export type {
  Database,
  Comparison,
  ComparisonInsert,
  ComparisonUpdate,
  ComparisonSummary,
  ComparisonStatus,
  ScrapedData,
} from './types';
