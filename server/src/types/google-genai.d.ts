declare module '@google/genai' {
  export interface GenerationConfig {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseSchema?: unknown;
  }

  export enum HarmBlockThreshold {
    HARM_BLOCK_THRESHOLD_UNSPECIFIED = 'HARM_BLOCK_THRESHOLD_UNSPECIFIED',
    BLOCK_LOW_AND_ABOVE = 'BLOCK_LOW_AND_ABOVE',
    BLOCK_MEDIUM_AND_ABOVE = 'BLOCK_MEDIUM_AND_ABOVE',
    BLOCK_ONLY_HIGH = 'BLOCK_ONLY_HIGH',
    BLOCK_NONE = 'BLOCK_NONE',
    OFF = 'OFF',
  }

  export enum HarmBlockMethod {
    HARM_BLOCK_METHOD_UNSPECIFIED = 'HARM_BLOCK_METHOD_UNSPECIFIED',
    SEVERITY = 'SEVERITY',
    PROBABILITY = 'PROBABILITY',
  }

  export enum HarmCategory {
    HARM_CATEGORY_UNSPECIFIED = 'HARM_CATEGORY_UNSPECIFIED',
    HARM_CATEGORY_HATE_SPEECH = 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_DANGEROUS_CONTENT = 'HARM_CATEGORY_DANGEROUS_CONTENT',
    HARM_CATEGORY_HARASSMENT = 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_SEXUALLY_EXPLICIT = 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_CIVIC_INTEGRITY = 'HARM_CATEGORY_CIVIC_INTEGRITY',
  }

  export enum HarmProbability {
    HARM_PROBABILITY_UNSPECIFIED = 'HARM_PROBABILITY_UNSPECIFIED',
    NEGLIGIBLE = 'NEGLIGIBLE',
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
  }

  export enum HarmSeverity {
    HARM_SEVERITY_UNSPECIFIED = 'HARM_SEVERITY_UNSPECIFIED',
    HARM_SEVERITY_NEGLIGIBLE = 'HARM_SEVERITY_NEGLIGIBLE',
    HARM_SEVERITY_LOW = 'HARM_SEVERITY_LOW',
    HARM_SEVERITY_MEDIUM = 'HARM_SEVERITY_MEDIUM',
    HARM_SEVERITY_HIGH = 'HARM_SEVERITY_HIGH',
  }

  export enum BlockedReason {
    BLOCKED_REASON_UNSPECIFIED = 'BLOCKED_REASON_UNSPECIFIED',
    SAFETY = 'SAFETY',
    OTHER = 'OTHER',
    BLOCKLIST = 'BLOCKLIST',
    PROHIBITED_CONTENT = 'PROHIBITED_CONTENT',
  }

  export enum FinishReason {
    FINISH_REASON_UNSPECIFIED = 'FINISH_REASON_UNSPECIFIED',
    STOP = 'STOP',
    MAX_TOKENS = 'MAX_TOKENS',
    SAFETY = 'SAFETY',
    RECITATION = 'RECITATION',
    LANGUAGE = 'LANGUAGE',
    OTHER = 'OTHER',
    BLOCKLIST = 'BLOCKLIST',
    PROHIBITED_CONTENT = 'PROHIBITED_CONTENT',
    SPII = 'SPII',
    MALFORMED_FUNCTION_CALL = 'MALFORMED_FUNCTION_CALL',
    IMAGE_SAFETY = 'IMAGE_SAFETY',
  }

  export interface SafetyRating {
    blocked?: boolean;
    category?: HarmCategory;
    probability?: HarmProbability;
    severity?: HarmSeverity;
  }

  export interface SafetySetting {
    category?: HarmCategory;
    threshold?: HarmBlockThreshold;
    method?: HarmBlockMethod;
  }

  export interface PromptFeedback {
    blockReason?: BlockedReason;
    blockReasonMessage?: string;
    safetyRatings?: SafetyRating[];
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
    safetySettings?: SafetySetting[];
  }

  export interface CandidateContent {
    parts?: ContentPart[];
    [key: string]: unknown;
  }

  export interface Candidate {
    content?: CandidateContent;
    finishReason?: FinishReason;
    safetyRatings?: SafetyRating[];
    [key: string]: unknown;
  }

  export interface GenerateContentResponse {
    text?: string;
    candidates?: Candidate[];
    promptFeedback?: PromptFeedback;
    [key: string]: unknown;
  }

  export class GoogleGenAI {
    constructor(options: { apiKey: string });
    models: {
      generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse>;
    };
  }
}
