export type Segment = {
  id: string;
  participant: string;
  question_or_topic: string;
  content: string;
};

export type Insight = {
  id: string;
  type: string;
  title: string;
  summary: string;
  severity: string;
  frequency: string;
  recommendation: string;
  interpretation?: string;
  why_it_matters?: string;
  product_implication?: string;
  topic_ids?: string[];
  evidence_segment_ids?: string[];
  participants?: string[];
  related_tasks: string[];
  related_participants: string[];
  supporting_quotes: {
    quote: string;
    participant: string;
    source_id: string;
  }[];
  confidence: string;
  status: string;
};

export type InsightRelationship = {
  from_id: string;
  to_id: string;
  label: string;
};

export type Citation = {
  source_id: string;
  source_name: string;
  segment_id: string;
  participant: string;
  quote: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

export type FindingStatus = "auto_included" | "needs_attention" | "hidden" | "edited" | "pinned";
export type RiskFlag = "weak_evidence" | "overgeneralized" | "duplicate_candidate";

export type ReviewedInsight = Insight & {
  findingStatus: FindingStatus;
  riskFlags: RiskFlag[];
};

export type ProjectSummary = {
  slug: string;
  name: string;
  project_name?: string;
  research_goal?: string;
  product_or_feature?: string;
  participant_count?: number;
  tasks?: string[];
  evaluation_criteria?: string[];
  created_at?: string;
  updated_at?: string;
  path?: string;
};

export type AnalysisResponse = {
  project_name: string;
  source?: SourceRecord;
  source_name: string;
  segment_count: number;
  segments: Segment[];
  analysis: {
    insights: Insight[];
    participant_mentions: Record<string, number>;
    relationships?: InsightRelationship[];
  };
  quantitative_summary?: Record<string, unknown> | null;
  warnings: string[];
  recognition?: RecognitionResponse | null;
};

export type RecognitionResponse = {
  source_name: string;
  source_type: string;
  detected_label?: string;
  segment_count: number;
  participant_count: number;
  participants: string[];
  moderator_count: number;
  participant_utterance_count: number;
  topic_count: number;
  topics: string[];
  short_utterance_count: number;
  warnings: string[];
  preview_segments: Segment[];
  analysis_policy: {
    moderator_excluded_from_evidence: boolean;
    evidence_required: boolean;
    pain_point_and_insight_separated: boolean;
    participant_comparison: boolean;
    system_prompt_version: string;
  };
};

export type SourceRecord = {
  id: string;
  name: string;
  source_type: string;
  status: string;
  detected_label: string;
  raw_path: string;
  segment_count: number;
  participant_count: number;
  insight_count: number;
  warnings: string[];
  created_at: string;
  updated_at: string;
};

export type DraftState = {
  activeProjectSlug?: string;
  selectedSourceId?: string;
  projectName: string;
  sourceName: string;
  text: string;
  inputMode: "file" | "text";
  researchGoal: string;
  tasksText: string;
  evaluationCriteriaText: string;
  recognition: RecognitionResponse | null;
  result: AnalysisResponse | null;
  reviewedInsights: ReviewedInsight[];
  segmentTopicOverrides: Record<string, string>;
  savedAt: string;
};
