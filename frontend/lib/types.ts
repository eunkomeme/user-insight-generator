export type Segment = {
  id: string;
  participant: string;
  question_or_topic: string;
  content: string;
};

export type Topic = {
  id: string;
  topic_name: string;
  keywords: string[];
  summary: string;
  segment_ids: string[];
  participant_count: number;
};

export type Insight = {
  id: string;
  title: string;
  summary: string;
  recommendation: string;
  interpretation?: string;
  why_it_matters?: string;
  product_implication?: string;
  topic_ids: string[];
  evidence_segment_ids: string[];
  participants: string[];
  confidence: string;
  status: string;
};

export type ReviewStatus = "승인" | "수정 필요" | "제외";

export type ReviewedInsight = Insight & {
  reviewStatus: ReviewStatus;
};

export type AnalysisResponse = {
  project_name: string;
  source_name: string;
  segment_count: number;
  segments: Segment[];
  analysis: {
    keywords: { keyword: string; count: number }[];
    topics: Topic[];
    insights: Insight[];
    participant_mentions: Record<string, number>;
  };
  warnings: string[];
};

export type RecognitionResponse = {
  source_name: string;
  source_type: string;
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

export type DraftState = {
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
