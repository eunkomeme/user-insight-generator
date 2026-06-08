"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  FileUp,
  FileText,
  Lightbulb,
  Loader2,
  MessageSquareText,
  Network,
  Sparkles
} from "lucide-react";

type Segment = {
  id: string;
  participant: string;
  question_or_topic: string;
  content: string;
};

type Topic = {
  id: string;
  topic_name: string;
  keywords: string[];
  summary: string;
  segment_ids: string[];
  participant_count: number;
};

type Insight = {
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

type AnalysisResponse = {
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

type RecognitionResponse = {
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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const sampleText = `# SmartThings 요리 경험 인터뷰
P1: 오븐 예열할 때는 앱을 쓰지만 실제로 켜졌는지 확인하기 전까지는 불안해요.
P2: 요리할 때 손에 물이나 기름이 묻어 있어서 폰을 만지는 게 번거로워요.
P3: 자동 조리는 좋아 보이지만 재료 양이나 냉동 상태가 다르면 그대로 믿기 어려워요.
P5: 앱에서 가능한 것과 직접 해야 하는 것이 기기마다 달라서 헷갈려요.`;

export default function Home() {
  const [projectName, setProjectName] = useState("SmartThings 요리 경험 인터뷰");
  const [sourceName, setSourceName] = useState("interview.md");
  const [text, setText] = useState(sampleText);
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [recognition, setRecognition] = useState<RecognitionResponse | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [error, setError] = useState("");

  const segmentById = useMemo(() => {
    const map = new Map<string, Segment>();
    result?.segments.forEach((segment) => map.set(segment.id, segment));
    return map;
  }, [result]);

  async function recognize(selectedFile = file) {
    setRecognizing(true);
    setError("");
    setResult(null);
    setRecognition(null);
    try {
      const response = inputMode === "file" && selectedFile ? await recognizeFile(selectedFile) : await recognizeText();
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? "자료 인식에 실패했습니다.");
      }
      setRecognition(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "자료 인식 중 오류가 발생했습니다.");
    } finally {
      setRecognizing(false);
    }
  }

  async function analyze() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = file ? await analyzeFile(file) : await analyzeText();
      const data = await response.json();
      if (!response.ok) {
        throw new Error(formatErrorMessage(data.detail ?? "분석 요청에 실패했습니다."));
      }
      setResult(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function recognizeText() {
    return fetch(`${API_BASE}/api/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_name: sourceName,
        text
      })
    });
  }

  function recognizeFile(uploadFile: File) {
    const formData = new FormData();
    formData.append("file", uploadFile);
    return fetch(`${API_BASE}/api/parse-upload`, {
      method: "POST",
      body: formData
    });
  }

  function analyzeText() {
    return fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: projectName,
        source_name: sourceName,
        text
      })
    });
  }

  function analyzeFile(uploadFile: File) {
    const formData = new FormData();
    formData.append("project_name", projectName);
    formData.append("file", uploadFile);
    return fetch(`${API_BASE}/api/analyze-upload`, {
      method: "POST",
      body: formData
    });
  }

  function handleFileChange(selectedFile: File | null) {
    setFile(selectedFile);
    setRecognition(null);
    setResult(null);
    if (selectedFile) {
      setSourceName(selectedFile.name);
      recognize(selectedFile);
    }
  }

  const topInsight = result?.analysis.insights[0];
  const canRecognize = inputMode === "file" ? Boolean(file) : Boolean(text.trim());
  const canAnalyze = Boolean(recognition && (file || text.trim()));

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <h1>인사이트 엔진</h1>
          <p>사내용 UX 리서치 워크벤치</p>
        </div>
        <nav>
          <a className="active">인터뷰 분석</a>
          <a>인사이트 검수</a>
          <a>보고서 작성</a>
          <a>설정</a>
        </nav>
        <p className="sidebar-note">텍스트를 넣으면 AI가 구조화하고, 리서처가 판단할 수 있는 인사이트 초안으로 정리합니다.</p>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">인터뷰 분석</span>
            <h2>원자료를 인식한 뒤 인사이트를 도출합니다</h2>
            <p>파일이나 텍스트를 먼저 구조화하고, 화자·섹션·근거 기준을 확인한 다음 AI 분석을 실행합니다.</p>
          </div>
          <button className="ghost-button" disabled type="button">
            <FileText size={18} />
            보고서 초안
          </button>
        </header>

        <section className="input-panel">
          <div className="panel-header">
            <div>
              <h3>1. 분석할 자료 추가</h3>
              <p>속기록 형식은 자유롭게 올릴 수 있습니다. 분석 전, 화자·섹션·발화 단위를 자동 인식한 결과를 먼저 보여드립니다.</p>
            </div>
            <Sparkles className="panel-icon" size={26} />
          </div>

          <div className="mode-tabs" role="tablist">
            <button className={inputMode === "file" ? "active" : ""} onClick={() => setInputMode("file")} type="button">
              파일 업로드
            </button>
            <button className={inputMode === "text" ? "active" : ""} onClick={() => setInputMode("text")} type="button">
              텍스트 직접 입력
            </button>
          </div>

          <div className="field-grid">
            <label>
              프로젝트명
              <input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
            </label>
            <label>
              세션/자료명
              <input value={sourceName} onChange={(event) => setSourceName(event.target.value)} />
            </label>
          </div>

          {inputMode === "file" ? (
            <div className="upload-box">
              <div>
                <FileUp size={20} />
                <div>
                  <strong>{file ? file.name : "파일을 첨부하세요"}</strong>
                  <p>TXT, MD, XLSX를 지원합니다. 파일을 고르면 이 파일만 분석 대상으로 인식합니다.</p>
                </div>
              </div>
              <label className="file-button">
                파일 선택
                <input
                  accept=".txt,.md,.markdown,.xlsx"
                  onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>
              {file ? (
                <button className="text-button" onClick={() => handleFileChange(null)} type="button">
                  첨부 해제
                </button>
              ) : null}
            </div>
          ) : (
            <label>
              직접 입력할 원자료
              <textarea value={text} onChange={(event) => {
                setText(event.target.value);
                setRecognition(null);
                setResult(null);
              }} />
            </label>
          )}

          <button className="secondary-button" disabled={recognizing || !canRecognize} onClick={() => recognize()} type="button">
            {recognizing ? <Loader2 className="spin" size={18} /> : <BadgeCheck size={18} />}
            {recognizing ? "자료 인식 중..." : "자료 인식 결과 확인"}
          </button>

          {recognition ? (
            <section className="recognition-card">
              <div className="recognition-header">
                <div>
                  <span>2. 자료 인식 결과</span>
                  <h3>{recognition.source_name}</h3>
                </div>
                <strong>{recognition.source_type}</strong>
              </div>
              <div className="metric-grid">
                <Metric label="총 발화 단위" value={`${recognition.segment_count}개`} />
                <Metric label="참가자 발화" value={`${recognition.participant_utterance_count}개`} />
                <Metric label="진행자 발화" value={`${recognition.moderator_count}개`} />
                <Metric label="인식된 참가자" value={`${recognition.participant_count}명`} />
              </div>
              <div className="recognition-detail">
                <div>
                  <b>참가자</b>
                  <p>{recognition.participants.length ? recognition.participants.join(", ") : "명확히 인식되지 않음"}</p>
                </div>
                <div>
                  <b>섹션/질문</b>
                  <p>{recognition.topics.length ? recognition.topics.join(", ") : "명확히 인식되지 않음"}</p>
                </div>
              </div>
              <div className="preview-list">
                <b>추출 내용 미리보기</b>
                {recognition.preview_segments.slice(0, 4).map((segment) => (
                  <p key={segment.id}>
                    <strong>{segment.participant}</strong> · {segment.question_or_topic}: {segment.content}
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          <button className="primary-button" disabled={loading || !canAnalyze} onClick={analyze} type="button">
            {loading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            {loading ? "자료를 나눠 읽고 인사이트 후보를 생성하는 중..." : "3. AI 분석 시작"}
          </button>
          {error ? <div className="error-box">{error}</div> : null}
        </section>

        {result ? (
          <section className="results">
            {topInsight ? (
              <div className="conclusion">
                <span>한 줄 결론</span>
                <h3>{topInsight.title}</h3>
                <p>{topInsight.summary}</p>
              </div>
            ) : null}

            <div className="result-grid">
              <section className="left-stack">
                <SectionTitle icon={<Lightbulb size={18} />} title="핵심 인사이트" />
                <div className="insight-grid">
                  {result.analysis.insights.map((insight, index) => (
                    <article className="insight-card" key={insight.id}>
                      <span>{index === 0 ? "핵심" : insight.confidence}</span>
                      <h4>{insight.title}</h4>
                      <p>{insight.interpretation || insight.summary}</p>
                      <strong>권장 조치</strong>
                      <p>{insight.recommendation}</p>
                    </article>
                  ))}
                </div>

                <SectionTitle icon={<MessageSquareText size={18} />} title="근거 발화" />
                <div className="quote-list">
                  {result.analysis.insights.flatMap((insight) =>
                    insight.evidence_segment_ids.slice(0, 2).map((segmentId) => {
                      const segment = segmentById.get(segmentId);
                      if (!segment) return null;
                      return (
                        <article className="quote-card" key={`${insight.id}-${segmentId}`}>
                          <div>
                            <b>{segment.participant}</b>
                            <span>{segment.question_or_topic}</span>
                          </div>
                          <p>{segment.content}</p>
                          <small>AI 해석: {insight.why_it_matters || insight.product_implication || insight.recommendation}</small>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>

              <aside className="right-stack">
                <InfoCard title="분석 개요">
                  <Metric label="정리된 원문" value={`${result.segment_count}개`} />
                  <Metric label="인사이트" value={`${result.analysis.insights.length}개`} />
                  <Metric label="반복 주제" value={`${result.analysis.topics.length}개`} />
                </InfoCard>
                <InfoCard title="주요 키워드">
                  <div className="keyword-list">
                    {result.analysis.keywords.slice(0, 14).map((keyword) => (
                      <span key={keyword.keyword}>{keyword.keyword} · {keyword.count}</span>
                    ))}
                  </div>
                </InfoCard>
                <InfoCard title="다음 단계">
                  <p className="muted">인사이트 검수 화면에서 제목과 권장 조치를 다듬고, 보고서 초안으로 넘기는 흐름을 이어서 만들면 됩니다.</p>
                </InfoCard>
              </aside>
            </div>

            <section className="affinity-section">
              <SectionTitle icon={<Network size={18} />} title="어피니티 다이어그램" />
              <p className="muted">AI가 주제별로 관련 발화를 묶은 초안입니다. 지금은 읽기용 보드이고, 다음 단계에서 드래그/병합을 붙일 수 있습니다.</p>
              <div className="affinity-board">
                {result.analysis.topics.map((topic) => (
                  <article className="affinity-cluster" key={topic.id}>
                    <h4>{topic.topic_name}</h4>
                    <p>{topic.summary}</p>
                    {topic.segment_ids.slice(0, 4).map((segmentId) => {
                      const segment = segmentById.get(segmentId);
                      if (!segment) return null;
                      return (
                        <div className="affinity-note" key={segmentId}>
                          <strong>{segment.participant} · {segment.question_or_topic}</strong>
                          <span>{segment.content}</span>
                        </div>
                      );
                    })}
                  </article>
                ))}
              </div>
            </section>
          </section>
        ) : (
          <section className="empty-state">
            <BadgeCheck size={22} />
            <h3>결과는 분석 후 바로 이곳에 표시됩니다</h3>
            <p>한 줄 결론, 핵심 인사이트, 근거 발화, 어피니티 다이어그램 순서로 보여줍니다.</p>
            <ArrowRight size={18} />
          </section>
        )}
      </section>
    </main>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="section-title">
      {icon}
      <h3>{title}</h3>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="info-card">
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatErrorMessage(message: string) {
  if (message.includes("tokens per day") || message.includes("TPD")) {
    return "오늘 Groq 무료 사용량을 거의 다 써서 분석을 더 진행할 수 없습니다. 잠시 후 다시 시도하거나 다른 API 키/모델을 사용해야 합니다.";
  }
  if (message.includes("tokens per minute") || message.includes("TPM")) {
    return "현재 요청이 무료 모델의 분당 토큰 한도를 넘었습니다. 자료는 나눠 처리하고 있지만 잠시 후 다시 시도해야 합니다.";
  }
  return message;
}
