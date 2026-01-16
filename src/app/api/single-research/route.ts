/**
 * API Route: /api/single-research
 * 
 * GET  - List all single vehicle research entries
 * POST - Create a new single vehicle research
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { SingleVehicleResearchInsert } from '@/lib/supabase/types';

// GET /api/single-research - List all entries
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build query - select only summary fields for list view
    let query = supabase
      .from('single_vehicle_research')
      .select('id, vehicle_name, display_name, current_step, completed_steps, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Filter by status if provided
    if (status && ['draft', 'scraping', 'corpus_ready', 'generating', 'completed', 'archived'].includes(status)) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching single vehicle research:', error);
      return NextResponse.json(
        { error: 'Failed to fetch single vehicle research', details: error.message },
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
    console.error('Unexpected error in GET /api/single-research:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/single-research - Create new entry
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const body: SingleVehicleResearchInsert = await request.json();
    
    // Validate required fields
    if (!body.vehicle_name) {
      return NextResponse.json(
        { error: 'vehicle_name is required' },
        { status: 400 }
      );
    }
    
    // Insert new research entry
    const { data, error } = await (supabase as any)
      .from('single_vehicle_research')
      .insert({
        vehicle_name: body.vehicle_name,
        research_sources: body.research_sources || [],
        current_step: body.current_step || 1,
        completed_steps: body.completed_steps || [],
        corpus: body.corpus || null,
        generated_content: body.generated_content || null,
        status: body.status || 'draft',
      })
      .select('id, display_name, created_at')
      .single();
    
    if (error) {
      console.error('Error creating single vehicle research:', error);
      return NextResponse.json(
        { error: 'Failed to create single vehicle research', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      id: data.id,
      display_name: data.display_name,
      created_at: data.created_at,
      message: 'Single vehicle research created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/single-research:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
