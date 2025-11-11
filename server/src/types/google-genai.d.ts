declare module '@google/genai' {
  export interface GenerationConfig {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseSchema?: unknown;
  }

  export interface ContentPart {
    text?: string;
    [key: string]: unknown;
  }

  export interface Content {
    role: string;
    parts: ContentPart[];
  }

  export interface GenerateContentRequest {
    model: string;
    contents: Content[];
    config?: GenerationConfig;
  }

  export interface CandidateContent {
    parts?: ContentPart[];
    [key: string]: unknown;
  }

  export interface Candidate {
    content?: CandidateContent;
    [key: string]: unknown;
  }

  export interface GenerateContentResponse {
    text?: string;
    candidates?: Candidate[];
    [key: string]: unknown;
  }

  export class GoogleGenAI {
    constructor(options: { apiKey: string });
    models: {
      generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse>;
    };
  }
}
