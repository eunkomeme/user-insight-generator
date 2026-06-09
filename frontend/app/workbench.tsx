"use client";

import type { DragEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  CircleSlash,
  ClipboardCheck,
  Download,
  FileText,
  FileUp,
  Layers3,
  Loader2,
  MessageSquareText,
  Network,
  Sparkles,
  Wand2
} from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { cn } from "../lib/utils";
import type {
  AnalysisResponse,
  DraftState,
  Insight,
  RecognitionResponse,
  ReviewedInsight,
  ReviewStatus,
  Segment,
  Topic,
} from "../lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const DRAFT_STORAGE_KEY = "ux-research-workbench:draft:v1";

const sampleText = `# SmartThings 요리 경험 인터뷰
P1: 오븐 예열할 때는 앱을 쓰지만 실제로 켜졌는지 확인하기 전까지는 불안해요.
P2: 요리할 때 손에 물이나 기름이 묻어 있어서 폰을 만지는 게 번거로워요.
P3: 자동 조리는 좋아 보이지만 재료 양이나 냉동 상태가 다르면 그대로 믿기 어려워요.
P5: 앱에서 가능한 것과 직접 해야 하는 것이 기기마다 달라서 헷갈려요.`;

const steps = [
  { id: "input", label: "자료 추가", description: "파일 또는 텍스트" },
  { id: "recognize", label: "자료 인식", description: "화자와 섹션 확인" },
  { id: "analyze", label: "AI 분석", description: "인사이트 후보 생성" },
  { id: "review", label: "인사이트 검수", description: "승인/수정/제외" },
  { id: "report", label: "보고서 초안", description: "승인 항목 반영" }
] as const;

const analysisStages = [
  "파일 내용을 읽고 있습니다",
  "발화 단위를 정리하고 있습니다",
  "반복 주제를 찾고 있습니다",
  "근거 발화를 연결하고 있습니다",
  "인사이트 후보를 통합하고 있습니다",
  "보고서 초안에 맞게 정리하고 있습니다"
];

export default function Home() {
  const [projectName, setProjectName] = useState("SmartThings 요리 경험 인터뷰");
  const [sourceName, setSourceName] = useState("interview.md");
  const [text, setText] = useState(sampleText);
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [researchGoal, setResearchGoal] = useState("사용자가 스마트홈 요리 제어 기능을 어떤 맥락에서 신뢰하거나 불신하는지 파악한다.");
  const [tasksText, setTasksText] = useState("오븐 예열 상태 확인\n요리 중 앱 조작\n자동 조리 설정 신뢰 판단");
  const [evaluationCriteriaText, setEvaluationCriteriaText] = useState("신뢰 형성/저해 요인\n조작 맥락의 마찰\n기능 기대와 실제 사용 조건의 간극");
  const [file, setFile] = useState<File | null>(null);
  const [recognition, setRecognition] = useState<RecognitionResponse | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [reviewedInsights, setReviewedInsights] = useState<ReviewedInsight[]>([]);
  const [segmentTopicOverrides, setSegmentTopicOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [analysisStageIndex, setAnalysisStageIndex] = useState(0);
  const [recognizing, setRecognizing] = useState(false);
  const [error, setError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draftRestoredRef = useRef(false);
  const suppressNextSaveRef = useRef(false);

  const segmentById = useMemo(() => {
    const map = new Map<string, Segment>();
    result?.segments.forEach((segment) => map.set(segment.id, segment));
    return map;
  }, [result]);

  const approvedInsights = useMemo(
    () => reviewedInsights.filter((insight) => insight.reviewStatus === "승인"),
    [reviewedInsights]
  );
  const needsReviewCount = reviewedInsights.filter((insight) => insight.reviewStatus === "수정 필요").length;
  const activeStep = result ? "review" : recognition ? "analyze" : "input";
  const canRecognize = inputMode === "file" ? Boolean(file) : Boolean(text.trim());
  const canAnalyze = Boolean(recognition && (inputMode === "file" ? file : text.trim()));
  const reportMarkdown = useMemo(
    () => buildReportMarkdown(projectName, recognition, result, approvedInsights, segmentById),
    [projectName, recognition, result, approvedInsights, segmentById]
  );

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!rawDraft) {
        draftRestoredRef.current = true;
        return;
      }
      const draft = JSON.parse(rawDraft) as Partial<DraftState>;
      if (draft.projectName) setProjectName(draft.projectName);
      if (draft.sourceName) setSourceName(draft.sourceName);
      if (typeof draft.text === "string") setText(draft.text);
      if (draft.inputMode === "file" || draft.inputMode === "text") setInputMode(draft.inputMode);
      if (typeof draft.researchGoal === "string") setResearchGoal(draft.researchGoal);
      if (typeof draft.tasksText === "string") setTasksText(draft.tasksText);
      if (typeof draft.evaluationCriteriaText === "string") setEvaluationCriteriaText(draft.evaluationCriteriaText);
      setRecognition(draft.recognition ?? null);
      setResult(draft.result ?? null);
      setReviewedInsights(draft.reviewedInsights ?? []);
      setSegmentTopicOverrides(draft.segmentTopicOverrides ?? {});
      setLastSavedAt(draft.savedAt ?? "");
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } finally {
      draftRestoredRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!draftRestoredRef.current) return;
    if (suppressNextSaveRef.current) {
      suppressNextSaveRef.current = false;
      return;
    }
    const savedAt = new Date().toISOString();
    const draft: DraftState = {
      projectName,
      sourceName,
      text,
      inputMode,
      researchGoal,
      tasksText,
      evaluationCriteriaText,
      recognition,
      result,
      reviewedInsights,
      segmentTopicOverrides,
      savedAt
    };
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setLastSavedAt(savedAt);
    } catch {
      setError("브라우저 임시 저장 공간이 부족합니다. 보고서 Markdown을 다운로드하거나 임시 저장을 삭제해주세요.");
    }
  }, [evaluationCriteriaText, inputMode, projectName, recognition, researchGoal, result, reviewedInsights, segmentTopicOverrides, sourceName, tasksText, text]);

  async function recognize(selectedFile = file) {
    setRecognizing(true);
    setError("");
    setResult(null);
    setReviewedInsights([]);
    setSegmentTopicOverrides({});
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
    setAnalysisStageIndex(0);
    setError("");
    setResult(null);
    setReviewedInsights([]);
    setSegmentTopicOverrides({});
    const stageTimer = window.setInterval(() => {
      setAnalysisStageIndex((current) => Math.min(current + 1, analysisStages.length - 1));
    }, 2500);
    try {
      const response = inputMode === "file" && file ? await analyzeFile(file) : await analyzeText();
      const data = await response.json();
      if (!response.ok) {
        throw new Error(formatErrorMessage(data.detail ?? "분석 요청에 실패했습니다."));
      }
      setResult(data);
      setReviewedInsights(
        data.analysis.insights.map((insight: Insight) => ({
          ...insight,
          reviewStatus: "수정 필요"
        }))
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "분석 중 오류가 발생했습니다.");
    } finally {
      window.clearInterval(stageTimer);
      setLoading(false);
    }
  }

  function recognizeText() {
    return fetch(`${API_BASE}/api/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_name: sourceName, text })
    });
  }

  function recognizeFile(uploadFile: File) {
    const formData = new FormData();
    formData.append("file", uploadFile);
    return fetch(`${API_BASE}/api/parse-upload`, { method: "POST", body: formData });
  }

  function analyzeText() {
    return fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: projectName,
        source_name: sourceName,
        text,
        research_goal: researchGoal,
        tasks: splitTextareaLines(tasksText),
        evaluation_criteria: splitTextareaLines(evaluationCriteriaText)
      })
    });
  }

  function analyzeFile(uploadFile: File) {
    const formData = new FormData();
    formData.append("project_name", projectName);
    formData.append("research_goal", researchGoal);
    formData.append("tasks", tasksText);
    formData.append("evaluation_criteria", evaluationCriteriaText);
    formData.append("file", uploadFile);
    return fetch(`${API_BASE}/api/analyze-upload`, { method: "POST", body: formData });
  }

  function handleFileChange(selectedFile: File | null) {
    setFile(selectedFile);
    setRecognition(null);
    setResult(null);
    setReviewedInsights([]);
    setSegmentTopicOverrides({});
    setError("");
    if (selectedFile) {
      setSourceName(selectedFile.name);
      recognize(selectedFile);
    }
  }

  function changeInputMode(nextMode: "file" | "text") {
    setInputMode(nextMode);
    setRecognition(null);
    setResult(null);
    setReviewedInsights([]);
    setSegmentTopicOverrides({});
    setError("");
  }

  function updateInsight(insightId: string, updates: Partial<ReviewedInsight>) {
    setReviewedInsights((current) =>
      current.map((insight) => (insight.id === insightId ? { ...insight, ...updates } : insight))
    );
  }

  function clearDraft() {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    suppressNextSaveRef.current = true;
    setProjectName("SmartThings 요리 경험 인터뷰");
    setSourceName("interview.md");
    setText(sampleText);
    setInputMode("file");
    setResearchGoal("사용자가 스마트홈 요리 제어 기능을 어떤 맥락에서 신뢰하거나 불신하는지 파악한다.");
    setTasksText("오븐 예열 상태 확인\n요리 중 앱 조작\n자동 조리 설정 신뢰 판단");
    setEvaluationCriteriaText("신뢰 형성/저해 요인\n조작 맥락의 마찰\n기능 기대와 실제 사용 조건의 간극");
    setFile(null);
    setRecognition(null);
    setResult(null);
    setReviewedInsights([]);
    setSegmentTopicOverrides({});
    setError("");
    setLastSavedAt("");
  }

  return (
    <main className="min-h-screen text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <Sidebar
          activeStep={activeStep}
          approvedCount={approvedInsights.length}
          needsReviewCount={needsReviewCount}
          projectName={projectName}
        />

        <section className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <WorkbenchHeader
            approvedCount={approvedInsights.length}
            canDownload={Boolean(reportMarkdown)}
            lastSavedAt={lastSavedAt}
            onClearDraft={clearDraft}
            onDownload={() => downloadMarkdown(reportMarkdown)}
            recognition={recognition}
            result={result}
          />

          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid min-w-0 gap-5">
              <InputPanel
                canRecognize={canRecognize}
                file={file}
                fileInputRef={fileInputRef}
                inputMode={inputMode}
                onFileChange={handleFileChange}
                onModeChange={changeInputMode}
                onRecognize={() => recognize()}
                projectName={projectName}
                researchGoal={researchGoal}
                recognizing={recognizing}
                setEvaluationCriteriaText={setEvaluationCriteriaText}
                setProjectName={setProjectName}
                setResearchGoal={setResearchGoal}
                setSourceName={setSourceName}
                setTasksText={setTasksText}
                setText={setText}
                sourceName={sourceName}
                tasksText={tasksText}
                text={text}
                evaluationCriteriaText={evaluationCriteriaText}
              />

              <AnimatePresence mode="popLayout">
                {recognition ? (
                  <MotionBlock key="recognition">
                    <RecognitionPanel recognition={recognition} />
                  </MotionBlock>
                ) : null}

                {error ? (
                  <MotionBlock key="error">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800">
                      {error}
                    </div>
                  </MotionBlock>
                ) : null}

                {result ? (
                  <MotionBlock key="results">
	                    <AnalysisWorkspace
	                      approvedInsights={approvedInsights}
	                      needsReviewCount={needsReviewCount}
	                      onMoveSegment={(segmentId, topicId) =>
	                        setSegmentTopicOverrides((current) => ({
	                          ...current,
	                          [segmentId]: topicId
	                        }))
	                      }
	                      onUpdateInsight={updateInsight}
	                      result={result}
	                      reviewedInsights={reviewedInsights}
	                      segmentById={segmentById}
	                      segmentTopicOverrides={segmentTopicOverrides}
	                    />
                  </MotionBlock>
                ) : (
                  <MotionBlock key="empty">
                    <EmptyAnalysisState analysisStage={analysisStages[analysisStageIndex]} canAnalyze={canAnalyze} loading={loading} onAnalyze={analyze} />
                  </MotionBlock>
                )}

                {result ? (
                  <MotionBlock key="report">
                    <ReportPanel
                      approvedInsights={approvedInsights}
                      onDownload={() => downloadMarkdown(reportMarkdown)}
                      recognition={recognition}
                      reportMarkdown={reportMarkdown}
                      result={result}
                    />
                  </MotionBlock>
                ) : null}
              </AnimatePresence>
            </div>

            <aside className="grid h-fit gap-5">
              <ActionPanel analysisStage={analysisStages[analysisStageIndex]} canAnalyze={canAnalyze} loading={loading} onAnalyze={analyze} recognition={recognition} result={result} />
              <SupportPanel result={result} />
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function Sidebar({
  activeStep,
  approvedCount,
  needsReviewCount,
  projectName
}: {
  activeStep: string;
  approvedCount: number;
  needsReviewCount: number;
  projectName: string;
}) {
  return (
    <aside className="border-b border-slate-200 bg-white/80 px-5 py-5 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
      <div className="flex items-start justify-between gap-4 lg:block">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <Wand2 size={18} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">인사이트 엔진</h1>
              <p className="text-xs font-semibold text-slate-500">UX Research Workbench</p>
            </div>
          </div>
          <div className="mt-6 hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:block">
            <p className="text-xs font-bold text-slate-500">현재 프로젝트</p>
            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-900">{projectName}</p>
          </div>
        </div>
        <Badge variant={approvedCount ? "green" : "muted"}>{approvedCount ? `승인 ${approvedCount}` : "초안"}</Badge>
      </div>

      <nav className="mt-6 grid gap-2">
        {steps.map((step, index) => {
          const isActive = step.id === activeStep || (activeStep === "review" && step.id === "review");
          return (
            <div
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-3 py-3 transition",
                isActive ? "border-slate-300 bg-white shadow-sm" : "border-transparent text-slate-500"
              )}
              key={step.id}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-black",
                  isActive ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"
                )}
              >
                {index + 1}
              </span>
              <span>
                <span className="block text-sm font-bold">{step.label}</span>
                <span className="text-xs">{step.description}</span>
              </span>
            </div>
          );
        })}
      </nav>

      <div className="mt-8 hidden border-t border-slate-200 pt-5 text-sm text-slate-500 lg:block">
        <p>인사이트는 먼저 검수하고, 승인된 항목만 보고서에 반영됩니다.</p>
        {needsReviewCount ? <p className="mt-3 font-semibold text-amber-700">검수 대기 {needsReviewCount}개</p> : null}
      </div>
    </aside>
  );
}

function WorkbenchHeader({
  approvedCount,
  canDownload,
  lastSavedAt,
  onClearDraft,
  onDownload,
  recognition,
  result
}: {
  approvedCount: number;
  canDownload: boolean;
  lastSavedAt: string;
  onClearDraft: () => void;
  onDownload: () => void;
  recognition: RecognitionResponse | null;
  result: AnalysisResponse | null;
}) {
  const helper = result
    ? "생성된 인사이트를 검수하고 승인된 항목으로 보고서 초안을 다듬으세요."
    : recognition
      ? "자료 구조가 확인되었습니다. 이제 AI 분석을 실행할 수 있습니다."
      : "리서치 원자료를 추가하면 화자와 섹션을 먼저 인식합니다.";
  return (
    <header className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm shadow-slate-200/60 backdrop-blur sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="blue">사내용 워크벤치</Badge>
            <Badge variant={result ? "green" : recognition ? "amber" : "muted"}>
              {result ? "분석 완료" : recognition ? "자료 인식 완료" : "자료 대기"}
            </Badge>
            <Badge variant="muted">{lastSavedAt ? `자동 저장 ${formatSavedTime(lastSavedAt)}` : "자동 저장 준비"}</Badge>
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">리서치 원자료를 실무 보고서로 정리합니다</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{helper}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onClearDraft} variant="ghost">
            임시 저장 삭제
          </Button>
          <Button disabled={!canDownload} onClick={onDownload} variant="secondary">
            <Download size={18} />
            보고서 다운로드
          </Button>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold text-slate-500">승인된 인사이트</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{approvedCount}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function InputPanel({
  canRecognize,
  evaluationCriteriaText,
  file,
  fileInputRef,
  inputMode,
  onFileChange,
  onModeChange,
  onRecognize,
  projectName,
  researchGoal,
  recognizing,
  setEvaluationCriteriaText,
  setProjectName,
  setResearchGoal,
  setSourceName,
  setTasksText,
  setText,
  sourceName,
  tasksText,
  text
}: {
  canRecognize: boolean;
  evaluationCriteriaText: string;
  file: File | null;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  inputMode: "file" | "text";
  onFileChange: (file: File | null) => void;
  onModeChange: (mode: "file" | "text") => void;
  onRecognize: () => void;
  projectName: string;
  researchGoal: string;
  recognizing: boolean;
  setEvaluationCriteriaText: (value: string) => void;
  setProjectName: (value: string) => void;
  setResearchGoal: (value: string) => void;
  setSourceName: (value: string) => void;
  setTasksText: (value: string) => void;
  setText: (value: string) => void;
  sourceName: string;
  tasksText: string;
  text: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionKicker icon={<FileUp size={16} />} label="1. 자료 추가" />
          <h3 className="mt-2 text-lg font-black">분석할 원자료를 올려주세요</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">파일을 올리거나 텍스트를 붙여넣으면, 분석 전에 자료가 어떻게 인식됐는지 먼저 보여드립니다.</p>
        </div>
        <Tabs onValueChange={(value) => onModeChange(value as "file" | "text")} value={inputMode}>
          <TabsList>
            <TabsTrigger value="file">파일</TabsTrigger>
            <TabsTrigger value="text">텍스트</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="프로젝트명">
            <Input onChange={(event) => setProjectName(event.target.value)} value={projectName} />
          </Field>
          <Field label="세션/자료명">
            <Input onChange={(event) => setSourceName(event.target.value)} value={sourceName} />
          </Field>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-black text-slate-950">분석 맥락</p>
            <p className="text-sm leading-6 text-slate-500">연구 목적과 태스크를 넣으면 AI가 같은 발화도 더 정확한 리서치 관점으로 해석합니다.</p>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Field label="연구 목적">
              <Textarea className="min-h-28 bg-white" onChange={(event) => setResearchGoal(event.target.value)} value={researchGoal} />
            </Field>
            <Field label="평가 태스크">
              <Textarea className="min-h-28 bg-white" onChange={(event) => setTasksText(event.target.value)} value={tasksText} />
            </Field>
            <Field label="평가 기준">
              <Textarea className="min-h-28 bg-white" onChange={(event) => setEvaluationCriteriaText(event.target.value)} value={evaluationCriteriaText} />
            </Field>
          </div>
        </div>

        <Tabs value={inputMode}>
          <TabsContent value="file">
            <div
              className={cn(
                "group rounded-3xl border border-dashed p-8 transition",
                file ? "border-blue-200 bg-blue-50/60" : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white"
              )}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                onFileChange(event.dataTransfer.files?.[0] ?? null);
              }}
            >
              <input
                accept=".txt,.md,.markdown,.xlsx"
                className="hidden"
                onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
                ref={fileInputRef}
                type="file"
              />
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">
                    <FileText size={22} />
                  </div>
                  <div>
                    <p className="text-base font-black text-slate-950">{file ? file.name : "파일을 끌어오거나 선택하세요"}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">TXT, Markdown, XLSX 파일을 지원합니다. 파일을 올리면 이 파일만 분석 대상으로 사용합니다.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => fileInputRef.current?.click()} type="button" variant="secondary">
                    파일 선택
                  </Button>
                  {file ? (
                    <Button onClick={() => onFileChange(null)} type="button" variant="ghost">
                      해제
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="text">
            <Field label="직접 입력할 원자료">
              <Textarea
                className="min-h-64"
                onChange={(event) => setText(event.target.value)}
                value={text}
              />
            </Field>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">먼저 자료 인식 결과를 확인합니다</p>
            <p className="mt-1 text-sm text-slate-500">AI 분석 전에 발화 단위, 참가자, 섹션을 확인할 수 있습니다.</p>
          </div>
          <Button disabled={recognizing || !canRecognize} onClick={onRecognize} type="button">
            {recognizing ? <Loader2 className="animate-spin" size={18} /> : <BadgeCheck size={18} />}
            자료 인식 결과 확인
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RecognitionPanel({ recognition }: { recognition: RecognitionResponse }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-slate-950 text-white">
        <SectionKicker icon={<Layers3 size={16} />} label="2. 자료 인식 결과" tone="dark" />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-black">{recognition.source_name}</h3>
            <p className="mt-1 text-sm text-slate-300">이 자료를 {recognition.source_type} 자료로 인식했습니다.</p>
          </div>
          <Badge variant="blue">{recognition.participant_count || "?"}명 참가자</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="총 발화 단위" value={`${recognition.segment_count}개`} />
          <MetricCard label="분석 대상 발화" value={`${recognition.participant_utterance_count}개`} />
          <MetricCard label="진행자 발화" value={`${recognition.moderator_count}개`} />
          <MetricCard label="섹션/질문" value={`${recognition.topic_count}개`} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <InfoBox title="인식된 참가자" value={recognition.participants.length ? recognition.participants.join(", ") : "명확히 인식되지 않음"} />
          <InfoBox title="주요 섹션/질문" value={recognition.topics.length ? recognition.topics.join(", ") : "명확히 인식되지 않음"} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-950">추출 내용 미리보기</p>
          <div className="mt-3 grid gap-2">
            {recognition.preview_segments.slice(0, 5).map((segment) => (
              <p className="rounded-xl bg-white px-3 py-2 text-sm leading-6 text-slate-600" key={segment.id}>
                <strong className="text-slate-950">{segment.participant}</strong> · {segment.question_or_topic}: {segment.content}
              </p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyAnalysisState({
  analysisStage,
  canAnalyze,
  loading,
  onAnalyze
}: {
  analysisStage: string;
  canAnalyze: boolean;
  loading: boolean;
  onAnalyze: () => void;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <Sparkles size={24} />
        </div>
        <h3 className="mt-4 text-lg font-black">분석 결과가 이곳에 정리됩니다</h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">자료 인식 후 AI 분석을 시작하면 핵심 결론, 검수 가능한 인사이트, 보고서 초안이 순서대로 생성됩니다.</p>
        {loading ? (
          <div className="mt-5 w-full max-w-md rounded-2xl bg-slate-50 p-4 text-left">
            <p className="text-sm font-bold text-slate-900">{analysisStage}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <motion.div className="h-full rounded-full bg-slate-950" initial={{ width: "12%" }} animate={{ width: "88%" }} transition={{ duration: 2.2, repeat: Infinity, repeatType: "reverse" }} />
            </div>
          </div>
        ) : null}
        {canAnalyze ? (
          <Button className="mt-5" disabled={loading} onClick={onAnalyze}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            AI 분석 시작
          </Button>
        ) : (
          <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            먼저 자료를 추가하고 인식 결과를 확인하세요.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionPanel({
  analysisStage,
  canAnalyze,
  loading,
  onAnalyze,
  recognition,
  result
}: {
  analysisStage: string;
  canAnalyze: boolean;
  loading: boolean;
  onAnalyze: () => void;
  recognition: RecognitionResponse | null;
  result: AnalysisResponse | null;
}) {
  return (
    <Card className="sticky top-6">
      <CardContent>
        <SectionKicker icon={<Sparkles size={16} />} label="다음 액션" />
        <h3 className="mt-3 text-lg font-black">{result ? "인사이트를 검수하세요" : recognition ? "AI 분석을 시작할 수 있습니다" : "자료를 먼저 추가하세요"}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {result ? "승인한 인사이트만 보고서 초안에 반영됩니다." : recognition ? "분석은 원자료를 나눠 읽고 근거 발화를 연결합니다." : "파일 업로드 또는 텍스트 입력 후 자료 인식 결과를 확인하세요."}
        </p>
        {recognition && !result ? (
          <Button className="mt-5 w-full" disabled={!canAnalyze || loading} onClick={onAnalyze}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
            {loading ? "인사이트 후보 생성 중" : "AI 분석 시작"}
          </Button>
        ) : (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
            {result ? "검수 카드에서 승인 여부를 결정하세요." : "먼저 자료 인식 결과 확인을 진행하세요."}
          </div>
        )}
        {loading ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">현재 처리 단계</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{analysisStage}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SupportPanel({ result }: { result: AnalysisResponse | null }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-black">보조 탐색</h3>
      </CardHeader>
      <CardContent className="grid gap-4">
        {result ? (
          <>
            <div>
              <p className="text-xs font-bold text-slate-500">주요 키워드</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.analysis.keywords.slice(0, 16).map((keyword) => (
                  <Badge key={keyword.keyword} variant="blue">
                    {keyword.keyword} · {keyword.count}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">주제 묶음</p>
              <div className="mt-2 grid gap-2">
                {result.analysis.topics.slice(0, 4).map((topic) => (
                  <div className="rounded-xl bg-slate-50 p-3" key={topic.id}>
                    <p className="text-sm font-bold">{topic.topic_name}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{topic.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm leading-6 text-slate-500">분석이 완료되면 키워드와 주제 묶음이 이곳에 표시됩니다.</p>
        )}
      </CardContent>
    </Card>
  );
}

function AnalysisWorkspace({
  approvedInsights,
  needsReviewCount,
  onMoveSegment,
  onUpdateInsight,
  result,
  reviewedInsights,
  segmentById,
  segmentTopicOverrides
}: {
  approvedInsights: ReviewedInsight[];
  needsReviewCount: number;
  onMoveSegment: (segmentId: string, topicId: string) => void;
  onUpdateInsight: (insightId: string, updates: Partial<ReviewedInsight>) => void;
  result: AnalysisResponse;
  reviewedInsights: ReviewedInsight[];
  segmentById: Map<string, Segment>;
  segmentTopicOverrides: Record<string, string>;
}) {
  const topInsight = result.analysis.insights[0];
  return (
    <div className="grid gap-5">
      <Card className="overflow-hidden">
        <CardContent className="bg-slate-950 p-6 text-white">
          <Badge variant="blue">핵심 결론</Badge>
          <h3 className="mt-4 text-2xl font-black leading-tight">{topInsight?.title || "핵심 결론 생성 대기"}</h3>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">{topInsight?.summary || "분석 결과에서 핵심 결론을 찾지 못했습니다."}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MetricCard dark label="검수 대기" value={`${needsReviewCount}개`} />
            <MetricCard dark label="승인" value={`${approvedInsights.length}개`} />
            <MetricCard dark label="원문 단위" value={`${result.segment_count}개`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionKicker icon={<ClipboardCheck size={16} />} label="3. 인사이트 검수" />
          <h3 className="mt-2 text-lg font-black">보고서에 넣을 인사이트를 승인하세요</h3>
        </CardHeader>
        <CardContent className="grid gap-4">
          {reviewedInsights.map((insight, index) => (
            <InsightReviewCard
              index={index}
              insight={insight}
              key={insight.id}
              onUpdateInsight={onUpdateInsight}
              segmentById={segmentById}
            />
          ))}
        </CardContent>
      </Card>

      <AffinityBoard onMoveSegment={onMoveSegment} result={result} segmentById={segmentById} segmentTopicOverrides={segmentTopicOverrides} />
    </div>
  );
}

function InsightReviewCard({
  index,
  insight,
  onUpdateInsight,
  segmentById
}: {
  index: number;
  insight: ReviewedInsight;
  onUpdateInsight: (insightId: string, updates: Partial<ReviewedInsight>) => void;
  segmentById: Map<string, Segment>;
}) {
  const evidencePreview = insight.evidence_segment_ids
    .map((segmentId) => segmentById.get(segmentId))
    .find(Boolean);
  return (
    <motion.article
      className={cn(
        "rounded-2xl border bg-white p-4 shadow-sm transition",
        insight.reviewStatus === "승인" && "border-emerald-200 bg-emerald-50/30",
        insight.reviewStatus === "수정 필요" && "border-amber-200",
        insight.reviewStatus === "제외" && "border-slate-200 opacity-65"
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">{index + 1}</span>
          <Badge variant={insight.reviewStatus === "승인" ? "green" : insight.reviewStatus === "제외" ? "muted" : "amber"}>
            {insight.reviewStatus}
          </Badge>
        </div>
        <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-500">
          {(["승인", "수정 필요", "제외"] as ReviewStatus[]).map((status) => (
            <button
              className={cn(
                "flex items-center justify-center gap-1 rounded-lg px-3 py-2 transition",
                insight.reviewStatus === status && "bg-white text-slate-950 shadow-sm"
              )}
              key={status}
              onClick={() => onUpdateInsight(insight.id, { reviewStatus: status })}
              type="button"
            >
              {status === "승인" ? <CheckCircle2 size={14} /> : status === "제외" ? <CircleSlash size={14} /> : null}
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <h4 className="text-lg font-black leading-7 text-slate-950">{insight.title}</h4>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{insight.interpretation || insight.summary}</p>
        {evidencePreview ? (
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            <strong className="text-slate-950">{evidencePreview.participant}</strong>: {evidencePreview.content}
          </p>
        ) : null}
      </div>

      <details className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-slate-800">
          자세히 검수하고 수정하기
          <ChevronDown size={16} />
        </summary>
        <div className="mt-4 grid gap-4">
          <Field label="인사이트 제목">
            <Input value={insight.title} onChange={(event) => onUpdateInsight(insight.id, { title: event.target.value, reviewStatus: "수정 필요" })} />
          </Field>
          <Field label="구조적 해석">
            <Textarea
              className="min-h-28"
              value={insight.interpretation || insight.summary}
              onChange={(event) => onUpdateInsight(insight.id, { interpretation: event.target.value, reviewStatus: "수정 필요" })}
            />
          </Field>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="왜 중요한가">
              <Textarea
                className="min-h-24"
                value={insight.why_it_matters || ""}
                onChange={(event) => onUpdateInsight(insight.id, { why_it_matters: event.target.value, reviewStatus: "수정 필요" })}
              />
            </Field>
            <Field label="권장 조치">
              <Textarea
                className="min-h-24"
                value={insight.recommendation}
                onChange={(event) => onUpdateInsight(insight.id, { recommendation: event.target.value, reviewStatus: "수정 필요" })}
              />
            </Field>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-black text-slate-800">근거 발화</p>
            <div className="mt-3 grid gap-2">
              {insight.evidence_segment_ids.slice(0, 4).map((segmentId) => {
                const segment = segmentById.get(segmentId);
                if (!segment) return null;
                return (
                  <p className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-600" key={segmentId}>
                    <strong className="text-slate-950">{segment.participant}</strong> · {segment.question_or_topic}: {segment.content}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </details>
    </motion.article>
  );
}

function ReportPanel({
  approvedInsights,
  onDownload,
  recognition,
  reportMarkdown,
  result
}: {
  approvedInsights: ReviewedInsight[];
  onDownload: () => void;
  recognition: RecognitionResponse | null;
  reportMarkdown: string;
  result: AnalysisResponse;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionKicker icon={<FileText size={16} />} label="4. 보고서 초안" />
          <h3 className="mt-2 text-lg font-black">승인된 인사이트로 보고서를 구성했습니다</h3>
        </div>
        <Button disabled={!reportMarkdown} onClick={onDownload} variant="secondary">
          <Download size={18} />
          Markdown 다운로드
        </Button>
      </CardHeader>
      <CardContent>
        {approvedInsights.length ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <article className="mx-auto max-w-3xl">
              <p className="text-sm font-bold text-slate-500">UX 리서치 보고서 초안</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">{result.project_name}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MetricCard label="자료" value={result.source_name} />
                <MetricCard label="승인 인사이트" value={`${approvedInsights.length}개`} />
                <MetricCard label="자료 유형" value={recognition?.source_type || "미확인"} />
              </div>
              <ReportSection title="Executive Summary">
                이번 분석에서는 {approvedInsights.length}개의 핵심 인사이트를 승인했습니다. 승인된 항목은 아래 핵심 발견과 개선 제안에 반영됩니다.
              </ReportSection>
              <ReportSection title="핵심 발견">
                <div className="grid gap-4">
                  {approvedInsights.map((insight, index) => (
                    <div className="rounded-2xl bg-slate-50 p-4" key={insight.id}>
                      <h4 className="font-black">{index + 1}. {insight.title}</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{insight.interpretation || insight.summary}</p>
                      <p className="mt-3 text-sm font-semibold text-slate-900">제안: {insight.recommendation}</p>
                    </div>
                  ))}
                </div>
              </ReportSection>
              <ReportSection title="Appendix">
                근거 발화와 원문 위치는 각 인사이트 카드에서 확인할 수 있습니다.
              </ReportSection>
            </article>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm leading-6 text-slate-500">
            승인된 인사이트가 아직 없습니다. 검수 카드에서 보고서에 넣을 인사이트를 승인하면 초안이 생성됩니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AffinityBoard({
  onMoveSegment,
  result,
  segmentById,
  segmentTopicOverrides
}: {
  onMoveSegment: (segmentId: string, topicId: string) => void;
  result: AnalysisResponse;
  segmentById: Map<string, Segment>;
  segmentTopicOverrides: Record<string, string>;
}) {
  const palettes = [
    {
      rail: "from-amber-400 to-orange-400",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      note: "from-amber-50 to-orange-100",
      tape: "bg-amber-200/45"
    },
    {
      rail: "from-rose-400 to-pink-400",
      badge: "border-rose-200 bg-rose-50 text-rose-700",
      note: "from-rose-50 to-pink-100",
      tape: "bg-rose-200/45"
    },
    {
      rail: "from-sky-400 to-blue-400",
      badge: "border-sky-200 bg-sky-50 text-sky-700",
      note: "from-sky-50 to-blue-100",
      tape: "bg-sky-200/45"
    },
    {
      rail: "from-emerald-400 to-teal-400",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      note: "from-emerald-50 to-teal-100",
      tape: "bg-emerald-200/45"
    }
  ];
  const rotations = ["-rotate-1", "rotate-1", "-rotate-2", "rotate-2"];
  const noteOffsets = ["translate-x-0", "translate-x-3", "-translate-x-2", "translate-x-5", "-translate-x-4"];
  const [draggingSegmentId, setDraggingSegmentId] = useState<string | null>(null);
  const topicOptions = result.analysis.topics.slice(0, 6);
  const topicSegmentIds = useMemo(() => {
    const map = new Map<string, string[]>();
    result.analysis.topics.slice(0, 6).forEach((topic) => map.set(topic.id, []));
    result.analysis.topics.forEach((topic) => {
      topic.segment_ids.forEach((segmentId) => {
        const overrideTopicId = segmentTopicOverrides[segmentId];
        const targetTopicId = overrideTopicId || topic.id;
        if (!map.has(targetTopicId)) return;
        const current = map.get(targetTopicId);
        if (current && !current.includes(segmentId)) {
          current.push(segmentId);
        }
      });
    });
    return map;
  }, [result.analysis.topics, segmentTopicOverrides]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
	          <SectionKicker icon={<Network size={16} />} label="어피니티 보드" />
		          <h3 className="mt-2 text-lg font-black">발화가 어떤 주제로 모였는지 보드에서 훑어보세요</h3>
		          <p className="mt-1 text-sm leading-6 text-slate-500">어색하게 묶인 포스트잇은 끌어서 다른 주제 영역에 놓을 수 있습니다.</p>
        </div>
        <Badge variant="blue">{result.analysis.topics.length}개 주제</Badge>
      </CardHeader>
      <CardContent>
        <div
          className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-inner sm:p-5"
          style={{
            backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
            backgroundPosition: "-10px -10px",
            backgroundSize: "22px 22px"
          }}
        >
	          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/70 via-white/20 to-slate-100/70" />
	          <div className="relative flex gap-5 overflow-x-auto pb-4">
	            {topicOptions.map((topic, topicIndex) => {
	              const palette = palettes[topicIndex % palettes.length];
	              const visibleSegmentIds = topicSegmentIds.get(topic.id) ?? [];
	              return (
	                <motion.article
	                  animate={{ opacity: 1, y: 0, scale: 1 }}
	                  className={cn(
	                    "relative min-h-[420px] w-[320px] shrink-0 overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/65 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-xl sm:w-[360px]",
	                    draggingSegmentId && "ring-2 ring-slate-200"
	                  )}
	                  onDragOver={(event) => event.preventDefault()}
	                  onDrop={(event) => {
	                    event.preventDefault();
	                    const segmentId = event.dataTransfer.getData("text/plain") || draggingSegmentId;
	                    if (segmentId) onMoveSegment(segmentId, topic.id);
	                    setDraggingSegmentId(null);
	                  }}
	                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
	                  key={topic.id}
                  transition={{ delay: topicIndex * 0.08, duration: 0.36, ease: "easeOut" }}
                >
                  <div className={cn("absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r", palette.rail)} />
                  <div className="flex items-start justify-between gap-3">
                    <span className={cn("rounded-full border px-3 py-1.5 text-sm font-black shadow-sm", palette.badge)}>
                      {topic.topic_name}
                    </span>
	                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-500">
	                      근거 {visibleSegmentIds.length}
	                    </span>
	                  </div>
	                  <p className="mt-4 text-sm leading-6 text-slate-600">{topic.summary}</p>

		                  <div className="mt-6 grid min-h-[260px] content-start gap-4">
		                    {visibleSegmentIds.length ? visibleSegmentIds.slice(0, 4).map((segmentId, noteIndex) => {
		                      const segment = segmentById.get(segmentId);
		                      if (!segment) return null;
		                      const wasMoved = Boolean(segmentTopicOverrides[segmentId]);
		                      return (
		                        <motion.div
	                          className={cn(
	                            "group relative cursor-grab rounded-2xl border border-black/5 bg-gradient-to-br p-4 shadow-lg shadow-slate-900/5 transition duration-300 active:cursor-grabbing hover:-translate-y-1 hover:rotate-0 hover:shadow-2xl hover:shadow-slate-900/10",
	                            palette.note,
	                            rotations[(topicIndex + noteIndex) % rotations.length],
	                            noteOffsets[(topicIndex + noteIndex) % noteOffsets.length],
	                            draggingSegmentId === segment.id && "opacity-40"
	                          )}
	                          draggable
	                          onDragEnd={() => setDraggingSegmentId(null)}
	                          onDragStart={(event) => {
	                            const dragEvent = event as unknown as DragEvent<HTMLDivElement>;
	                            dragEvent.dataTransfer.setData("text/plain", segment.id);
	                            dragEvent.dataTransfer.effectAllowed = "move";
	                            setDraggingSegmentId(segment.id);
	                          }}
	                          initial={{ opacity: 0, y: 24, rotate: noteIndex % 2 ? 3 : -3 }}
	                          key={segmentId}
                          transition={{ delay: topicIndex * 0.08 + noteIndex * 0.06, duration: 0.34, ease: "easeOut" }}
                          viewport={{ once: true }}
                          whileInView={{ opacity: 1, y: 0 }}
                        >
		                          <div className={cn("absolute -top-2 left-1/2 h-5 w-14 -translate-x-1/2 rotate-2 rounded-sm shadow-sm backdrop-blur", palette.tape)} />
		                          {wasMoved ? <Badge className="mb-3" variant="blue">수동 이동</Badge> : null}
		                          <p className="text-sm font-semibold leading-6 text-slate-700">"{segment.content}"</p>
		                          <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 text-xs font-bold text-slate-500">
		                            <span>{segment.participant}</span>
		                            <span>{segment.question_or_topic}</span>
		                          </div>
		                        </motion.div>
		                      );
		                    }) : (
	                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-5 text-sm font-semibold leading-6 text-slate-500">
	                        이 묶음에 연결된 발화가 없습니다. 다른 카드의 묶음을 변경하면 이곳에 표시됩니다.
	                      </div>
	                    )}
	                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function SectionKicker({ icon, label, tone = "light" }: { icon: ReactNode; label: string; tone?: "light" | "dark" }) {
  return (
    <div className={cn("flex items-center gap-2 text-xs font-black", tone === "dark" ? "text-slate-300" : "text-slate-500")}>
      {icon}
      {label}
    </div>
  );
}

function MetricCard({ dark = false, label, value }: { dark?: boolean; label: string; value: string }) {
  return (
    <div className={cn("rounded-2xl border p-4", dark ? "border-white/10 bg-white/10" : "border-slate-200 bg-white")}>
      <p className={cn("text-xs font-bold", dark ? "text-slate-300" : "text-slate-500")}>{label}</p>
      <p className={cn("mt-2 text-lg font-black", dark ? "text-white" : "text-slate-950")}>{value}</p>
    </div>
  );
}

function InfoBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function ReportSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="mt-8 border-t border-slate-200 pt-6">
      <h3 className="text-lg font-black">{title}</h3>
      <div className="mt-3 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  );
}

function MotionBlock({ children }: { children: ReactNode }) {
  return (
    <motion.div animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} initial={{ opacity: 0, y: 12 }} transition={{ duration: 0.24 }}>
      {children}
    </motion.div>
  );
}

function formatErrorMessage(message: string) {
  if (message.includes("tokens per day") || message.includes("TPD")) {
    return "오늘 기본 분석 한도를 다 썼습니다. OpenRouter fallback 키가 설정되어 있으면 자동으로 대체 분석을 시도합니다.";
  }
  if (message.includes("tokens per minute") || message.includes("TPM")) {
    return "현재 요청이 분당 처리 한도를 넘었습니다. 잠시 후 다시 시도해주세요.";
  }
  if (message.includes("Groq API 한도 초과")) {
    return "기본 분석 한도에 걸렸고 대체 분석 키가 설정되어 있지 않습니다. .env에 OPENROUTER_API_KEY를 추가한 뒤 백엔드를 재시작하세요.";
  }
  if (message.includes("OpenRouter API 한도 초과")) {
    return "대체 분석 경로에서도 사용량 한도에 걸렸습니다. 잠시 후 다시 시도하거나 OpenRouter 콘솔에서 사용량을 확인해주세요.";
  }
  if (message.includes("JSON 형식으로 완성하지 못했습니다") || message.includes("Unterminated string")) {
    return "분석 모델이 결과를 완성된 구조로 반환하지 못했습니다. 같은 자료로 다시 한 번 분석을 실행해주세요.";
  }
  return message;
}

function formatSavedTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function splitTextareaLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildReportMarkdown(
  projectName: string,
  recognition: RecognitionResponse | null,
  result: AnalysisResponse | null,
  approvedInsights: ReviewedInsight[],
  segmentById: Map<string, Segment>
) {
  if (!result || !approvedInsights.length) return "";

  const topicSummary = result.analysis.topics
    .slice(0, 5)
    .map((topic) => `- ${topic.topic_name}: ${topic.summary}`)
    .join("\n");
  const keywordSummary = result.analysis.keywords
    .slice(0, 12)
    .map((keyword) => keyword.keyword)
    .join(", ");

  const findingSections = approvedInsights
    .map((insight, index) => {
      const evidence = insight.evidence_segment_ids
        .slice(0, 3)
        .map((segmentId) => segmentById.get(segmentId))
        .filter(Boolean)
        .map((segment) => `  - ${segment?.participant} · ${segment?.question_or_topic}: ${segment?.content}`)
        .join("\n");

      return `### ${index + 1}. ${insight.title}

${insight.interpretation || insight.summary}

**왜 중요한가**  
${insight.why_it_matters || "추가 검토가 필요합니다."}

**개선 제안**  
${insight.recommendation}

**근거 발화**
${evidence || "  - 연결된 근거 발화가 없습니다."}`;
    })
    .join("\n\n");

  const appendixEvidence = approvedInsights
    .flatMap((insight) => insight.evidence_segment_ids)
    .filter((segmentId, index, segmentIds) => segmentIds.indexOf(segmentId) === index)
    .map((segmentId) => segmentById.get(segmentId))
    .filter(Boolean)
    .map((segment) => `- ${segment?.participant} · ${segment?.question_or_topic}: ${segment?.content}`)
    .join("\n");

  return `# ${projectName} UX 리서치 보고서 초안

## Executive Summary
이번 분석에서는 ${approvedInsights.length}개의 핵심 인사이트를 승인했습니다. 주요 키워드는 ${keywordSummary || "추가 분석 필요"}입니다.

## 조사 배경
- 프로젝트명: ${projectName}
- 자료명: ${result.source_name}
- 자료 유형: ${recognition?.source_type || "미확인"}

## 방법
- 원자료 발화 단위: ${recognition?.segment_count ?? result.segment_count}개
- 분석 대상 참가자 발화: ${recognition?.participant_utterance_count ?? "미확인"}개
- 인식된 참가자: ${recognition?.participants.length ? recognition.participants.join(", ") : "미확인"}

## 핵심 발견
${findingSections}

## 사용성 이슈
${topicSummary || "- 반복 주제가 충분히 식별되지 않았습니다."}

## 개선 제안
${approvedInsights.map((insight, index) => `${index + 1}. ${insight.recommendation}`).join("\n")}

## Appendix
${appendixEvidence || "- 승인된 인사이트에 연결된 근거 발화가 없습니다."}
`;
}

function downloadMarkdown(markdown: string) {
  if (!markdown) return;
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "ux-research-report-draft.md";
  anchor.click();
  URL.revokeObjectURL(url);
}
