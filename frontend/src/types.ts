export interface Category {
  id: number;
  code: string;
  name: string;
  description: string | null;
  imagePath: string | null;
  sortOrder: number;
  isActive: boolean;
  failureTypeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FailureType {
  id: number;
  code: string;
  categoryId: number;
  categoryName?: string;
  name: string;
  description: string | null;
  imagePath: string | null;
  sortOrder: number;
  isActive: boolean;
  rootCauseCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type StepType = 'step' | 'check';
export type MediaKind = 'OK' | 'NG';

export interface RootCauseStep {
  id: number;
  stepNo: number;
  instruction: string;
  type: StepType;
}

export interface Media {
  id: number;
  kind: MediaKind;
  filePath: string;
  caption: string | null;
}

export interface RootCause {
  id: number;
  code: string;
  failureTypeId: number;
  title: string;
  description: string | null;
  rank: number;
  isActive: boolean;
  steps?: RootCauseStep[];
  media?: Media[];
  createdAt: string;
  updatedAt: string;
}

export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

export interface Suggestion {
  id: number;
  failureTypeId: number;
  failureTypeName?: string;
  text: string;
  photoPath: string | null;
  status: SuggestionStatus;
  adminComment: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface DashboardCounters {
  categories: number;
  failureTypes: number;
  rootCauses: number;
  pendingSuggestions: number;
}

export interface SiteSettings {
  siteName: string;
  slogan: string;
  logoPath: string | null;
  logoScale: number;
}

export interface AssistantSource {
  label: string;
  sublabel?: string;
  url: string;
}

export interface AssistantResponse {
  matched: boolean;
  answer: string;
  sources: AssistantSource[];
  suggestions?: { label: string; url: string }[];
}
