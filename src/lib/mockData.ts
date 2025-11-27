import type { 
  ScrapingProgress, 
  Insight, 
  Persona, 
  Verdict, 
  ArticleSection,
  QualityCheck 
} from './types';

export const mockScrapingProgress: ScrapingProgress[] = [
  {
    source: 'xBhp Forums',
    total: 23,
    completed: 15,
    currentThread: 'Apache RTX 300 ownership review',
    status: 'in-progress'
  },
  {
    source: 'Team-BHP',
    total: 12,
    completed: 12,
    status: 'complete'
  },
  {
    source: 'Reddit r/IndianBikes',
    total: 18,
    completed: 8,
    currentThread: 'Scram 440 - 3 month report',
    status: 'in-progress'
  },
  {
    source: 'YouTube Comments',
    total: 10,
    completed: 1,
    status: 'in-progress'
  }
];

export const mockInsights = {
  bike1: {
    praises: [
      {
        type: 'praise' as const,
        text: 'Engine refinement',
        frequency: 8,
        quotes: [
          {
            text: 'almost negligible vibrations',
            author: 'Owner A',
            source: 'xBhp Forums'
          },
          {
            text: 'smooth power delivery',
            author: 'Owner B',
            source: 'Team-BHP'
          }
        ]
      },
      {
        type: 'praise' as const,
        text: 'Highway stability',
        frequency: 7,
        quotes: [
          {
            text: 'planted at 100 kmph',
            author: 'Owner C',
            source: 'Reddit'
          }
        ]
      },
      {
        type: 'praise' as const,
        text: 'Fuel economy',
        frequency: 5,
        quotes: []
      }
    ],
    complaints: [
      {
        type: 'complaint' as const,
        text: 'Missing 6th gear',
        frequency: 6,
        quotes: [
          {
            text: 'needs six gears for highway',
            author: 'Owner D',
            source: 'xBhp'
          }
        ]
      },
      {
        type: 'complaint' as const,
        text: 'Heavy in traffic',
        frequency: 4,
        quotes: []
      }
    ],
    surprisingInsights: [
      'Owners report slower than 150cc bikes but prefer it',
      'Heat management better than expected',
      'Service quality varies significantly by city'
    ]
  },
  bike2: {
    praises: [
      {
        type: 'praise' as const,
        text: 'Iconic thump/exhaust note',
        frequency: 20,
        quotes: [
          {
            text: 'deep bassy sound is addictive',
            author: 'Owner E',
            source: 'Team-BHP'
          }
        ]
      },
      {
        type: 'praise' as const,
        text: 'Timeless design',
        frequency: 15,
        quotes: []
      }
    ],
    complaints: [
      {
        type: 'complaint' as const,
        text: 'Single-channel ABS only',
        frequency: 7,
        quotes: []
      },
      {
        type: 'complaint' as const,
        text: 'Heavier clutch',
        frequency: 5,
        quotes: []
      }
    ],
    surprisingInsights: [
      'Pillion comfort significantly worse than expected',
      'LED lights matter more than anticipated'
    ]
  }
};

// Mock personas removed - using real AI-generated personas from Step 4
// The Persona interface has been updated and these mocks are outdated

// Mock verdicts removed - using real AI-generated verdicts from Step 5
// export const mockVerdicts: Verdict[] = [
//   {
//     personaId: 'persona-1',
//     recommendedBike: 'Classic 350',
//     confidence: 90,
//     reasoning: [
//       'Dual-seat comfort confirmed by 12 pillion riders',
//       'LED visibility crucial for city traffic safety',
//       'Better resale value (23% higher after 3 years)'
//     ],
//     againstReasons: [
//       'If Bullet purist (exhaust note priority)',
//       'If ₹20k price gap matters more than features'
//     ],
//     evidence: [
//       '15 owners in this category chose Classic',
//       '3 chose Bullet, later regretted pillion comfort',
//       'Average rating: Classic 4.6/5, Bullet 3.8/5'
//     ]
//   },
//   {
//     personaId: 'persona-2',
//     recommendedBike: 'Bullet 350',
//     confidence: 85,
//     reasoning: [
//       'Exhaust note matters more than feature list',
//       '₹20k savings funds accessories and services',
//       'Intentional simplicity is the appeal'
//     ],
//     againstReasons: [
//       'If monthly 200km+ highway rides planned',
//       'If riding group has modern bikes (Speed 400, CB350)'
//     ],
//     evidence: [
//       '12 owners prioritized "experience" over performance',
//       'Exhaust note mentioned in 20+ reviews'
//     ]
//   }
// ];

export const mockArticleSections: ArticleSection[] = [
  {
    id: 'hook',
    title: 'Hook',
    content: 'Your office parking has three Classic 350s. Your childhood has one memory...',
    wordCount: 200,
    status: 'complete'
  },
  {
    id: 'targeting',
    title: 'Reader Targeting',
    content: 'Here\'s what actually matters: Both share the same 349cc engine...',
    wordCount: 150,
    status: 'complete'
  },
  {
    id: 'personas',
    title: 'Persona Descriptions',
    content: '',
    wordCount: 500,
    status: 'generating'
  },
  {
    id: 'matrix',
    title: 'Decision Matrix',
    content: '',
    wordCount: 0,
    status: 'pending'
  }
];

export const mockQualityChecks: QualityCheck[] = [
  {
    category: 'Fact-Grounding',
    status: 'complete',
    items: [
      { text: '23 owner quotes inserted with sources', passed: true },
      { text: 'All fuel economy claims linked to test data', passed: true },
      { text: 'Price figures validated (as of Nov 2024)', passed: true }
    ]
  },
  {
    category: 'Prose Quality',
    status: 'checking',
    items: [
      { text: 'Removed instances of "good/nice/decent"', passed: true },
      { text: 'Added specific road/city examples', passed: false }
    ],
    issues: [
      {
        severity: 'warning',
        message: 'Section 4 repeats "highway stability" 3x - suggest consolidation'
      }
    ]
  },
  {
    category: 'Template Compliance',
    status: 'pending',
    items: []
  }
];

