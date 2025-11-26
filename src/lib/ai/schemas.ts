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

