/**
 * API Route: /api/share/create
 * 
 * POST - Generate a share token for a single vehicle research
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

interface CreateShareRequest {
  researchId: string;
}

/**
 * Generate a unique, URL-safe share token
 */
function generateShareToken(): string {
  // Generate 9 random bytes and encode as base64url
  // This gives us 12 URL-safe characters
  return randomBytes(9)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// POST /api/share/create - Generate share token
export async function POST(request: NextRequest) {
  try {
    const body: CreateShareRequest = await request.json();
    
    if (!body.researchId) {
      return NextResponse.json(
        { error: 'Research ID is required' },
        { status: 400 }
      );
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.researchId)) {
      return NextResponse.json(
        { error: 'Invalid research ID format' },
        { status: 400 }
      );
    }
    
    const supabase = createServerSupabaseClient();
    
    // First, check if research exists and has generated content
    const { data: existing, error: fetchError } = await supabase
      .from('single_vehicle_research')
      .select('id, share_token, generated_content, vehicle_name')
      .eq('id', body.researchId)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Research not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching research:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch research', details: fetchError.message },
        { status: 500 }
      );
    }
    
    // Check if content has been generated
    if (!existing.generated_content) {
      return NextResponse.json(
        { error: 'Cannot share research without generated content' },
        { status: 400 }
      );
    }
    
    // If share token already exists, return it
    if (existing.share_token) {
      const shareUrl = `${getBaseUrl(request)}/share/${existing.share_token}`;
      return NextResponse.json({
        success: true,
        shareToken: existing.share_token,
        shareUrl,
        vehicleName: existing.vehicle_name,
        isExisting: true
      });
    }
    
    // Generate new share token
    const shareToken = generateShareToken();
    
    // Update the research with the new share token
    const { error: updateError } = await supabase
      .from('single_vehicle_research')
      .update({ share_token: shareToken })
      .eq('id', body.researchId);
    
    if (updateError) {
      console.error('Error updating share token:', updateError);
      return NextResponse.json(
        { error: 'Failed to generate share link', details: updateError.message },
        { status: 500 }
      );
    }
    
    const shareUrl = `${getBaseUrl(request)}/share/${shareToken}`;
    
    return NextResponse.json({
      success: true,
      shareToken,
      shareUrl,
      vehicleName: existing.vehicle_name,
      isExisting: false
    });
    
  } catch (error) {
    console.error('Unexpected error in POST /api/share/create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get the base URL for constructing share links
 */
function getBaseUrl(request: NextRequest): string {
  // Try to get from headers first (works in production)
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  
  if (host) {
    return `${protocol}://${host}`;
  }
  
  // Fallback to environment variable or localhost
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}
