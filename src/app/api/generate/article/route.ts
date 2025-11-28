import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  InsightExtractionResult,
  PersonaGenerationResult,
  VerdictGenerationResult,
  ArticleGenerationResponse,
  ArticleSection,
  NarrativePlan,
  CoherenceEdits,
} from '@/lib/types';
import { buildNarrativePlanningPrompt } from '@/lib/ai/article-planner';
import { buildHookPrompt } from '@/lib/ai/article-sections/hook';
import { buildTruthBombPrompt } from '@/lib/ai/article-sections/truth-bomb';
import { buildPersonasPrompt } from '@/lib/ai/article-sections/personas';
import { buildMatrixPrompt } from '@/lib/ai/article-sections/matrix';
import { buildContrarianPrompt } from '@/lib/ai/article-sections/contrarian';
import { buildVerdictsPrompt } from '@/lib/ai/article-sections/verdicts';
import { buildBottomLinePrompt } from '@/lib/ai/article-sections/bottom-line';
import { buildCoherencePrompt, applyCoherenceEdits } from '@/lib/ai/article-coherence';
import { checkArticleQuality } from '@/lib/ai/article-quality-check';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for article generation

const SONNET_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7, // Higher for creative writing
};

interface ArticleGenerationRequest {
  bike1Name: string;
  bike2Name: string;
  insights: InsightExtractionResult;
  personas: PersonaGenerationResult;
  verdicts: VerdictGenerationResult;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: ArticleGenerationRequest = await request.json();

    // Validate request
    if (!body.bike1Name || !body.bike2Name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Both bike names are required',
        } as ArticleGenerationResponse,
        { status: 400 }
      );
    }

    if (!body.insights || !body.personas || !body.verdicts) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insights, personas, and verdicts are all required',
        } as ArticleGenerationResponse,
        { status: 400 }
      );
    }

    // Validate insights structure - this is critical!
    if (!body.insights.bike1 || !body.insights.bike2) {
      console.error('[Article] Invalid insights structure:', JSON.stringify(body.insights, null, 2).substring(0, 500));
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid insights structure - missing bike1 or bike2 data',
          details: 'Please re-run extraction in Step 3.',
        } as ArticleGenerationResponse,
        { status: 400 }
      );
    }

    // Ensure required arrays exist with defaults
    if (!body.insights.bike1.praises) body.insights.bike1.praises = [];
    if (!body.insights.bike1.complaints) body.insights.bike1.complaints = [];
    if (!body.insights.bike1.surprising_insights) body.insights.bike1.surprising_insights = [];
    if (!body.insights.bike2.praises) body.insights.bike2.praises = [];
    if (!body.insights.bike2.complaints) body.insights.bike2.complaints = [];
    if (!body.insights.bike2.surprising_insights) body.insights.bike2.surprising_insights = [];

    // Validate personas structure
    if (!body.personas.personas || !Array.isArray(body.personas.personas)) {
      console.error('[Article] Invalid personas structure:', JSON.stringify(body.personas, null, 2).substring(0, 500));
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid personas structure - missing personas array',
          details: 'Please re-run persona generation in Step 4.',
        } as ArticleGenerationResponse,
        { status: 400 }
      );
    }

    // Validate verdicts structure
    if (!body.verdicts.verdicts || !Array.isArray(body.verdicts.verdicts)) {
      console.error('[Article] Invalid verdicts structure:', JSON.stringify(body.verdicts, null, 2).substring(0, 500));
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid verdicts structure - missing verdicts array',
          details: 'Please re-run verdict generation in Step 5.',
        } as ArticleGenerationResponse,
        { status: 400 }
      );
    }

    // Ensure verdicts summary exists with defaults
    if (!body.verdicts.summary) {
      body.verdicts.summary = { bike1Wins: 0, bike2Wins: 0, closestCall: 'N/A' };
    }

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Anthropic API key not configured',
          details: 'Add ANTHROPIC_API_KEY to your .env.local file',
        } as ArticleGenerationResponse,
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    console.log(`[Article] Starting generation for ${body.bike1Name} vs ${body.bike2Name}`);

    // Phase 1: Narrative Planning
    console.log('[Article] Phase 1: Planning narrative...');
    const narrativePlan = await generateNarrativePlan(
      client,
      body.bike1Name,
      body.bike2Name,
      body.insights,
      body.personas,
      body.verdicts
    );

    console.log('[Article] Narrative plan:', JSON.stringify(narrativePlan, null, 2));

    // Phase 2: Section Generation (Parallel where possible)
    console.log('[Article] Phase 2: Generating sections...');

    // Generate independent sections in parallel
    const [hook, truthBomb, personasSection] = await Promise.all([
      generateSection(client, 'hook', {
        bike1Name: body.bike1Name,
        bike2Name: body.bike2Name,
        narrativePlan,
        insights: body.insights,
      }),
      generateSection(client, 'truthBomb', {
        narrativePlan,
        insights: body.insights,
      }),
      generateSection(client, 'personas', {
        personas: body.personas,
        narrativePlan,
      }),
    ]);

    console.log('[Article] Generated hook, truth bomb, and personas sections');

    // Matrix sections (can be parallelized)
    const matrixSections = await Promise.all(
      narrativePlan.matrix_focus_areas.map((area) =>
        generateMatrixSection(client, area, {
          bike1Name: body.bike1Name,
          bike2Name: body.bike2Name,
          insights: body.insights,
          personas: body.personas,
          narrativePlan,
        })
      )
    );

    console.log(`[Article] Generated ${matrixSections.length} matrix sections`);

    // Sequential sections (depend on earlier content)
    const majorityWinner = getMajorityWinner(body.verdicts);
    const minorityWinner = getMinorityWinner(body.verdicts, body.bike1Name, body.bike2Name);

    const contrarian = await generateSection(client, 'contrarian', {
      winningBike: majorityWinner,
      losingBike: minorityWinner,
      narrativePlan,
      verdicts: body.verdicts,
    });

    console.log('[Article] Generated contrarian section');

    const verdictsSection = await generateSection(client, 'verdicts', {
      verdicts: body.verdicts,
      personas: body.personas,
      narrativePlan,
    });

    console.log('[Article] Generated verdicts section');

    const bottomLine = await generateSection(client, 'bottomLine', {
      bike1Name: body.bike1Name,
      bike2Name: body.bike2Name,
      narrativePlan,
      verdicts: body.verdicts,
    });

    console.log('[Article] Generated bottom line section');

    // Combine all sections
    const allSections: ArticleSection[] = [
      {
        id: 'hook',
        title: 'The Hook',
        content: hook,
        wordCount: countWords(hook),
        status: 'complete',
      },
      {
        id: 'truth',
        title: 'The Truth',
        content: truthBomb,
        wordCount: countWords(truthBomb),
        status: 'complete',
      },
      {
        id: 'personas',
        title: 'Meet the Riders',
        content: personasSection,
        wordCount: countWords(personasSection),
        status: 'complete',
      },
      ...matrixSections.map((content, i) => ({
        id: `matrix-${i}`,
        title: narrativePlan.matrix_focus_areas[i],
        content,
        wordCount: countWords(content),
        status: 'complete' as const,
      })),
      {
        id: 'contrarian',
        title: 'The Other Side',
        content: contrarian,
        wordCount: countWords(contrarian),
        status: 'complete',
      },
      {
        id: 'verdicts',
        title: 'Final Verdicts',
        content: verdictsSection,
        wordCount: countWords(verdictsSection),
        status: 'complete',
      },
      {
        id: 'bottomline',
        title: 'The Bottom Line',
        content: bottomLine,
        wordCount: countWords(bottomLine),
        status: 'complete',
      },
    ];

    console.log('[Article] All sections generated, total sections:', allSections.length);

    // Phase 3: Coherence Pass
    console.log('[Article] Phase 3: Coherence check...');
    const coherenceEdits = await runCoherencePass(client, allSections, narrativePlan);

    // Apply coherence edits
    const finalSections = applyCoherenceEdits(allSections, coherenceEdits);

    console.log('[Article] Coherence edits applied');

    // Quality check
    const qualityReport = checkArticleQuality(
      finalSections,
      body.bike1Name,
      body.bike2Name,
      body.personas
    );

    console.log('[Article] Quality report:', JSON.stringify(qualityReport, null, 2));

    const processingTime = Date.now() - startTime;
    const totalWords = finalSections.reduce((sum, s) => sum + s.wordCount, 0);

    console.log(`[Article] Complete in ${processingTime}ms, ${totalWords} words`);

    return NextResponse.json({
      success: true,
      data: {
        sections: finalSections,
        narrativePlan,
        qualityReport,
        metadata: {
          generated_at: new Date().toISOString(),
          total_words: totalWords,
          section_count: finalSections.length,
          processing_time_ms: processingTime,
        },
      },
    } as ArticleGenerationResponse);
  } catch (error: any) {
    console.error('[Article] Generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate article',
        details: error.message,
      } as ArticleGenerationResponse,
      { status: 500 }
    );
  }
}

// Helper functions

/**
 * Clean JSON response from AI that might be wrapped in markdown code blocks
 */
function cleanJsonResponse(text: string): string {
  // Remove markdown code blocks if present
  let cleaned = text.trim();
  
  // Remove ```json ... ``` or ``` ... ```
  if (cleaned.startsWith('```')) {
    // Find the first newline after opening ```
    const firstNewline = cleaned.indexOf('\n');
    // Find the closing ```
    const lastBackticks = cleaned.lastIndexOf('```');
    
    if (firstNewline !== -1 && lastBackticks !== -1 && lastBackticks > firstNewline) {
      cleaned = cleaned.substring(firstNewline + 1, lastBackticks).trim();
    }
  }
  
  return cleaned;
}

async function generateNarrativePlan(
  client: Anthropic,
  bike1Name: string,
  bike2Name: string,
  insights: InsightExtractionResult,
  personas: PersonaGenerationResult,
  verdicts: VerdictGenerationResult
): Promise<NarrativePlan> {
  const prompt = buildNarrativePlanningPrompt(
    bike1Name,
    bike2Name,
    insights,
    personas,
    verdicts
  );

  const response = await client.messages.create({
    model: SONNET_CONFIG.model,
    max_tokens: 2000,
    temperature: SONNET_CONFIG.temperature,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from AI');
  }

  const cleanedJson = cleanJsonResponse(content.text);
  
  try {
    const parsed = JSON.parse(cleanedJson);
    
    // Validate required fields
    if (!parsed.story_angle || !parsed.hook_strategy || !parsed.matrix_focus_areas) {
      console.error('[Article] Invalid narrative plan structure:', parsed);
      throw new Error('Narrative plan missing required fields');
    }
    
    // Add defaults for optional fields
    return {
      story_angle: parsed.story_angle,
      hook_strategy: parsed.hook_strategy,
      hook_elements: parsed.hook_elements || { scenario: '', tension: '', promise: '' },
      truth_bomb: parsed.truth_bomb || insights.bike1?.surprising_insights?.[0] || insights.bike2?.surprising_insights?.[0] || 'Key insight from analysis',
      quote_allocation: parsed.quote_allocation || { hook: [], matrix_engine: [], matrix_comfort: [], matrix_ownership: [], verdict: [] },
      tension_points: parsed.tension_points || [],
      matrix_focus_areas: parsed.matrix_focus_areas || ['Engine Character', 'Comfort', 'Value'],
      contrarian_angle: parsed.contrarian_angle || { target_persona: '', why_they_might_hate_winner: '' },
      closing_insight: parsed.closing_insight || 'Final thoughts',
      callbacks: parsed.callbacks || [],
    };
  } catch (error) {
    console.error('[Article] Failed to parse narrative plan:', cleanedJson);
    throw new Error(`Failed to parse narrative plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function generateSection(
  client: Anthropic,
  sectionType: string,
  data: any
): Promise<string> {
  // Build prompts with correct parameter order for each section type
  let prompt: string;
  
  switch (sectionType) {
    case 'hook':
      // buildHookPrompt(bike1Name, bike2Name, narrativePlan, insights)
      prompt = buildHookPrompt(data.bike1Name, data.bike2Name, data.narrativePlan, data.insights);
      break;
    case 'truthBomb':
      // buildTruthBombPrompt(narrativePlan, insights)
      prompt = buildTruthBombPrompt(data.narrativePlan, data.insights);
      break;
    case 'personas':
      // buildPersonasPrompt(personas, narrativePlan)
      prompt = buildPersonasPrompt(data.personas, data.narrativePlan);
      break;
    case 'contrarian':
      // buildContrarianPrompt(winningBike, losingBike, narrativePlan, verdicts)
      prompt = buildContrarianPrompt(data.winningBike, data.losingBike, data.narrativePlan, data.verdicts);
      break;
    case 'verdicts':
      // buildVerdictsPrompt(verdicts, personas, narrativePlan)
      prompt = buildVerdictsPrompt(data.verdicts, data.personas, data.narrativePlan);
      break;
    case 'bottomLine':
      // buildBottomLinePrompt(bike1Name, bike2Name, narrativePlan, verdicts)
      prompt = buildBottomLinePrompt(data.bike1Name, data.bike2Name, data.narrativePlan, data.verdicts);
      break;
    default:
      throw new Error(`Unknown section type: ${sectionType}`);
  }

  const response = await client.messages.create({
    model: SONNET_CONFIG.model,
    max_tokens: 2000,
    temperature: SONNET_CONFIG.temperature,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  return content.type === 'text' ? content.text : '';
}

async function generateMatrixSection(
  client: Anthropic,
  focusArea: string,
  data: {
    bike1Name: string;
    bike2Name: string;
    insights: InsightExtractionResult;
    personas: PersonaGenerationResult;
    narrativePlan: NarrativePlan;
  }
): Promise<string> {
  // Get quotes allocated to this matrix area
  const allocatedQuotes: string[] = [];
  const areaKey = focusArea.toLowerCase().replace(/\s+/g, '_');
  
  // Try to get quotes from quote_allocation
  if (data.narrativePlan.quote_allocation) {
    const quoteKey = `matrix_${areaKey}`;
    if ((data.narrativePlan.quote_allocation as any)[quoteKey]) {
      allocatedQuotes.push(...(data.narrativePlan.quote_allocation as any)[quoteKey]);
    }
  }

  const prompt = buildMatrixPrompt(
    data.bike1Name,
    data.bike2Name,
    focusArea,
    data.insights,
    data.personas,
    data.narrativePlan,
    allocatedQuotes
  );

  const response = await client.messages.create({
    model: SONNET_CONFIG.model,
    max_tokens: 1500,
    temperature: SONNET_CONFIG.temperature,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  return content.type === 'text' ? content.text : '';
}

async function runCoherencePass(
  client: Anthropic,
  sections: ArticleSection[],
  narrativePlan: NarrativePlan
): Promise<CoherenceEdits> {
  const prompt = buildCoherencePrompt(sections, narrativePlan);

  const response = await client.messages.create({
    model: SONNET_CONFIG.model,
    max_tokens: 1500,
    temperature: 0.3, // Lower temperature for editing
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from AI');
  }

  const cleanedJson = cleanJsonResponse(content.text);
  return JSON.parse(cleanedJson);
}

function getMajorityWinner(verdicts: VerdictGenerationResult): string {
  return verdicts.summary.bike1Wins >= verdicts.summary.bike2Wins
    ? verdicts.verdicts[0].recommendedBike
    : verdicts.verdicts[0].otherBike;
}

function getMinorityWinner(
  verdicts: VerdictGenerationResult,
  bike1Name: string,
  bike2Name: string
): string {
  const winner = getMajorityWinner(verdicts);
  return winner === bike1Name ? bike2Name : bike1Name;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

