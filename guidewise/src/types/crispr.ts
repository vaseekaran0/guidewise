import type { DnaStats, GuideAnalysisResult, HypotheticalEditResult, PamType, SiteMatch } from '../shared/crisprEngine.js';

export type AppPage = 'landing' | 'simulator' | 'compare' | 'lab' | 'learn' | 'reports' | 'about';

export interface ExampleItem {
  id: number;
  name: string;
  type: 'positive' | 'negative' | 'invalid';
  dna: string;
  guide: string;
  pam: PamType;
  max_mm: number;
  notes: string;
}

export interface AnalyzeApiResponse {
  runId: number;
  dna: string;
  pam: PamType;
  max_mm: number;
  stats: DnaStats;
  resultsByGuide: GuideAnalysisResult[];
  guide: string;
  sites: SiteMatch[];
  summary: GuideAnalysisResult['summary'];
  disclaimer: string;
}

export interface RunSummaryItem {
  id: number;
  created_at: string;
  dna_length: number;
  pam: PamType;
  max_mm: number;
  guide_count: number;
  guides: string;
  total_sites: number;
  best_score: number;
}

export interface StoredRunResponse {
  id: number;
  created_at: string;
  dna: string;
  pam: PamType;
  max_mm: number;
  stats: DnaStats;
  guides: Array<{
    id: number;
    sequence: string;
    sites: Array<{
      id: number;
      strand: '+' | '-';
      start: number;
      end: number;
      mismatches: number;
      mismatch_positions: number[];
      pam: string;
      pam_ok: boolean;
      score: number;
      cut: number;
    }>;
  }>;
  disclaimer: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: 'kb-gemini' | 'kb-deterministic' | 'safety-refusal';
  sources?: string[];
  timestamp: string;
}

export type { DnaStats, GuideAnalysisResult, HypotheticalEditResult, PamType, SiteMatch };
