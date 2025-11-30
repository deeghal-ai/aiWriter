/**
 * API Route: /api/comparisons
 * 
 * GET  - List all comparisons (with optional filters)
 * POST - Create a new comparison
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ComparisonInsert } from '@/lib/supabase/types';

// GET /api/comparisons - List all comparisons
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build query - select only summary fields for list view
    let query = supabase
      .from('comparisons')
      .select('id, bike1_name, bike2_name, display_name, current_step, completed_steps, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Filter by status if provided
    if (status && ['draft', 'in_progress', 'completed', 'archived'].includes(status)) {
      query = query.eq('status', status);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching comparisons:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comparisons', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data: data || [],
      count: data?.length || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/comparisons:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/comparisons - Create new comparison
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const body: ComparisonInsert = await request.json();
    
    // Validate required fields
    if (!body.bike1_name || !body.bike2_name) {
      return NextResponse.json(
        { error: 'bike1_name and bike2_name are required' },
        { status: 400 }
      );
    }
    
    // Create display_name if not provided
    const displayName = body.display_name || `${body.bike1_name} vs ${body.bike2_name}`;
    
    // Insert new comparison
    const { data, error } = await supabase
      .from('comparisons')
      .insert({
        bike1_name: body.bike1_name,
        bike2_name: body.bike2_name,
        comparison_type: body.comparison_type || 'comparison',
        current_step: body.current_step || 1,
        completed_steps: body.completed_steps || [],
        scraped_data: body.scraped_data || {},
        insights: body.insights || null,
        personas: body.personas || null,
        verdicts: body.verdicts || null,
        narrative_plan: body.narrative_plan || null,
        article_sections: body.article_sections || [],
        article_word_count: body.article_word_count || 0,
        quality_report: body.quality_report || null,
        quality_checks: body.quality_checks || [],
        final_article: body.final_article || '',
        status: body.status || 'draft',
        display_name: displayName,
      })
      .select('id, display_name, created_at')
      .single();
    
    if (error) {
      console.error('Error creating comparison:', error);
      return NextResponse.json(
        { error: 'Failed to create comparison', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      id: data.id,
      display_name: data.display_name,
      created_at: data.created_at,
      message: 'Comparison created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/comparisons:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
