/**
 * API Route: /api/share/[token]
 * 
 * GET - Fetch shared content by token (public, no auth required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ token: string }>;
}

interface SharedContent {
  vehicle_name: string;
  generated_content: Record<string, unknown> | null;
  updated_at: string;
}

// GET /api/share/[token] - Fetch shared content
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { token } = await params;
    
    if (!token || token.length < 8) {
      return NextResponse.json(
        { error: 'Invalid share token' },
        { status: 400 }
      );
    }
    
    const supabase = createServerSupabaseClient();
    
    // Fetch the research by share token
    const { data, error } = await supabase
      .from('single_vehicle_research')
      .select('vehicle_name, generated_content, updated_at')
      .eq('share_token', token)
      .single() as { data: SharedContent | null; error: { code?: string; message?: string } | null };
    
    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Shared content not found or link has expired' },
          { status: 404 }
        );
      }
      console.error('Error fetching shared content:', error);
      return NextResponse.json(
        { error: 'Failed to fetch shared content' },
        { status: 500 }
      );
    }
    
    // Check if content exists
    if (!data.generated_content) {
      return NextResponse.json(
        { error: 'Content is no longer available' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      vehicleName: data.vehicle_name,
      content: data.generated_content,
      lastUpdated: data.updated_at
    });
    
  } catch (error) {
    console.error('Unexpected error in GET /api/share/[token]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
