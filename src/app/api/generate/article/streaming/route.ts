import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  InsightExtractionResult,
  PersonaGenerationResult,
  VerdictGenerationResult,
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
export const maxDuration = 300;

const SONNET_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
};

interface ArticleGenerationRequest {
  bike1Name: string;
  bike2Name: string;
  insights: InsightExtractionResult;
  personas: PersonaGenerationResult;
  verdicts: VerdictGenerationResult;
}

export async function POST(request: NextRequest) {
  const body: ArticleGenerationRequest = await request.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Validate inputs
        if (!body.bike1Name || !body.bike2Name || !body.insights || !body.personas || !body.verdicts) {
          emit({ error: true, message: 'Missing required inputs' });
          controller.close();
          return;
        }

        if (!process.env.ANTHROPIC_API_KEY) {
          emit({ error: true, message: 'Anthropic API key not configured' });
          controller.close();
          return;
        }

        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const sections: ArticleSection[] = [];

        // Phase 1: Narrative Planning
        emit({ phase: 1, status: 'planning', message: 'Finding the story angle...' });
        
        const narrativePlan = await generateNarrativePlan(
          client,
          body.bike1Name,
          body.bike2Name,
          body.insights,
          body.personas,
          body.verdicts
        );
        
        emit({ phase: 1, status: 'complete', narrativePlan });

        // Phase 2: Section Generation
        emit({ phase: 2, status: 'started', message: 'Writing sections...' });

        // Hook
        emit({ phase: 2, section: 'hook', status: 'generating' });
        const hook = await generateSection(client, 'hook', {
          bike1Name: body.bike1Name,
          bike2Name: body.bike2Name,
          narrativePlan,
          insights: body.insights,
        });
        sections.push({
          id: 'hook',
          title: 'The Hook',
          content: hook,
          wordCount: countWords(hook),
          status: 'complete',
        });
        emit({ phase: 2, section: 'hook', status: 'complete', content: hook, wordCount: countWords(hook) });

        // Truth Bomb
        emit({ phase: 2, section: 'truth', status: 'generating' });
        const truthBomb = await generateSection(client, 'truthBomb', {
          narrativePlan,
          insights: body.insights,
        });
        sections.push({
          id: 'truth',
          title: 'The Truth',
          content: truthBomb,
          wordCount: countWords(truthBomb),
          status: 'complete',
        });
        emit({ phase: 2, section: 'truth', status: 'complete', content: truthBomb, wordCount: countWords(truthBomb) });

        // Personas
        emit({ phase: 2, section: 'personas', status: 'generating' });
        const personasSection = await generateSection(client, 'personas', {
          personas: body.personas,
          narrativePlan,
        });
        sections.push({
          id: 'personas',
          title: 'Meet the Riders',
          content: personasSection,
          wordCount: countWords(personasSection),
          status: 'complete',
        });
        emit({ phase: 2, section: 'personas', status: 'complete', content: personasSection, wordCount: countWords(personasSection) });

        // Matrix sections
        for (let i = 0; i < narrativePlan.matrix_focus_areas.length; i++) {
          const area = narrativePlan.matrix_focus_areas[i];
          emit({ phase: 2, section: `matrix-${i}`, status: 'generating', focusArea: area });
          
          const allocatedQuotes: string[] = [];
          const areaKey = area.toLowerCase().replace(/\s+/g, '_');
          if (narrativePlan.quote_allocation) {
            const quoteKey = `matrix_${areaKey}`;
            if ((narrativePlan.quote_allocation as any)[quoteKey]) {
              allocatedQuotes.push(...(narrativePlan.quote_allocation as any)[quoteKey]);
            }
          }

          const matrixContent = await generateMatrixSection(
            client,
            area,
            body.bike1Name,
            body.bike2Name,
            body.insights,
            body.personas,
            narrativePlan,
            allocatedQuotes
          );

          sections.push({
            id: `matrix-${i}`,
            title: area,
            content: matrixContent,
            wordCount: countWords(matrixContent),
            status: 'complete',
          });
          emit({ phase: 2, section: `matrix-${i}`, status: 'complete', content: matrixContent, wordCount: countWords(matrixContent) });
        }

        // Contrarian
        emit({ phase: 2, section: 'contrarian', status: 'generating' });
        const majorityWinner = getMajorityWinner(body.verdicts);
        const minorityWinner = getMinorityWinner(body.verdicts, body.bike1Name, body.bike2Name);
        
        const contrarian = await generateSection(client, 'contrarian', {
          winningBike: majorityWinner,
          losingBike: minorityWinner,
          narrativePlan,
          verdicts: body.verdicts,
        });
        sections.push({
          id: 'contrarian',
          title: 'The Other Side',
          content: contrarian,
          wordCount: countWords(contrarian),
          status: 'complete',
        });
        emit({ phase: 2, section: 'contrarian', status: 'complete', content: contrarian, wordCount: countWords(contrarian) });

        // Verdicts
        emit({ phase: 2, section: 'verdicts', status: 'generating' });
        const verdictsSection = await generateSection(client, 'verdicts', {
          verdicts: body.verdicts,
          personas: body.personas,
          narrativePlan,
        });
        sections.push({
          id: 'verdicts',
          title: 'Final Verdicts',
          content: verdictsSection,
          wordCount: countWords(verdictsSection),
          status: 'complete',
        });
        emit({ phase: 2, section: 'verdicts', status: 'complete', content: verdictsSection, wordCount: countWords(verdictsSection) });

        // Bottom Line
        emit({ phase: 2, section: 'bottomline', status: 'generating' });
        const bottomLine = await generateSection(client, 'bottomLine', {
          bike1Name: body.bike1Name,
          bike2Name: body.bike2Name,
          narrativePlan,
          verdicts: body.verdicts,
        });
        sections.push({
          id: 'bottomline',
          title: 'The Bottom Line',
          content: bottomLine,
          wordCount: countWords(bottomLine),
          status: 'complete',
        });
        emit({ phase: 2, section: 'bottomline', status: 'complete', content: bottomLine, wordCount: countWords(bottomLine) });

        emit({ phase: 2, status: 'complete' });

        // Phase 3: Coherence Pass
        emit({ phase: 3, status: 'polishing', message: 'Final coherence check...' });
        
        const coherenceEdits = await runCoherencePass(client, sections, narrativePlan);
        const finalSections = applyCoherenceEdits(sections, coherenceEdits);

        // Quality check
        const qualityReport = checkArticleQuality(
          finalSections,
          body.bike1Name,
          body.bike2Name,
          body.personas
        );

        const totalWords = finalSections.reduce((sum, s) => sum + s.wordCount, 0);

        emit({
          phase: 3,
          status: 'complete',
          sections: finalSections,
          qualityReport,
          totalWords,
          metadata: {
            generated_at: new Date().toISOString(),
            total_words: totalWords,
            section_count: finalSections.length,
          },
        });

        controller.close();
      } catch (error: any) {
        console.error('[Article Streaming] Error:', error);
        emit({ error: true, message: error.message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// Helper functions (same as non-streaming route)

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
  return JSON.parse(cleanedJson);
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
  bike1Name: string,
  bike2Name: string,
  insights: InsightExtractionResult,
  personas: PersonaGenerationResult,
  narrativePlan: NarrativePlan,
  allocatedQuotes: string[]
): Promise<string> {
  const prompt = buildMatrixPrompt(
    bike1Name,
    bike2Name,
    focusArea,
    insights,
    personas,
    narrativePlan,
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
    temperature: 0.3,
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

