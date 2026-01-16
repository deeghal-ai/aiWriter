import { ArticleSection, NarrativePlan, CoherenceEdits } from '../types';

export function buildCoherencePrompt(
  sections: ArticleSection[],
  narrativePlan: NarrativePlan
): string {
  const articleText = sections
    .map(s => `## ${s.title}\n\n${s.content}`)
    .join('\n\n---\n\n');
  
  const totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0);

  return `<role>
You're an editor reviewing a completed article. Your job is to ensure coherence, fix transitions, and add callbacks between sections.
</role>

<article>
${articleText}
</article>

<planned_callbacks>
${JSON.stringify(narrativePlan.callbacks, null, 2)}
</planned_callbacks>

<your_tasks>
1. TRANSITIONS: Add 1-2 sentence transitions between sections where needed
2. CALLBACKS: Ensure planned callbacks are present (references back to earlier points)
3. CONSISTENCY: Flag any contradictions between sections
4. FLOW: Smooth any abrupt tonal shifts
5. WORD COUNT: Current total is ${totalWords}. Target is 2,200-2,800 words. Suggest cuts for bloat/repetition or small additions only if under 2,200.
</your_tasks>

<output_format>
{
  "transitions_added": [
    { "between": "section1-section2", "transition": "text" }
  ],
  "callbacks_added": [
    { "in_section": "string", "callback": "text" }
  ],
  "contradictions_found": [
    { "section1": "string", "section2": "string", "issue": "string" }
  ],
  "word_count_suggestion": "add X words to Y section" | "cut X words from Z section" | "on target"
}
</output_format>

Output JSON:`;
}

export function applyCoherenceEdits(
  sections: ArticleSection[],
  edits: CoherenceEdits
): ArticleSection[] {
  // Clone sections to avoid mutation
  const updatedSections = sections.map(s => ({ ...s }));

  // Apply transitions between sections
  for (const transition of edits.transitions_added) {
    const [section1Id, section2Id] = transition.between.split('-');
    const section1Index = updatedSections.findIndex(s => s.id === section1Id);
    const section2Index = updatedSections.findIndex(s => s.id === section2Id);
    
    if (section1Index >= 0 && section2Index >= 0) {
      // Add transition to the end of section1
      updatedSections[section1Index].content += `\n\n${transition.transition}`;
      updatedSections[section1Index].wordCount = countWords(
        updatedSections[section1Index].content
      );
    }
  }

  // Apply callbacks
  for (const callback of edits.callbacks_added) {
    const sectionIndex = updatedSections.findIndex(
      s => s.id === callback.in_section
    );
    
    if (sectionIndex >= 0) {
      // Add callback at the end of the section
      updatedSections[sectionIndex].content += `\n\n${callback.callback}`;
      updatedSections[sectionIndex].wordCount = countWords(
        updatedSections[sectionIndex].content
      );
    }
  }

  return updatedSections;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

