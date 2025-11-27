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

  return JSON.parse(content.text);
}

async function generateSection(
  client: Anthropic,
  sectionType: string,
  data: any
): Promise<string> {
  const promptBuilders: Record<string, Function> = {
    hook: buildHookPrompt,
    truthBomb: buildTruthBombPrompt,
    personas: buildPersonasPrompt,
    contrarian: buildContrarianPrompt,
    verdicts: buildVerdictsPrompt,
    bottomLine: buildBottomLinePrompt,
  };

  const promptBuilder = promptBuilders[sectionType];
  if (!promptBuilder) {
    throw new Error(`Unknown section type: ${sectionType}`);
  }

  const prompt = promptBuilder(
    data.bike1Name,
    data.bike2Name,
    data.narrativePlan,
    data.insights,
    data.personas,
    data.verdicts,
    data.winningBike,
    data.losingBike
  );

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

  return JSON.parse(content.text);
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

