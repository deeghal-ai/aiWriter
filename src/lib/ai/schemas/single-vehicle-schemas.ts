/**
 * JSON Schemas for Single Vehicle Content Generation
 * Defines the exact structure for each AI generation step
 */

/**
 * Schema for Owner Pulse extraction
 * Extracts praised and criticized patterns from corpus
 */
export const ownerPulseSchema = {
  type: "object",
  properties: {
    rating: {
      type: "number",
      minimum: 1,
      maximum: 5,
      description: "Overall rating inferred from sentiment (1-5 scale)"
    },
    totalReviews: {
      type: "number",
      description: "Estimated total reviews/comments analyzed"
    },
    mostPraised: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Concise description of what owners praise (under 50 chars)"
          },
          category: {
            type: "string",
            enum: ["performance", "value", "technology", "drivability", "comfort", "safety", "design", "reliability", "features", "variety"],
            description: "Category of the praise"
          }
        },
        required: ["text", "category"]
      }
    },
    mostCriticized: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Concise description of what owners criticize (under 50 chars)"
          },
          category: {
            type: "string",
            enum: ["efficiency", "space", "features", "value", "comfort", "reliability", "build-quality", "performance", "pricing"],
            description: "Category of the criticism"
          }
        },
        required: ["text", "category"]
      }
    }
  },
  required: ["rating", "totalReviews", "mostPraised", "mostCriticized"]
} as const;

/**
 * Schema for Quick Decision generation
 * Synthesizes verdict and ideal buyer segments
 */
export const quickDecisionSchema = {
  type: "object",
  properties: {
    idealFor: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          label: {
            type: "string",
            description: "Buyer segment label (e.g., 'Driving Enthusiasts')"
          },
          icon: {
            type: "string",
            enum: ["steering-wheel", "city", "smartphone", "family", "highway", "value", "safety", "comfort", "performance"],
            description: "Icon identifier for the segment"
          }
        },
        required: ["label", "icon"]
      }
    },
    verdict: {
      type: "object",
      properties: {
        headline: {
          type: "string",
          description: "One-line verdict headline (under 60 chars)"
        },
        summary: {
          type: "string",
          description: "2-3 sentence summary of the vehicle's proposition (under 200 chars)"
        },
        highlightType: {
          type: "string",
          enum: ["positive", "negative", "neutral"],
          description: "Overall sentiment of the verdict"
        }
      },
      required: ["headline", "summary", "highlightType"]
    },
    perfectIf: {
      type: "string",
      description: "Describes the ideal buyer scenario (under 150 chars)"
    },
    skipIf: {
      type: "string",
      description: "Describes when to skip this vehicle (under 150 chars)"
    },
    keyAdvantage: {
      type: "string",
      description: "Key selling points in a concise format (under 100 chars)"
    }
  },
  required: ["idealFor", "verdict", "perfectIf", "skipIf", "keyAdvantage"]
} as const;

/**
 * Schema for Segment Scorecard generation
 * Ranks the vehicle across key categories
 */
export const segmentScorecardSchema = {
  type: "object",
  properties: {
    leadingCount: {
      type: "number",
      minimum: 0,
      maximum: 5,
      description: "Number of categories where vehicle leads segment"
    },
    badge: {
      type: "string",
      description: "Summary badge (e.g., '2 Leading', 'Segment Leader')"
    },
    categories: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Category name (e.g., 'Safety & Security')"
          },
          rank: {
            type: "string",
            description: "Rank string (e.g., '#1 of 6')"
          },
          rankNumber: {
            type: "number",
            minimum: 1,
            maximum: 10,
            description: "Numeric rank"
          },
          totalInSegment: {
            type: "number",
            description: "Total competitors in segment"
          },
          status: {
            type: "string",
            description: "Status description (e.g., 'Best in class', 'Above Average')"
          },
          statusType: {
            type: "string",
            enum: ["positive", "negative", "neutral"],
            description: "Status sentiment"
          },
          highlights: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 4,
            description: "Key highlights for this category"
          }
        },
        required: ["name", "rank", "rankNumber", "totalInSegment", "status", "statusType", "highlights"]
      }
    },
    summary: {
      type: "string",
      description: "2-3 sentence summary of segment positioning (under 300 chars)"
    }
  },
  required: ["leadingCount", "badge", "categories", "summary"]
} as const;

/**
 * Schema for Competitor Analysis extraction
 * Extracts mentioned competitors from corpus
 */
export const competitorAnalysisSchema = {
  type: "object",
  properties: {
    competitors: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Full competitor name (e.g., 'Maruti Brezza')"
          },
          tag: {
            type: "string",
            description: "Positioning tag (e.g., 'Segment Leader', 'Safety Champion')"
          },
          tagType: {
            type: "string",
            enum: ["primary", "secondary", "neutral"],
            description: "Tag importance"
          },
          priceRange: {
            type: "string",
            description: "Approximate price range (e.g., '₹8-14L')"
          },
          keyDifferentiator: {
            type: "string",
            description: "Main differentiating factor (under 50 chars)"
          }
        },
        required: ["name", "tag", "tagType", "priceRange", "keyDifferentiator"]
      }
    }
  },
  required: ["competitors"]
} as const;

/**
 * Schema for Good Time to Buy analysis
 */
export const goodTimeToBuySchema = {
  type: "object",
  properties: {
    overallSignal: {
      type: "string",
      description: "Overall buy signal (e.g., 'Right Timing', 'Wait for Facelift')"
    },
    overallSignalType: {
      type: "string",
      enum: ["positive", "negative", "neutral"],
      description: "Signal sentiment"
    },
    salesRank: {
      type: "object",
      properties: {
        label: { type: "string" },
        value: { type: "string" },
        description: { type: "string" }
      },
      required: ["label", "value", "description"]
    },
    lifecycleCheck: {
      type: "object",
      properties: {
        label: { type: "string" },
        status: { type: "string" },
        statusType: {
          type: "string",
          enum: ["positive", "negative", "neutral"]
        },
        faceliftExpected: { type: "string" },
        generationYear: { type: "number" }
      },
      required: ["label", "status", "statusType", "faceliftExpected", "generationYear"]
    },
    timingSignal: {
      type: "object",
      properties: {
        label: { type: "string" },
        status: { type: "string" },
        statusType: {
          type: "string",
          enum: ["positive", "negative", "neutral"]
        },
        reason: { type: "string" }
      },
      required: ["label", "status", "statusType", "reason"]
    }
  },
  required: ["overallSignal", "overallSignalType", "salesRank", "lifecycleCheck", "timingSignal"]
} as const;

/**
 * Schema for Vehicle Info extraction
 */
export const vehicleInfoSchema = {
  type: "object",
  properties: {
    make: {
      type: "string",
      description: "Vehicle manufacturer (e.g., 'Hyundai')"
    },
    model: {
      type: "string",
      description: "Vehicle model name (e.g., 'Venue')"
    },
    year: {
      type: "number",
      description: "Model year"
    },
    segment: {
      type: "string",
      description: "Vehicle segment (e.g., 'Compact SUV')"
    }
  },
  required: ["make", "model", "year", "segment"]
} as const;

/**
 * Combined schema for full content generation (used for validation)
 */
export const singleVehicleContentSchema = {
  type: "object",
  properties: {
    vehicle: vehicleInfoSchema,
    quickDecision: quickDecisionSchema,
    segmentScorecard: segmentScorecardSchema,
    mainCompetitors: competitorAnalysisSchema.properties.competitors,
    ownerPulse: ownerPulseSchema
  },
  required: ["vehicle", "quickDecision", "segmentScorecard", "mainCompetitors", "ownerPulse"]
} as const;
