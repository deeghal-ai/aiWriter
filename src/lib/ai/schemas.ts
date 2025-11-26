/**
 * JSON Schema for AI Structured Outputs
 * Defines the exact structure the AI must return
 */

export const insightExtractionSchema = {
  type: "object",
  properties: {
    bike1: {
      type: "object",
      properties: {
        name: { type: "string" },
        praises: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: {
                type: "string",
                description: "Short category name (e.g., 'Engine refinement', 'Fuel economy')"
              },
              frequency: {
                type: "number",
                description: "Number of unique mentions across all sources"
              },
              quotes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: {
                      type: "string",
                      description: "Direct quote from owner (under 100 words)"
                    },
                    author: {
                      type: "string",
                      description: "Username or 'Anonymous'"
                    },
                    source: {
                      type: "string",
                      description: "Either 'Reddit' or 'xBhp'"
                    }
                  },
                  required: ["text", "author", "source"]
                }
              }
            },
            required: ["category", "frequency", "quotes"]
          }
        },
        complaints: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              frequency: { type: "number" },
              quotes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    author: { type: "string" },
                    source: { type: "string" }
                  },
                  required: ["text", "author", "source"]
                }
              }
            },
            required: ["category", "frequency", "quotes"]
          }
        },
        surprising_insights: {
          type: "array",
          items: {
            type: "string",
            description: "Insight that contradicts conventional wisdom or is unexpected"
          }
        }
      },
      required: ["name", "praises", "complaints", "surprising_insights"]
    },
    bike2: {
      type: "object",
      properties: {
        name: { type: "string" },
        praises: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              frequency: { type: "number" },
              quotes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    author: { type: "string" },
                    source: { type: "string" }
                  },
                  required: ["text", "author", "source"]
                }
              }
            },
            required: ["category", "frequency", "quotes"]
          }
        },
        complaints: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              frequency: { type: "number" },
              quotes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    author: { type: "string" },
                    source: { type: "string" }
                  },
                  required: ["text", "author", "source"]
                }
              }
            },
            required: ["category", "frequency", "quotes"]
          }
        },
        surprising_insights: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["name", "praises", "complaints", "surprising_insights"]
    }
  },
  required: ["bike1", "bike2"]
} as const;

/**
 * JSON Schema for Persona Generation
 */
export const personaGenerationSchema = {
  type: "object",
  properties: {
    personas: {
      type: "array",
      minItems: 3,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique identifier like 'persona-1', 'persona-2'"
          },
          name: {
            type: "string",
            description: "Realistic Indian name (e.g., 'Naveen', 'Priya')"
          },
          title: {
            type: "string",
            description: "Specific, memorable descriptor (NOT generic)"
          },
          percentage: {
            type: "number",
            minimum: 10,
            maximum: 50,
            description: "Percentage of discussions matching this persona"
          },
          sampleSize: {
            type: "number",
            minimum: 3,
            maximum: 30,
            description: "Actual user count matching this persona"
          },
          usagePattern: {
            type: "object",
            properties: {
              cityCommute: { type: "number", minimum: 0, maximum: 100 },
              highway: { type: "number", minimum: 0, maximum: 100 },
              urbanLeisure: { type: "number", minimum: 0, maximum: 100 },
              offroad: { type: "number", minimum: 0, maximum: 100 }
            },
            required: ["cityCommute", "highway", "urbanLeisure", "offroad"],
            description: "Must sum to 100"
          },
          demographics: {
            type: "object",
            properties: {
              ageRange: { type: "string" },
              cityType: { type: "string" },
              occupation: { type: "string" },
              incomeIndicator: { type: "string" },
              familyContext: { type: "string" }
            },
            required: ["ageRange", "cityType", "occupation", "incomeIndicator", "familyContext"]
          },
          psychographics: {
            type: "object",
            properties: {
              buyingMotivation: { type: "string" },
              decisionStyle: { type: "string" },
              brandLoyalty: { type: "string" },
              riskTolerance: { type: "string" }
            },
            required: ["buyingMotivation", "decisionStyle", "brandLoyalty", "riskTolerance"]
          },
          priorities: {
            type: "array",
            items: { type: "string" },
            minItems: 4,
            maxItems: 6
          },
          painPoints: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 4
          },
          evidenceQuotes: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 4
          },
          archetypeQuote: {
            type: "string",
            description: "One quote (15-25 words) capturing persona's core need"
          },
          color: {
            type: "string",
            enum: ["blue", "green", "purple", "orange"]
          }
        },
        required: [
          "id", "name", "title", "percentage", "sampleSize",
          "usagePattern", "demographics", "psychographics",
          "priorities", "painPoints", "evidenceQuotes", "archetypeQuote", "color"
        ]
      }
    }
  },
  required: ["personas"]
} as const;

