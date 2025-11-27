import { ArticleSection, QualityReport, PersonaGenerationResult } from '../types';

const BANNED_PHRASES = [
  "let's dive in",
  "in this article",
  "without further ado",
  "in conclusion",
  "all in all",
  "at the end of the day",
  "it goes without saying",
  "it is what it is",
  "only time will tell",
];

export function checkArticleQuality(
  sections: ArticleSection[],
  bike1Name: string,
  bike2Name: string,
  personas: PersonaGenerationResult
): QualityReport {
  const fullText = sections.map(s => s.content).join('\n');
  const totalWords = countWords(fullText);

  // Count quotes in the text
  const quoteMatches = fullText.match(/"/g) || [];
  const quoteCount = Math.floor(quoteMatches.length / 2); // Pairs of quotes

  // Check for banned phrases
  const foundBannedPhrases = findBannedPhrases(fullText);

  // Specificity checks
  const specificityCheck = {
    hasSpecificCities: /Bangalore|Mumbai|Delhi|Pune|Hyderabad|Chennai|Gurgaon|Noida|Whitefield|Hinjewadi/i.test(
      fullText
    ),
    hasSpecificRoads: /ORR|Ring Road|Expressway|NH|Silk Board|Outer Ring|Highway|Ghat/i.test(
      fullText
    ),
    hasSpecificPrices: /₹\s*[\d,]+/g.test(fullText),
    hasSpecificMileage: /\d+\s*kmpl/i.test(fullText),
  };

  // Balance check
  const bike1Mentions = (
    fullText.match(new RegExp(bike1Name, 'gi')) || []
  ).length;
  const bike2Mentions = (
    fullText.match(new RegExp(bike2Name, 'gi')) || []
  ).length;
  const isBalanced = Math.abs(bike1Mentions - bike2Mentions) < 10;

  // Persona references
  const personaReferences: { [personaName: string]: boolean } = {};
  personas.personas.forEach(persona => {
    personaReferences[persona.name] = new RegExp(persona.name, 'i').test(
      fullText
    );
  });

  // Structure check
  const structureCheck = {
    hasHook: sections.some(s => s.id === 'hook'),
    hasVerdicts: sections.some(s => s.id === 'verdicts'),
    hasContrarian: sections.some(s => s.id === 'contrarian'),
  };

  return {
    wordCount: {
      total: totalWords,
      inRange: totalWords >= 3500 && totalWords <= 4500,
    },
    bannedPhrases: {
      found: foundBannedPhrases,
    },
    quoteCount: {
      total: quoteCount,
      hasEnough: quoteCount >= 20,
    },
    specificityCheck,
    balanceCheck: {
      bike1Mentions,
      bike2Mentions,
      isBalanced,
    },
    personaReferences,
    structureCheck,
  };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

function findBannedPhrases(text: string): string[] {
  return BANNED_PHRASES.filter(phrase =>
    text.toLowerCase().includes(phrase.toLowerCase())
  );
}

