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
  Database,
  Download,
  FileText,
  FileUp,
  FolderOpen,
  FolderPlus,
  Layers3,
  Loader2,
  MessageSquareText,
  Network,
  Sparkles,
  TableProperties,
  Trash2,
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
  FindingStatus,
  Insight,
  ProjectSummary,
  RecognitionResponse,
  ReviewedInsight,
  RiskFlag,
  Segment,
  SourceRecord,
  TabularPreviewResponse,
  Topic,
} from "../lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const DRAFT_STORAGE_KEY = "cxi-studio:draft:v1";
type WorkspaceTab = "sources" | "findings" | "synthesis" | "report";

const sampleText = `# SmartThings 요리 경험 인터뷰
P1: 오븐 예열할 때는 앱을 쓰지만 실제로 켜졌는지 확인하기 전까지는 불안해요.
P2: 요리할 때 손에 물이나 기름이 묻어 있어서 폰을 만지는 게 번거로워요.
P3: 자동 조리는 좋아 보이지만 재료 양이나 냉동 상태가 다르면 그대로 믿기 어려워요.
P5: 앱에서 가능한 것과 직접 해야 하는 것이 기기마다 달라서 헷갈려요.`;


const analysisStages = [
  "파일 내용을 읽고 있습니다",
  "발화 단위를 정리하고 있습니다",
  "반복 주제를 찾고 있습니다",
  "근거 발화를 연결하고 있습니다",
  "인사이트 후보를 통합하고 있습니다",
  "보고서 초안에 맞게 정리하고 있습니다"
];

export default function Home() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectSlug, setActiveProjectSlug] = useState("");
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectMessage, setProjectMessage] = useState("");
  const [projectName, setProjectName] = useState("SmartThings 요리 경험 인터뷰");
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [sourceName, setSourceName] = useState("interview.md");
  const [text, setText] = useState(sampleText);
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [researchGoal, setResearchGoal] = useState("사용자가 스마트홈 요리 제어 기능을 어떤 맥락에서 신뢰하거나 불신하는지 파악한다.");
  const [tasksText, setTasksText] = useState("오븐 예열 상태 확인\n요리 중 앱 조작\n자동 조리 설정 신뢰 판단");
  const [evaluationCriteriaText, setEvaluationCriteriaText] = useState("신뢰 형성/저해 요인\n조작 맥락의 마찰\n기능 기대와 실제 사용 조건의 간극");
  const [file, setFile] = useState<File | null>(null);
  const [tabularPreview, setTabularPreview] = useState<TabularPreviewResponse | null>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [previewingTabular, setPreviewingTabular] = useState(false);
  const [recognition, setRecognition] = useState<RecognitionResponse | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [reviewedInsights, setReviewedInsights] = useState<ReviewedInsight[]>([]);
  const [segmentTopicOverrides, setSegmentTopicOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [analysisStageIndex, setAnalysisStageIndex] = useState(0);
  const [recognizing, setRecognizing] = useState(false);
  const [error, setError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("sources");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionResultRef = useRef<HTMLDivElement | null>(null);
  const draftRestoredRef = useRef(false);
  const suppressNextSaveRef = useRef(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadSources(activeProjectSlug);
  }, [activeProjectSlug]);

  const segmentById = useMemo(() => {
    const map = new Map<string, Segment>();
    result?.segments.forEach((segment) => map.set(segment.id, segment));
    return map;
  }, [result]);

  const reportInsights = useMemo(
    () => reviewedInsights.filter((i) =>
      i.findingStatus === "auto_included" || i.findingStatus === "pinned" || i.findingStatus === "edited"
    ),
    [reviewedInsights]
  );
  const attentionCount = reviewedInsights.filter((i) => i.findingStatus === "needs_attention").length;
  const autoIncludedCount = reviewedInsights.filter((i) => i.findingStatus === "auto_included").length;
  const canRecognize = inputMode === "file" ? Boolean(file) : Boolean(text.trim());
  const canAnalyze = Boolean(recognition && (inputMode === "file" ? file : text.trim()));
  const reportMarkdown = useMemo(
    () => buildReportMarkdown(projectName, recognition, result, reportInsights, segmentById),
    [projectName, recognition, result, reportInsights, segmentById]
  );

  async function loadProjects() {
    try {
      const response = await fetch(`${API_BASE}/api/projects`);
      if (!response.ok) return;
      const data = await response.json();
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch {
      setProjects([]);
    }
  }

  async function loadSources(projectSlug = activeProjectSlug) {
    if (!projectSlug) {
      setSources([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectSlug)}/sources`);
      if (!response.ok) return;
      const data = await response.json();
      setSources(Array.isArray(data.sources) ? data.sources : []);
    } catch {
      setSources([]);
    }
  }

  async function ensureActiveProject() {
    if (activeProjectSlug) return activeProjectSlug;
    const nextName = projectName.trim() || "새 리서치 프로젝트";
    const response = await fetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: nextName,
        research_goal: researchGoal,
        participant_count: recognition?.participant_count ?? 0,
        tasks: splitTextareaLines(tasksText),
        evaluation_criteria: splitTextareaLines(evaluationCriteriaText)
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail ?? "프로젝트를 만들지 못했습니다.");
    }
    const created = normalizeProject(data.project);
    setActiveProjectSlug(created.slug);
    setProjectName(created.project_name || created.name);
    await loadProjects();
    return created.slug;
  }

  async function createCurrentProject() {
    const nextName = projectName.trim();
    if (!nextName) {
      setProjectMessage("프로젝트명을 먼저 입력하세요.");
      return;
    }
    setProjectLoading(true);
    setProjectMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: nextName,
          research_goal: researchGoal,
          participant_count: recognition?.participant_count ?? 0,
          tasks: splitTextareaLines(tasksText),
          evaluation_criteria: splitTextareaLines(evaluationCriteriaText)
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? "프로젝트를 만들지 못했습니다.");
      }
      const created = normalizeProject(data.project);
      setActiveProjectSlug(created.slug);
      setProjectMessage("프로젝트를 만들었습니다.");
      await loadProjects();
      await loadSources(created.slug);
    } catch (requestError) {
      setProjectMessage(requestError instanceof Error ? requestError.message : "프로젝트 생성 중 오류가 발생했습니다.");
    } finally {
      setProjectLoading(false);
    }
  }

  async function selectProject(project: ProjectSummary) {
    const slug = project.slug;
    if (!slug) return;
    setProjectLoading(true);
    setProjectMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(slug)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? "프로젝트를 불러오지 못했습니다.");
      }
      const selected = normalizeProject(data.project);
      setActiveProjectSlug(selected.slug);
      setProjectName(selected.project_name || selected.name);
      setResearchGoal(selected.research_goal ?? "");
      setTasksText((selected.tasks ?? []).join("\n"));
      setEvaluationCriteriaText((selected.evaluation_criteria ?? []).join("\n"));
      setRecognition(null);
      setResult(null);
      setReviewedInsights([]);
      setSegmentTopicOverrides({});
      await loadSources(selected.slug);
      setWorkspaceTab("sources");
      setProjectMessage("프로젝트를 불러왔습니다.");
    } catch (requestError) {
      setProjectMessage(requestError instanceof Error ? requestError.message : "프로젝트 선택 중 오류가 발생했습니다.");
    } finally {
      setProjectLoading(false);
    }
  }

  async function removeProject(project: ProjectSummary) {
    if (!project.slug) return;
    const ok = window.confirm(`"${project.name}" 프로젝트를 삭제할까요? 저장된 분석 세션도 함께 삭제됩니다.`);
    if (!ok) return;
    setProjectLoading(true);
    setProjectMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(project.slug)}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? "프로젝트를 삭제하지 못했습니다.");
      }
      if (activeProjectSlug === project.slug) {
        setActiveProjectSlug("");
        setSources([]);
        setSelectedSourceId("");
      }
      setProjectMessage("프로젝트를 삭제했습니다.");
      await loadProjects();
    } catch (requestError) {
      setProjectMessage(requestError instanceof Error ? requestError.message : "프로젝트 삭제 중 오류가 발생했습니다.");
    } finally {
      setProjectLoading(false);
    }
  }

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!rawDraft) {
        draftRestoredRef.current = true;
        return;
      }
      const draft = JSON.parse(rawDraft) as Partial<DraftState>;
      if (typeof draft.activeProjectSlug === "string") setActiveProjectSlug(draft.activeProjectSlug);
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
      activeProjectSlug,
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
  }, [activeProjectSlug, evaluationCriteriaText, inputMode, projectName, recognition, researchGoal, result, reviewedInsights, segmentTopicOverrides, sourceName, tasksText, text]);

  function assignFindingStatus(insight: Insight): Pick<ReviewedInsight, "findingStatus" | "riskFlags"> {
    const quoteCount = insight.supporting_quotes?.length ?? 0;
    if (quoteCount === 0) return { findingStatus: "needs_attention", riskFlags: ["weak_evidence"] };
    if (insight.confidence === "낮음") return { findingStatus: "needs_attention", riskFlags: ["overgeneralized"] };
    return { findingStatus: "auto_included", riskFlags: [] };
  }

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
      setWorkspaceTab("sources");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "자료 인식 중 오류가 발생했습니다.");
    } finally {
      setRecognizing(false);
      // 인식 결과 영역으로 자동 스크롤
      setTimeout(() => {
        recognitionResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
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
          ...assignFindingStatus(insight),
        }))
      );
      setWorkspaceTab("report");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "분석 중 오류가 발생했습니다.");
    } finally {
      window.clearInterval(stageTimer);
      setLoading(false);
    }
  }

  function recognizeText() {
    // 확장자가 없으면 .md로 보정 (백엔드 파서가 포맷을 확장자로 감지하기 때문)
    const hasExt = /\.(txt|md|markdown|csv|xlsx)$/i.test(sourceName);
    const safeName = hasExt ? sourceName : sourceName ? `${sourceName}.md` : "붙여넣은 인터뷰.md";
    return fetch(`${API_BASE}/api/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_name: safeName, text })
    });
  }

  function recognizeFile(uploadFile: File) {
    const formData = new FormData();
    formData.append("file", uploadFile);
    return fetch(`${API_BASE}/api/parse-upload`, { method: "POST", body: formData });
  }

  async function previewTabularFile(uploadFile: File) {
    if (!isTabularFile(uploadFile.name)) {
      setTabularPreview(null);
      setColumnMappings({});
      return;
    }
    setPreviewingTabular(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const response = await fetch(`${API_BASE}/api/preview-tabular`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? "표 데이터 미리보기에 실패했습니다.");
      }
      setTabularPreview(data);
      setColumnMappings(
        Object.fromEntries(
          data.columns.map((column: { source_column: string; suggested_field: string }) => [column.source_column, column.suggested_field])
        )
      );
    } catch (requestError) {
      setTabularPreview(null);
      setColumnMappings({});
      setError(requestError instanceof Error ? requestError.message : "표 데이터 미리보기 중 오류가 발생했습니다.");
    } finally {
      setPreviewingTabular(false);
    }
  }

  async function uploadSourceToLibrary(uploadFile: File) {
    setProjectLoading(true);
    setProjectMessage("");
    try {
      const projectSlug = await ensureActiveProject();
      const formData = new FormData();
      formData.append("file", uploadFile);
      const response = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectSlug)}/sources`, {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? "소스를 저장하지 못했습니다.");
      }
      setSources((current) => [data.source, ...current.filter((source) => source.id !== data.source.id)]);
      setSelectedSourceId(data.source.id);
      setRecognition(data.recognition ?? null);
      setProjectMessage("소스 라이브러리에 추가했습니다.");
    } catch (requestError) {
      setProjectMessage(requestError instanceof Error ? requestError.message : "소스 저장 중 오류가 발생했습니다.");
    } finally {
      setProjectLoading(false);
    }
  }

  async function deleteLibrarySource(source: SourceRecord) {
    if (!activeProjectSlug) return;
    const ok = window.confirm(`"${source.name}" 소스를 삭제할까요?`);
    if (!ok) return;
    setProjectLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(activeProjectSlug)}/sources/${encodeURIComponent(source.id)}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? "소스를 삭제하지 못했습니다.");
      }
      setSources((current) => current.filter((item) => item.id !== source.id));
      if (selectedSourceId === source.id) setSelectedSourceId("");
      setProjectMessage("소스를 삭제했습니다.");
    } catch (requestError) {
      setProjectMessage(requestError instanceof Error ? requestError.message : "소스 삭제 중 오류가 발생했습니다.");
    } finally {
      setProjectLoading(false);
    }
  }

  async function analyzeLibrarySource(source: SourceRecord) {
    if (!activeProjectSlug) return;
    setLoading(true);
    setAnalysisStageIndex(0);
    setError("");
    setSelectedSourceId(source.id);
    setSources((current) => current.map((item) => (item.id === source.id ? { ...item, status: "분석중" } : item)));
    const stageTimer = window.setInterval(() => {
      setAnalysisStageIndex((current) => Math.min(current + 1, analysisStages.length - 1));
    }, 2500);
    try {
      const formData = new FormData();
      formData.append("research_goal", researchGoal);
      formData.append("tasks", tasksText);
      formData.append("evaluation_criteria", evaluationCriteriaText);
      const response = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(activeProjectSlug)}/sources/${encodeURIComponent(source.id)}/analyze`, {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(formatErrorMessage(data.detail ?? "소스 분석에 실패했습니다."));
      }
      setResult(data);
      setReviewedInsights(
        data.analysis.insights.map((insight: Insight) => ({
          ...insight,
          ...assignFindingStatus(insight),
        }))
      );
      setSources((current) => current.map((item) => (item.id === source.id ? data.source : item)));
      setWorkspaceTab("report");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "소스 분석 중 오류가 발생했습니다.");
      setSources((current) => current.map((item) => (item.id === source.id ? { ...item, status: "오류" } : item)));
    } finally {
      window.clearInterval(stageTimer);
      setLoading(false);
    }
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
    setTabularPreview(null);
    setColumnMappings({});
    setRecognition(null);
    setResult(null);
    setReviewedInsights([]);
    setSegmentTopicOverrides({});
    setError("");
    if (selectedFile) {
      setSourceName(selectedFile.name);
      void previewTabularFile(selectedFile);
      void uploadSourceToLibrary(selectedFile);
      recognize(selectedFile);
    }
  }

  function changeInputMode(nextMode: "file" | "text") {
    setInputMode(nextMode);
    setRecognition(null);
    setResult(null);
    setReviewedInsights([]);
    setSegmentTopicOverrides({});
    setTabularPreview(null);
    setColumnMappings({});
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
    setActiveProjectSlug("");
    setProjectName("SmartThings 요리 경험 인터뷰");
    setSourceName("interview.md");
    setText(sampleText);
    setInputMode("file");
    setResearchGoal("사용자가 스마트홈 요리 제어 기능을 어떤 맥락에서 신뢰하거나 불신하는지 파악한다.");
    setTasksText("오븐 예열 상태 확인\n요리 중 앱 조작\n자동 조리 설정 신뢰 판단");
    setEvaluationCriteriaText("신뢰 형성/저해 요인\n조작 맥락의 마찰\n기능 기대와 실제 사용 조건의 간극");
    setFile(null);
    setTabularPreview(null);
    setColumnMappings({});
    setRecognition(null);
    setResult(null);
    setReviewedInsights([]);
    setSegmentTopicOverrides({});
    setError("");
    setLastSavedAt("");
    setWorkspaceTab("sources");
  }

  return (
    <main className="min-h-screen text-[#141413]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <Sidebar
          activeProjectSlug={activeProjectSlug}
          autoIncludedCount={autoIncludedCount}
          onCreateProject={createCurrentProject}
          onDeleteProject={removeProject}
          onSelectProject={selectProject}
          projectLoading={projectLoading}
          projectMessage={projectMessage}
          attentionCount={attentionCount}
          projectName={projectName}
          projects={projects}
          sourceCount={sources.length}
        />

        <section className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <WorkbenchHeader
            reportInsightsCount={reportInsights.length}
            canDownload={Boolean(reportMarkdown)}
            lastSavedAt={lastSavedAt}
            onClearDraft={clearDraft}
            onDownload={() => downloadMarkdown(reportMarkdown)}
            recognition={recognition}
            result={result}
          />
          <WorkspaceNav
            activeTab={workspaceTab}
            autoIncludedCount={autoIncludedCount}
            attentionCount={attentionCount}
            canOpenInsights={Boolean(result)}
            canOpenReport={Boolean(result)}
            canOpenSynthesis={sources.filter((source) => source.status === "분석완료").length >= 2}
            onChange={setWorkspaceTab}
            recognitionReady={Boolean(recognition)}
            sourceCount={sources.length}
          />

          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid min-w-0 gap-5">
              <AnimatePresence mode="popLayout">
                {workspaceTab === "sources" ? (
                  <MotionBlock key="evidence">
                    <div className="grid gap-5">
                      <InputPanel
                        canRecognize={canRecognize}
                        columnMappings={columnMappings}
                        file={file}
                        fileInputRef={fileInputRef}
                        inputMode={inputMode}
                        onFileChange={handleFileChange}
                        onMappingChange={(column, field) =>
                          setColumnMappings((current) => ({
                            ...current,
                            [column]: field
                          }))
                        }
                        onModeChange={changeInputMode}
                        onRecognize={() => recognize()}
                        previewingTabular={previewingTabular}
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
                        tabularPreview={tabularPreview}
                        tasksText={tasksText}
                        text={text}
                        evaluationCriteriaText={evaluationCriteriaText}
                      />
                      <SourceLibraryPanel
                        activeSourceId={selectedSourceId}
                        analysisStage={analysisStages[analysisStageIndex]}
                        loading={loading}
                        onAnalyzeSource={analyzeLibrarySource}
                        onDeleteSource={deleteLibrarySource}
                        onSelectSource={setSelectedSourceId}
                        sources={sources}
                      />
                      <div ref={recognitionResultRef}>
                        {recognition ? <RecognitionPanel recognition={recognition} /> : null}
                        {!result ? (
                          <EmptyAnalysisState analysisStage={analysisStages[analysisStageIndex]} canAnalyze={canAnalyze} loading={loading} onAnalyze={analyze} />
                        ) : null}
                      </div>
                    </div>
                  </MotionBlock>
                ) : null}

                {error ? (
                  <MotionBlock key="error">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800">
                      {error}
                    </div>
                  </MotionBlock>
                ) : null}

                {workspaceTab === "findings" ? (
                  <MotionBlock key="insights">
                    {result ? (
                      <FindingsWorkspace
                        attentionCount={attentionCount}
                        onMoveSegment={(segmentId, topicId) =>
                          setSegmentTopicOverrides((current) => ({
                            ...current,
                            [segmentId]: topicId
                          }))
                        }
                        onUpdateInsight={updateInsight}
                        reportInsights={reportInsights}
                        result={result}
                        reviewedInsights={reviewedInsights}
                        segmentById={segmentById}
                        segmentTopicOverrides={segmentTopicOverrides}
                      />
                    ) : (
                      <EmptyAnalysisState analysisStage={analysisStages[analysisStageIndex]} canAnalyze={canAnalyze} loading={loading} onAnalyze={analyze} />
                    )}
                  </MotionBlock>
                ) : null}

                {workspaceTab === "report" && result ? (
                  <MotionBlock key="report">
                    <ReportPanel
                      attentionCount={attentionCount}
                      reportInsights={reportInsights}
                      onDownload={() => downloadMarkdown(reportMarkdown)}
                      recognition={recognition}
                      reportMarkdown={reportMarkdown}
                      result={result}
                    />
                  </MotionBlock>
                ) : null}

                {workspaceTab === "synthesis" ? (
                  <MotionBlock key="synthesis">
                    <SynthesisPlaceholder sources={sources} />
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
  activeProjectSlug,
  autoIncludedCount,
  onCreateProject,
  onDeleteProject,
  onSelectProject,
  projectLoading,
  projectMessage,
  attentionCount,
  projectName,
  projects,
  sourceCount
}: {
  activeProjectSlug: string;
  autoIncludedCount: number;
  onCreateProject: () => void;
  onDeleteProject: (project: ProjectSummary) => void;
  onSelectProject: (project: ProjectSummary) => void;
  projectLoading: boolean;
  projectMessage: string;
  attentionCount: number;
  projectName: string;
  projects: ProjectSummary[];
  sourceCount: number;
}) {
  return (
    <aside className="border-b border-[#e6dfd8] bg-[#faf9f5]/85 px-5 py-5 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
      <div className="flex items-start justify-between gap-4 lg:block">
        <div>
          <div className="flex items-center gap-2">
            <div>
              <h1 className="font-serif text-2xl font-normal leading-tight">CXI Studio</h1>
              <p className="text-xs font-semibold text-[#6c6a64]">Customer Experience Intelligence</p>
            </div>
          </div>
          <ColorChips className="mt-5" />
          <div className="mt-6 hidden rounded-2xl border border-[#e6dfd8] bg-[#f5f0e8] p-4 lg:block">
            <p className="text-xs font-bold text-[#6c6a64]">현재 프로젝트</p>
            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[#252523]">{projectName}</p>
          </div>
        </div>
        <Badge variant={autoIncludedCount ? "green" : "muted"}>{autoIncludedCount ? `자동 반영 ${autoIncludedCount}` : "초안"}</Badge>
      </div>

      <ProjectSwitcher
        activeProjectSlug={activeProjectSlug}
        loading={projectLoading}
        message={projectMessage}
        onCreateProject={onCreateProject}
        onDeleteProject={onDeleteProject}
        onSelectProject={onSelectProject}
        projects={projects}
      />

      <div className="mt-6 hidden rounded-2xl border border-[#e6dfd8] bg-[#f5f0e8] p-4 lg:block">
        <p className="mb-3 text-xs font-black uppercase text-[#6c6a64]">프로젝트 현황</p>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#6c6a64]">소스</span>
            <span className="font-bold text-[#252523]">{sourceCount}개</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6c6a64]">자동 반영</span>
            <span className="font-bold text-[#252523]">{autoIncludedCount}개</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6c6a64]">확인 필요</span>
            <span className={cn("font-bold", attentionCount ? "text-[#a9583e]" : "text-[#252523]")}>
              {attentionCount}개
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function ProjectSwitcher({
  activeProjectSlug,
  loading,
  message,
  onCreateProject,
  onDeleteProject,
  onSelectProject,
  projects
}: {
  activeProjectSlug: string;
  loading: boolean;
  message: string;
  onCreateProject: () => void;
  onDeleteProject: (project: ProjectSummary) => void;
  onSelectProject: (project: ProjectSummary) => void;
  projects: ProjectSummary[];
}) {
  return (
    <section className="mt-6 rounded-2xl border border-[#e6dfd8] bg-[#f5f0e8] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-[#6c6a64]">Projects</p>
          <p className="mt-1 text-sm font-bold text-[#252523]">프로젝트 관리</p>
        </div>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#141413] text-[#faf9f5] transition hover:bg-[#252320] disabled:opacity-50"
          disabled={loading}
          onClick={onCreateProject}
          title="현재 입력값으로 새 프로젝트 만들기"
          type="button"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <FolderPlus size={16} />}
        </button>
      </div>

      <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto pr-1">
        {projects.length ? (
          projects.map((project) => {
            const isActive = project.slug === activeProjectSlug;
            return (
              <div
                className={cn(
                  "group flex items-center gap-2 rounded-xl border p-2 transition",
                  isActive ? "border-[#cc785c] bg-[#faf9f5]" : "border-transparent bg-[#efe9de] hover:bg-[#faf9f5]"
                )}
                key={project.slug}
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  disabled={loading}
                  onClick={() => onSelectProject(project)}
                  type="button"
                >
                  <FolderOpen className="shrink-0 text-[#a9583e]" size={16} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-[#252523]">{project.name}</span>
                    <span className="block truncate text-xs text-[#8e8b82]">{project.updated_at ? formatSavedTime(project.updated_at) : "저장됨"}</span>
                  </span>
                </button>
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#8e3c29] opacity-70 transition hover:bg-[#f2d8ce] hover:opacity-100"
                  disabled={loading}
                  onClick={() => onDeleteProject(project)}
                  title="프로젝트 삭제"
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl bg-[#efe9de] p-3 text-sm leading-6 text-[#6c6a64]">
            아직 저장된 프로젝트가 없습니다. 현재 입력값으로 첫 프로젝트를 만들 수 있습니다.
          </div>
        )}
      </div>

      {message ? <p className="mt-3 rounded-xl bg-[#faf9f5] px-3 py-2 text-xs font-semibold text-[#6c6a64]">{message}</p> : null}
    </section>
  );
}

function WorkspaceNav({
  activeTab,
  autoIncludedCount,
  attentionCount,
  canOpenInsights,
  canOpenReport,
  canOpenSynthesis,
  onChange,
  recognitionReady,
  sourceCount
}: {
  activeTab: WorkspaceTab;
  autoIncludedCount: number;
  attentionCount: number;
  canOpenInsights: boolean;
  canOpenReport: boolean;
  canOpenSynthesis: boolean;
  onChange: (tab: WorkspaceTab) => void;
  recognitionReady: boolean;
  sourceCount: number;
}) {
  const tabs: {
    id: WorkspaceTab;
    label: string;
    description: string;
    disabled?: boolean;
    count?: string;
  }[] = [
    {
      id: "sources",
      label: "Sources",
      description: sourceCount ? `${sourceCount}개 자료 관리` : recognitionReady ? "원자료 인식 완료" : "자료를 추가하세요",
    },
    {
      id: "findings",
      label: "Findings",
      description: canOpenInsights
        ? `자동 반영 ${autoIncludedCount}개 · 확인 필요 ${attentionCount}개`
        : "분석 후 활성화",
      disabled: !canOpenInsights,
      count: canOpenInsights && attentionCount ? `${attentionCount} 확인` : undefined,
    },
    {
      id: "synthesis",
      label: "Synthesis",
      description: canOpenSynthesis ? "소스 간 패턴 연결" : "분석 완료 소스 2개 필요",
      disabled: !canOpenSynthesis,
      count: canOpenSynthesis ? "준비됨" : undefined,
    },
    {
      id: "report",
      label: "Report",
      description: canOpenReport ? "보고서 초안 준비됨" : "분석 후 활성화",
      disabled: !canOpenReport,
      count: canOpenReport ? "초안 준비" : undefined,
    },
  ];

  return (
    <div className="mt-5 rounded-2xl border border-[#e6dfd8] bg-[#faf9f5]/85 p-1.5 shadow-sm shadow-[#e6dfd8]/30">
      <div className="grid gap-1.5 md:grid-cols-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              className={cn(
                "flex min-h-16 items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition",
                isActive ? "bg-[#141413] text-[#faf9f5] shadow-sm" : "text-[#6c6a64] hover:bg-[#f5f0e8]",
                tab.disabled && "cursor-not-allowed opacity-45 hover:bg-transparent"
              )}
              disabled={tab.disabled}
              key={tab.id}
              onClick={() => onChange(tab.id)}
              type="button"
            >
              <span>
                <span className="block text-sm font-black">{tab.label}</span>
                <span className={cn("mt-1 block text-xs", isActive ? "text-[#a09d96]" : "text-[#8e8b82]")}>{tab.description}</span>
              </span>
              {tab.count ? (
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", isActive ? "bg-[#252320] text-[#faf9f5]" : "bg-[#efe9de] text-[#6c6a64]")}>
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ColorChips({ className }: { className?: string }) {
  const chips = ["#141413", "#cc785c", "#e8a55a", "#5db8a6", "#252320", "#e8e0d2"];
  return (
    <div className={cn("flex items-center gap-2", className)} aria-hidden="true">
      {chips.map((color, index) => (
        <span
          className="h-5 w-10 rounded-full border border-black/10 shadow-sm"
          key={color}
          style={{ backgroundColor: color, transform: `translateY(${index % 2 ? 2 : 0}px)` }}
        />
      ))}
    </div>
  );
}

function WorkbenchHeader({
  reportInsightsCount,
  canDownload,
  lastSavedAt,
  onClearDraft,
  onDownload,
  recognition,
  result
}: {
  reportInsightsCount: number;
  canDownload: boolean;
  lastSavedAt: string;
  onClearDraft: () => void;
  onDownload: () => void;
  recognition: RecognitionResponse | null;
  result: AnalysisResponse | null;
}) {
  const helper = result
    ? "인사이트가 자동으로 보고서에 반영됩니다. 확인 필요 항목만 선택적으로 검토하세요."
    : recognition
      ? "자료 구조가 확인되었습니다. 이제 AI 분석을 실행할 수 있습니다."
      : "리서치 원자료를 추가하면 화자와 섹션을 먼저 인식합니다.";
  return (
    <header className="rounded-3xl border border-[#e6dfd8] bg-[#faf9f5]/90 p-5 shadow-sm shadow-[#e6dfd8]/50 backdrop-blur sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="amber">CXI Studio</Badge>
            <Badge variant="blue">리서치 워크벤치</Badge>
            <Badge variant={result ? "green" : recognition ? "amber" : "muted"}>
              {result ? "보고서 초안" : recognition ? "자료 인식 완료" : "자료 대기"}
            </Badge>
            <Badge variant="muted">{lastSavedAt ? `자동 저장 ${formatSavedTime(lastSavedAt)}` : "자동 저장 준비"}</Badge>
          </div>
          <h2 className="mt-4 text-xl font-semibold leading-8 text-[#141413] sm:text-2xl">리서치 원자료를 근거 있는 CX 인사이트로 정리합니다</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6c6a64]">{helper}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onClearDraft} variant="ghost">
            임시 저장 삭제
          </Button>
          <Button disabled={!canDownload} onClick={onDownload} variant="secondary">
            <Download size={18} />
            보고서 다운로드
          </Button>
          <div className="rounded-2xl border border-[#e6dfd8] bg-[#f5f0e8] px-4 py-3">
            <p className="text-xs font-bold text-[#6c6a64]">보고서 반영 인사이트</p>
            <p className="mt-1 text-2xl font-black text-[#141413]">{reportInsightsCount}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function InputPanel({
  canRecognize,
  columnMappings,
  evaluationCriteriaText,
  file,
  fileInputRef,
  inputMode,
  onFileChange,
  onMappingChange,
  onModeChange,
  onRecognize,
  previewingTabular,
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
  tabularPreview,
  tasksText,
  text
}: {
  canRecognize: boolean;
  columnMappings: Record<string, string>;
  evaluationCriteriaText: string;
  file: File | null;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  inputMode: "file" | "text";
  onFileChange: (file: File | null) => void;
  onMappingChange: (column: string, field: string) => void;
  onModeChange: (mode: "file" | "text") => void;
  onRecognize: () => void;
  previewingTabular: boolean;
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
  tabularPreview: TabularPreviewResponse | null;
  tasksText: string;
  text: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionKicker icon={<FileUp size={16} />} label="1. 자료 추가" />
          <h3 className="mt-2 text-lg font-black">분석할 원자료를 올려주세요</h3>
            <p className="mt-1 text-sm leading-6 text-[#6c6a64]">파일을 먼저 올리면 바로 인식합니다. 연구 맥락은 나중에 보완해도 됩니다.</p>
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

        <div className="rounded-3xl border border-[#e6dfd8] bg-[#f5f0e8] p-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-black text-[#141413]">선택 보완 맥락</p>
            <p className="text-sm leading-6 text-[#6c6a64]">비워도 분석할 수 있습니다. 연구 목적과 태스크를 추가하면 이후 개별 분석과 종합 정확도가 올라갑니다.</p>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Field label="연구 목적">
              <Textarea className="min-h-28" onChange={(event) => setResearchGoal(event.target.value)} value={researchGoal} />
            </Field>
            <Field label="평가 태스크">
              <Textarea className="min-h-28" onChange={(event) => setTasksText(event.target.value)} value={tasksText} />
            </Field>
            <Field label="평가 기준">
              <Textarea className="min-h-28" onChange={(event) => setEvaluationCriteriaText(event.target.value)} value={evaluationCriteriaText} />
            </Field>
          </div>
        </div>

        <Tabs value={inputMode}>
          <TabsContent value="file">
            <div
              className={cn(
                "group rounded-3xl border border-dashed p-8 transition",
                file ? "border-[#cc785c] bg-[#efe9de]" : "border-[#e6dfd8] bg-[#f5f0e8] hover:border-[#cc785c] hover:bg-[#faf9f5]"
              )}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                onFileChange(event.dataTransfer.files?.[0] ?? null);
              }}
            >
              <input
                accept=".txt,.md,.markdown,.csv,.xlsx"
                className="hidden"
                onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
                ref={fileInputRef}
                type="file"
              />
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#faf9f5] text-[#252523] shadow-sm">
                    <FileText size={22} />
                  </div>
                  <div>
                    <p className="text-base font-black text-[#141413]">{file ? file.name : "파일을 끌어오거나 선택하세요"}</p>
                    <p className="mt-1 text-sm leading-6 text-[#6c6a64]">TXT, Markdown, CSV, XLSX 파일을 지원합니다. 파일을 올리면 이 파일만 분석 대상으로 사용합니다.</p>
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
            {file ? (
              <UploadedFileQueue
                file={file}
                previewingTabular={previewingTabular}
                tabularPreview={tabularPreview}
              />
            ) : null}
            {tabularPreview ? (
              <TabularMappingPanel
                columnMappings={columnMappings}
                onMappingChange={onMappingChange}
                preview={tabularPreview}
              />
            ) : null}
          </TabsContent>
          <TabsContent value="text">
            <Field label="직접 입력할 원자료">
              <Textarea
                className={cn("min-h-64", text.trim() ? "border-[#cc785c] focus-visible:ring-[#cc785c]" : "")}
                onChange={(event) => setText(event.target.value)}
                placeholder="인터뷰 발화, 관찰 메모, 설문 응답 텍스트를 여기에 붙여넣으세요"
                value={text}
              />
              <div className="mt-2 flex items-center gap-2">
                {text.trim() ? (
                  <>
                    <span className="rounded-full bg-[#f5f0e8] px-2.5 py-0.5 text-xs font-semibold text-[#6c6a64]">
                      {text.trim().length.toLocaleString()}자
                    </span>
                    <span className="text-xs text-[#6c6a64]">입력됨 · 아래 버튼으로 인식 결과를 확인하세요</span>
                  </>
                ) : (
                  <span className="text-xs text-[#8e8b82]">텍스트를 입력하면 인식 준비 상태로 바뀝니다</span>
                )}
              </div>
            </Field>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col gap-3 rounded-2xl bg-[#f5f0e8] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#252523]">먼저 자료 인식 결과를 확인합니다</p>
            <p className="mt-1 text-sm text-[#6c6a64]">AI 분석 전에 발화 단위, 참가자, 섹션을 확인할 수 있습니다.</p>
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

function SourceLibraryPanel({
  activeSourceId,
  analysisStage,
  loading,
  onAnalyzeSource,
  onDeleteSource,
  onSelectSource,
  sources
}: {
  activeSourceId: string;
  analysisStage: string;
  loading: boolean;
  onAnalyzeSource: (source: SourceRecord) => void;
  onDeleteSource: (source: SourceRecord) => void;
  onSelectSource: (sourceId: string) => void;
  sources: SourceRecord[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionKicker icon={<FolderOpen size={16} />} label="소스 라이브러리" />
          <h3 className="mt-2 text-lg font-black">프로젝트 안의 원자료를 따로 관리합니다</h3>
          <p className="mt-1 text-sm leading-6 text-[#6c6a64]">각 파일은 독립적으로 인식·분석되고, 분석 완료 소스가 2개 이상이면 종합 단계로 이어집니다.</p>
        </div>
        <Badge variant={sources.length ? "blue" : "muted"}>{sources.length}개 소스</Badge>
      </CardHeader>
      <CardContent>
        {sources.length ? (
          <div className="grid gap-3">
            {sources.map((source) => {
              const isActive = activeSourceId === source.id;
              const isAnalyzing = loading && isActive;
              return (
                <div
                  className={cn(
                    "rounded-2xl border p-4 transition",
                    isActive ? "border-[#cc785c] bg-[#fff7ef]" : "border-[#e6dfd8] bg-[#f5f0e8]"
                  )}
                  key={source.id}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <button className="min-w-0 text-left" onClick={() => onSelectSource(source.id)} type="button">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#faf9f5] text-[#a9583e]">
                          {source.source_type === "CSV" || source.source_type === "엑셀" ? <Database size={18} /> : <FileText size={18} />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[#252523]">{source.name}</p>
                          <p className="mt-1 text-xs font-semibold text-[#6c6a64]">
                            {source.detected_label} · 세그먼트 {source.segment_count}개 · 참가자 {source.participant_count || "?"}명
                          </p>
                        </div>
                      </div>
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={source.status === "분석완료" ? "green" : source.status === "분석중" || source.status === "오류" ? "amber" : "muted"}>
                        {isAnalyzing ? "분석중" : source.status}
                      </Badge>
                      {source.insight_count ? <Badge variant="blue">인사이트 {source.insight_count}</Badge> : null}
                      <Button disabled={loading} onClick={() => onAnalyzeSource(source)} size="sm" type="button">
                        {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                        {source.status === "분석완료" ? "다시 분석" : "개별 분석"}
                      </Button>
                      <Button disabled={loading} onClick={() => onDeleteSource(source)} size="sm" type="button" variant="ghost">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  {isAnalyzing ? (
                    <div className="mt-3 rounded-xl bg-[#faf9f5] px-3 py-2 text-xs font-semibold text-[#6c6a64]">{analysisStage}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#e6dfd8] bg-[#f5f0e8] p-6 text-sm leading-6 text-[#6c6a64]">
            아직 저장된 소스가 없습니다. 위에 파일을 드롭하면 프로젝트가 자동으로 준비되고 소스 라이브러리에 추가됩니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UploadedFileQueue({
  file,
  previewingTabular,
  tabularPreview
}: {
  file: File;
  previewingTabular: boolean;
  tabularPreview: TabularPreviewResponse | null;
}) {
  const isTabular = isTabularFile(file.name);
  const status = isTabular ? (previewingTabular ? "컬럼 읽는 중" : tabularPreview ? "매핑 확인 필요" : "표 데이터") : "인식 대기";
  return (
    <div className="rounded-2xl border border-[#e6dfd8] bg-[#faf9f5] p-3">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f5f0e8] p-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#efe9de] text-[#a9583e]">
            {isTabular ? <Database size={18} /> : <FileText size={18} />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#252523]">{file.name}</p>
            <p className="mt-1 text-xs font-semibold text-[#6c6a64]">
              {formatFileSize(file.size)} · {status}
            </p>
          </div>
        </div>
        <Badge variant={tabularPreview ? "amber" : "muted"}>{status}</Badge>
      </div>
    </div>
  );
}

function TabularMappingPanel({
  columnMappings,
  onMappingChange,
  preview
}: {
  columnMappings: Record<string, string>;
  onMappingChange: (column: string, field: string) => void;
  preview: TabularPreviewResponse;
}) {
  const requiredMappedCount = preview.required_fields.filter((field) => Object.values(columnMappings).includes(field)).length;
  const evidenceFields = new Set(["task_success", "score", "error_count", "observation_note", "quote"]);
  const evidenceMappedCount = Object.values(columnMappings).filter((field) => evidenceFields.has(field)).length;

  return (
    <div className="overflow-hidden rounded-3xl border border-[#e6dfd8] bg-[#faf9f5]">
      <div className="border-b border-[#e6dfd8] bg-[#f5f0e8] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <SectionKicker icon={<TableProperties size={16} />} label="CSV/XLSX 컬럼 매핑" />
            <h4 className="mt-2 text-base font-black text-[#141413]">{preview.source_name}</h4>
            <p className="mt-1 text-sm leading-6 text-[#6c6a64]">
              {preview.row_count}개 행의 헤더와 샘플값을 기준으로 시스템 필드를 제안했습니다. 애매한 컬럼은 직접 바꿀 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={requiredMappedCount >= preview.required_fields.length ? "green" : "amber"}>
              필수 {requiredMappedCount}/{preview.required_fields.length}
            </Badge>
            <Badge variant={evidenceMappedCount ? "blue" : "muted"}>근거 컬럼 {evidenceMappedCount}</Badge>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="bg-[#faf9f5] text-xs font-black text-[#6c6a64]">
            <tr>
              <th className="border-b border-r border-[#e6dfd8] px-4 py-3">원본 컬럼</th>
              <th className="border-b border-r border-[#e6dfd8] px-4 py-3">시스템 필드</th>
              <th className="border-b border-[#e6dfd8] px-4 py-3">샘플값</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6dfd8]">
            {preview.columns.map((column) => {
              const selectedField = columnMappings[column.source_column] ?? column.suggested_field;
              const ignored = selectedField === "ignore";
              return (
                <tr className={cn("transition hover:bg-[#f5f0e8]", ignored && "opacity-60")} key={column.source_column}>
                  <td className="border-r border-[#e6dfd8] px-4 py-3 align-top">
                    <div className="flex items-start gap-2">
                      <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", column.confidence === "높음" ? "bg-[#5db8a6]" : column.confidence === "보통" ? "bg-[#e8a55a]" : "bg-[#c6bbae]")} />
                      <div>
                        <p className="font-mono text-sm font-bold text-[#252523]">{column.source_column}</p>
                        <p className="mt-1 text-xs font-semibold text-[#8e8b82]">추정 신뢰도 {column.confidence}</p>
                      </div>
                    </div>
                  </td>
                  <td className="border-r border-[#e6dfd8] px-4 py-3 align-top">
                    <select
                      className="h-10 w-full rounded-lg border border-[#e6dfd8] bg-[#faf9f5] px-3 text-sm font-semibold text-[#252523] outline-none transition focus:border-[#cc785c] focus:ring-4 focus:ring-[#e6dfd8]"
                      onChange={(event) => onMappingChange(column.source_column, event.target.value)}
                      value={selectedField}
                    >
                      {preview.standard_fields.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      {column.sample_values.length ? (
                        column.sample_values.map((value, index) => (
                          <span className="max-w-[240px] truncate rounded-lg border border-[#e6dfd8] bg-[#f5f0e8] px-2.5 py-1 font-mono text-xs text-[#6c6a64]" key={`${column.source_column}-${index}`}>
                            {value}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-lg bg-[#f5f0e8] px-2.5 py-1 text-xs font-semibold text-[#8e8b82]">샘플 없음</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {preview.warnings.length ? (
        <div className="border-t border-[#e6dfd8] bg-[#fff7e8] p-4 text-sm font-semibold text-[#8a6127]">
          {preview.warnings.join(" ")}
        </div>
      ) : null}
    </div>
  );
}

function RecognitionPanel({ recognition }: { recognition: RecognitionResponse }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-[#141413] text-[#faf9f5]">
        <SectionKicker icon={<Layers3 size={16} />} label="2. 자료 인식 결과" tone="dark" />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-black">{recognition.source_name}</h3>
            <p className="mt-1 text-sm text-[#d9cbbb]">이 자료를 {recognition.source_type} 자료로 인식했습니다.</p>
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
        <div className="rounded-2xl border border-[#e6dfd8] bg-[#f5f0e8] p-4">
          <p className="text-sm font-black text-[#141413]">추출 내용 미리보기</p>
          <div className="mt-3 grid gap-2">
            {recognition.preview_segments.slice(0, 5).map((segment) => (
              <p className="rounded-xl bg-[#faf9f5] px-3 py-2 text-sm leading-6 text-[#6c6a64]" key={segment.id}>
                <strong className="text-[#141413]">{segment.participant}</strong> · {segment.question_or_topic}: {segment.content}
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
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#efe9de] text-[#a9583e]">
          <Sparkles size={24} />
        </div>
        <h3 className="mt-4 text-lg font-black">분석 결과가 이곳에 정리됩니다</h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#6c6a64]">자료 인식 후 AI 분석을 시작하면 핵심 결론, 검수 가능한 인사이트, 보고서 초안이 순서대로 생성됩니다.</p>
        {loading ? (
          <div className="mt-5 w-full max-w-md rounded-2xl bg-[#f5f0e8] p-4 text-left">
            <p className="text-sm font-bold text-[#252523]">{analysisStage}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e8e0d2]">
              <motion.div className="h-full rounded-full bg-[#cc785c]" initial={{ width: "12%" }} animate={{ width: "88%" }} transition={{ duration: 2.2, repeat: Infinity, repeatType: "reverse" }} />
            </div>
          </div>
        ) : null}
        {canAnalyze ? (
          <Button className="mt-5" disabled={loading} onClick={onAnalyze}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            AI 분석 시작
          </Button>
        ) : (
          <div className="mt-5 rounded-2xl bg-[#f5f0e8] px-4 py-3 text-sm font-semibold text-[#6c6a64]">
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
        <p className="mt-2 text-sm leading-6 text-[#6c6a64]">
          {result ? "승인한 인사이트만 보고서 초안에 반영됩니다." : recognition ? "분석은 원자료를 나눠 읽고 근거 발화를 연결합니다." : "파일 업로드 또는 텍스트 입력 후 자료 인식 결과를 확인하세요."}
        </p>
        {recognition && !result ? (
          <Button className="mt-5 w-full" disabled={!canAnalyze || loading} onClick={onAnalyze}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
            {loading ? "인사이트 후보 생성 중" : "AI 분석 시작"}
          </Button>
        ) : (
          <div className="mt-5 rounded-2xl bg-[#f5f0e8] p-4 text-sm font-semibold text-[#6c6a64]">
            {result ? "검수 카드에서 승인 여부를 결정하세요." : "먼저 자료 인식 결과 확인을 진행하세요."}
          </div>
        )}
        {loading ? (
          <div className="mt-4 rounded-2xl bg-[#f5f0e8] p-3">
            <p className="text-xs font-bold text-[#6c6a64]">현재 처리 단계</p>
            <p className="mt-1 text-sm font-semibold text-[#252523]">{analysisStage}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SupportPanel({ result }: { result: AnalysisResponse | null }) {
  const insights = result?.analysis.insights ?? [];
  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-black">보조 탐색</h3>
      </CardHeader>
      <CardContent className="grid gap-4">
        {result ? (
          <>
            <div>
              <p className="text-xs font-bold text-[#6c6a64]">영향도 분포</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["높음", "보통", "낮음"].map((level) => (
                  <Badge key={level} variant="blue">
                    {level} · {insights.filter((insight) => insight.severity === level).length}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[#6c6a64]">관련 태스크</p>
              <div className="mt-2 grid gap-2">
                {Array.from(new Set(insights.flatMap((insight) => insight.related_tasks))).slice(0, 4).map((task) => (
                  <div className="rounded-xl bg-[#f5f0e8] p-3" key={task}>
                    <p className="text-sm font-bold">{task}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm leading-6 text-[#6c6a64]">분석이 완료되면 영향도와 관련 태스크가 이곳에 표시됩니다.</p>
        )}
      </CardContent>
    </Card>
  );
}

function FindingsWorkspace({
  attentionCount,
  onMoveSegment,
  onUpdateInsight,
  reportInsights,
  result,
  reviewedInsights,
  segmentById,
  segmentTopicOverrides
}: {
  attentionCount: number;
  onMoveSegment: (segmentId: string, topicId: string) => void;
  onUpdateInsight: (insightId: string, updates: Partial<ReviewedInsight>) => void;
  reportInsights: ReviewedInsight[];
  result: AnalysisResponse;
  reviewedInsights: ReviewedInsight[];
  segmentById: Map<string, Segment>;
  segmentTopicOverrides: Record<string, string>;
}) {
  const [selectedInsightId, setSelectedInsightId] = useState(reviewedInsights[0]?.id ?? "");
  const [filter, setFilter] = useState<"all" | FindingStatus>("all");
  const selectedInsight = reviewedInsights.find((insight) => insight.id === selectedInsightId) ?? reviewedInsights[0];
  const filteredInsights = reviewedInsights.filter((insight) => filter === "all" || insight.findingStatus === filter);

  useEffect(() => {
    if (!reviewedInsights.length) {
      setSelectedInsightId("");
      return;
    }
    if (!reviewedInsights.some((insight) => insight.id === selectedInsightId)) {
      setSelectedInsightId(reviewedInsights[0].id);
    }
  }, [reviewedInsights, selectedInsightId]);

  function findingStatusLabel(status: FindingStatus) {
    switch (status) {
      case "auto_included": return "자동 반영";
      case "needs_attention": return "확인 필요";
      case "hidden": return "숨김";
      case "pinned": return "고정";
      case "edited": return "수정됨";
    }
  }

  function findingStatusBadgeVariant(status: FindingStatus) {
    if (status === "auto_included" || status === "pinned") return "green" as const;
    if (status === "needs_attention") return "amber" as const;
    return "muted" as const;
  }

  function riskFlagLabel(flag: RiskFlag) {
    switch (flag) {
      case "weak_evidence": return "근거 부족";
      case "overgeneralized": return "일반화 주의";
      case "duplicate_candidate": return "중복 가능성";
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 2xl:grid-cols-[minmax(360px,0.95fr)_minmax(420px,1.05fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <SectionKicker icon={<ClipboardCheck size={16} />} label="Findings" />
              <h3 className="mt-2 text-lg font-black">인사이트 결과가 자동으로 반영되었습니다</h3>
              {attentionCount > 0 ? (
                <p className="mt-1 text-sm font-semibold text-[#a9583e]">확인 필요 {attentionCount}개가 있습니다</p>
              ) : null}
            </div>
            <div className="grid grid-cols-4 rounded-xl bg-[#efe9de] p-1 text-xs font-bold text-[#6c6a64]">
              {(["all", "auto_included", "needs_attention", "hidden"] as const).map((status) => (
                <button
                  className={cn(
                    "rounded-lg px-3 py-2 transition",
                    filter === status && "bg-[#faf9f5] text-[#141413] shadow-sm"
                  )}
                  key={status}
                  onClick={() => setFilter(status)}
                  type="button"
                >
                  {status === "all" ? "전체" : findingStatusLabel(status)}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="max-h-[720px] overflow-y-auto bg-[#f5f0e8] p-4">
            <div className="grid gap-3">
              {filteredInsights.length ? (
                filteredInsights.map((insight, index) => {
                  const isSelected = insight.id === selectedInsight?.id;
                  return (
                    <button
                      className={cn(
                        "relative rounded-2xl border bg-[#faf9f5] p-4 text-left shadow-sm transition hover:border-[#cc785c]/60",
                        isSelected ? "border-[#cc785c] ring-1 ring-[#cc785c]/30" : "border-[#e6dfd8]",
                        insight.findingStatus === "hidden" && "opacity-60"
                      )}
                      key={insight.id}
                      onClick={() => setSelectedInsightId(insight.id)}
                      type="button"
                    >
                      {isSelected ? <span className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-[#cc785c]" /> : null}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={findingStatusBadgeVariant(insight.findingStatus)}>
                            {findingStatusLabel(insight.findingStatus)}
                          </Badge>
                          {insight.riskFlags.map((flag) => (
                            <Badge key={flag} variant="muted">{riskFlagLabel(flag)}</Badge>
                          ))}
                          <Badge variant="muted">{readableInsightType(insight.type)}</Badge>
                        </div>
                        <span className="text-xs font-black text-[#8e8b82]">{index + 1}</span>
                      </div>
                      <h4 className="mt-3 line-clamp-2 text-sm font-black leading-6 text-[#141413]">{insight.title}</h4>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#6c6a64]">{insight.summary}</p>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#ebe6df] pt-3">
                        <span className="text-xs font-bold text-[#a9583e]">영향도 {insight.severity}</span>
                        <span className="text-xs font-bold text-[#6c6a64]">빈도 {insight.frequency}</span>
                        <span className="text-xs font-bold text-[#6c6a64]">신뢰도 {insight.confidence}</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-[#e6dfd8] bg-[#faf9f5] p-8 text-center text-sm text-[#6c6a64]">
                  이 필터에 해당하는 인사이트가 없습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <InsightInspector
          insight={selectedInsight}
          onUpdateInsight={onUpdateInsight}
          segmentById={segmentById}
        />
      </div>

      <AffinityBoard onMoveSegment={onMoveSegment} result={result} segmentById={segmentById} segmentTopicOverrides={segmentTopicOverrides} />
    </div>
  );
}

function InsightInspector({
  insight,
  onUpdateInsight,
  segmentById
}: {
  insight: ReviewedInsight | undefined;
  onUpdateInsight: (insightId: string, updates: Partial<ReviewedInsight>) => void;
  segmentById: Map<string, Segment>;
}) {
  if (!insight) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-[#6c6a64]">검수할 인사이트를 선택하세요.</CardContent>
      </Card>
    );
  }

  const evidenceSegmentIds = getEvidenceSegmentIds(insight);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="sticky top-0 z-10 flex flex-col gap-4 bg-[#faf9f5] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <SectionKicker icon={<Sparkles size={16} />} label="상세 검수" />
          <h3 className="mt-2 text-lg font-black">근거와 제안을 함께 확인하세요</h3>
        </div>
        <div className="flex gap-2 rounded-xl bg-[#efe9de] p-1 text-xs font-bold text-[#6c6a64]">
          <button
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 transition",
              insight.findingStatus === "pinned" && "bg-[#faf9f5] text-[#141413] shadow-sm"
            )}
            onClick={() => onUpdateInsight(insight.id, { findingStatus: "pinned" })}
            type="button"
          >
            <BadgeCheck size={14} />
            고정
          </button>
          <button
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 transition",
              insight.findingStatus === "hidden" && "bg-[#faf9f5] text-[#141413] shadow-sm"
            )}
            onClick={() => onUpdateInsight(insight.id, { findingStatus: "hidden" })}
            type="button"
          >
            <CircleSlash size={14} />
            숨기기
          </button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="muted">{readableInsightType(insight.type)}</Badge>
            <Badge variant="amber">영향도 {insight.severity}</Badge>
            <Badge variant="blue">빈도 {insight.frequency}</Badge>
            <Badge variant="green">신뢰도 {insight.confidence}</Badge>
          </div>
          <h4 className="mt-4 text-xl font-black leading-8 text-[#141413]">{insight.title}</h4>
          <p className="mt-3 text-sm leading-7 text-[#3d3d3a]">{insight.summary}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="인사이트 제목">
            <Input value={insight.title} onChange={(event) => onUpdateInsight(insight.id, { title: event.target.value, findingStatus: "edited" })} />
          </Field>
          <Field label="유형">
            <Input value={readableInsightType(insight.type)} readOnly />
          </Field>
        </div>

        <Field label="맥락과 반복 패턴">
          <Textarea
            className="min-h-28"
            value={insight.summary}
            onChange={(event) => onUpdateInsight(insight.id, { summary: event.target.value, findingStatus: "edited" })}
          />
        </Field>

        <div className="grid gap-4 lg:grid-cols-3">
          {(["severity", "frequency", "confidence"] as const).map((field) => (
            <Field key={field} label={field === "severity" ? "영향도" : field === "frequency" ? "빈도" : "신뢰도"}>
              <Input value={insight[field]} onChange={(event) => onUpdateInsight(insight.id, { [field]: event.target.value, findingStatus: "edited" })} />
            </Field>
          ))}
        </div>

        <Field label="개선 제안">
          <Textarea
            className="min-h-28"
            value={insight.recommendation}
            onChange={(event) => onUpdateInsight(insight.id, { recommendation: event.target.value, findingStatus: "edited" })}
          />
        </Field>

        <div className="rounded-2xl border border-[#e6dfd8] bg-[#f5f0e8] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-[#141413]">근거 발화</p>
            <Badge variant="muted">{evidenceSegmentIds.length}개 연결</Badge>
          </div>
          <div className="mt-3 grid gap-3">
            {evidenceSegmentIds.length ? (
              evidenceSegmentIds.slice(0, 5).map((segmentId) => {
                const segment = segmentById.get(segmentId);
                if (!segment) return null;
                return (
                  <blockquote className="rounded-xl border-l-2 border-[#cc785c] bg-[#faf9f5] p-4 text-sm leading-6 text-[#3d3d3a]" key={segmentId}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-[#6c6a64]">
                      <span>{segment.participant}</span>
                      <span>{segment.question_or_topic}</span>
                    </div>
                    {segment.content}
                  </blockquote>
                );
              })
            ) : (
              <p className="rounded-xl bg-[#faf9f5] p-4 text-sm text-[#6c6a64]">연결된 근거 발화가 없습니다.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
  const evidenceSegmentIds = getEvidenceSegmentIds(insight);
  const evidencePreview = evidenceSegmentIds
    .map((segmentId) => segmentById.get(segmentId))
    .find(Boolean);
  return (
    <motion.article
      className={cn(
        "rounded-2xl border bg-white p-4 shadow-sm transition",
        (insight.findingStatus === "auto_included" || insight.findingStatus === "pinned" || insight.findingStatus === "edited") && "border-emerald-200 bg-emerald-50/30",
        insight.findingStatus === "needs_attention" && "border-amber-200",
        insight.findingStatus === "hidden" && "border-slate-200 opacity-65"
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">{index + 1}</span>
          <Badge variant={(insight.findingStatus === "auto_included" || insight.findingStatus === "pinned") ? "green" : insight.findingStatus === "hidden" ? "muted" : "amber"}>
            {insight.findingStatus === "auto_included" ? "자동 반영" : insight.findingStatus === "needs_attention" ? "확인 필요" : insight.findingStatus === "pinned" ? "고정" : insight.findingStatus === "edited" ? "수정됨" : "숨김"}
          </Badge>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-500">
          <button
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 transition",
              insight.findingStatus === "pinned" && "bg-white text-slate-950 shadow-sm"
            )}
            onClick={() => onUpdateInsight(insight.id, { findingStatus: "pinned" })}
            type="button"
          >
            <BadgeCheck size={14} />
            고정
          </button>
          <button
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 transition",
              insight.findingStatus === "hidden" && "bg-white text-slate-950 shadow-sm"
            )}
            onClick={() => onUpdateInsight(insight.id, { findingStatus: "hidden" })}
            type="button"
          >
            <CircleSlash size={14} />
            숨기기
          </button>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="text-lg font-black leading-7 text-slate-950">{insight.title}</h4>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{insight.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="amber">영향도 {insight.severity}</Badge>
          <Badge variant="blue">빈도 {insight.frequency}</Badge>
          <Badge variant="muted">신뢰도 {insight.confidence}</Badge>
        </div>
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
            <Input value={insight.title} onChange={(event) => onUpdateInsight(insight.id, { title: event.target.value, findingStatus: "edited" })} />
          </Field>
          <Field label="구조적 해석">
            <Textarea
              className="min-h-28"
              value={insight.summary}
              onChange={(event) => onUpdateInsight(insight.id, { summary: event.target.value, findingStatus: "edited" })}
            />
          </Field>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="영향도 / 빈도 / 신뢰도">
              <div className="grid gap-2 sm:grid-cols-3">
                {(["severity", "frequency", "confidence"] as const).map((field) => (
                  <Input
                    key={field}
                    value={insight[field]}
                    onChange={(event) => onUpdateInsight(insight.id, { [field]: event.target.value, findingStatus: "edited" })}
                  />
                ))}
              </div>
            </Field>
            <Field label="권장 조치">
              <Textarea
                className="min-h-24"
                value={insight.recommendation}
                onChange={(event) => onUpdateInsight(insight.id, { recommendation: event.target.value, findingStatus: "edited" })}
              />
            </Field>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-black text-slate-800">근거 발화</p>
            <div className="mt-3 grid gap-2">
              {evidenceSegmentIds.slice(0, 4).map((segmentId) => {
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
  attentionCount,
  onDownload,
  recognition,
  reportInsights,
  reportMarkdown,
  result
}: {
  attentionCount: number;
  onDownload: () => void;
  recognition: RecognitionResponse | null;
  reportInsights: ReviewedInsight[];
  reportMarkdown: string;
  result: AnalysisResponse;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionKicker icon={<FileText size={16} />} label="4. 보고서 초안" />
          <h3 className="mt-2 text-lg font-black">자동 반영된 인사이트로 보고서를 구성했습니다</h3>
        </div>
        <Button disabled={!reportMarkdown} onClick={onDownload} variant="secondary">
          <Download size={18} />
          Markdown 다운로드
        </Button>
      </CardHeader>
      <CardContent>
        {attentionCount > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            확인 필요 {attentionCount}개 — Findings 탭에서 검토하세요.
          </div>
        )}
        {reportInsights.length ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <article className="mx-auto max-w-3xl">
              <p className="text-sm font-bold text-slate-500">UX 리서치 보고서 초안</p>
              <h2 className="mt-2 text-2xl font-black ">{result.project_name}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MetricCard label="자료" value={result.source_name} />
                <MetricCard label="반영 인사이트" value={`${reportInsights.length}개`} />
                <MetricCard label="자료 유형" value={recognition?.source_type || "미확인"} />
              </div>
              <ReportSection title="Executive Summary">
                이번 분석에서는 {reportInsights.length}개의 핵심 인사이트가 자동으로 반영되었습니다. 반영된 항목은 아래 핵심 발견과 개선 제안에 포함됩니다.
              </ReportSection>
              <ReportSection title="핵심 발견">
                <div className="grid gap-4">
                  {reportInsights.map((insight, index) => (
                    <div className="rounded-2xl bg-slate-50 p-4" key={insight.id}>
                      <h4 className="font-black">{index + 1}. {insight.title}</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{insight.summary}</p>
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
            분석이 완료되면 자동 반영 인사이트로 보고서 초안이 생성됩니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SynthesisPlaceholder({ sources }: { sources: SourceRecord[] }) {
  const analyzedSources = sources.filter((source) => source.status === "분석완료");
  return (
    <Card>
      <CardHeader>
        <SectionKicker icon={<Network size={16} />} label="종합" />
        <h3 className="mt-2 text-lg font-black">소스 간 패턴을 연결하는 단계입니다</h3>
        <p className="mt-1 text-sm leading-6 text-[#6c6a64]">
          개별 분석이 완료된 소스들의 인사이트를 모아 반복 패턴, 소스별 특이점, 상충되는 발견을 분리합니다.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="전체 소스" value={`${sources.length}개`} />
          <MetricCard label="분석 완료" value={`${analyzedSources.length}개`} />
          <MetricCard label="필요 조건" value="2개 이상" />
        </div>
        <div className="rounded-2xl bg-[#f5f0e8] p-4 text-sm leading-6 text-[#6c6a64]">
          다음 구현 단계에서 이 영역에 `종합 인사이트 도출` 버튼과 cross-source synthesis 결과가 들어갑니다.
        </div>
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
  const topicOptions = result.analysis.topics?.slice(0, 6) ?? [];
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
  const topicSegmentIds = useMemo(() => {
    const map = new Map<string, string[]>();
    topicOptions.forEach((topic) => map.set(topic.id, []));
    (result.analysis.topics ?? []).forEach((topic) => {
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
  }, [result.analysis.topics, segmentTopicOverrides, topicOptions]);

  if (!topicOptions.length) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
	          <SectionKicker icon={<Network size={16} />} label="어피니티 보드" />
		          <h3 className="mt-2 text-lg font-black">발화가 어떤 주제로 모였는지 보드에서 훑어보세요</h3>
		          <p className="mt-1 text-sm leading-6 text-slate-500">어색하게 묶인 포스트잇은 끌어서 다른 주제 영역에 놓을 수 있습니다.</p>
        </div>
        <Badge variant="blue">{topicOptions.length}개 주제</Badge>
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

function normalizeProject(project: ProjectSummary & { project_slug?: string }): ProjectSummary {
  const slug = project.slug || project.project_slug || "";
  return {
    ...project,
    slug,
    name: project.name || project.project_name || slug || "이름 없는 프로젝트"
  };
}

function isTabularFile(filename: string) {
  const normalized = filename.toLowerCase();
  return normalized.endsWith(".csv") || normalized.endsWith(".xlsx");
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function splitTextareaLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function readableInsightType(type: string) {
  const labels: Record<string, string> = {
    pain_point: "페인포인트",
    usability_issue: "사용성 이슈",
    positive_signal: "긍정 신호",
    task_friction: "태스크 마찰",
  };
  return labels[type] ?? type;
}

function buildReportMarkdown(
  projectName: string,
  recognition: RecognitionResponse | null,
  result: AnalysisResponse | null,
  reportInsights: ReviewedInsight[],
  segmentById: Map<string, Segment>
) {
  if (!result || !reportInsights.length) return "";

  const typeSummary = Array.from(new Set(reportInsights.map((insight) => insight.type)))
    .map((type) => `- ${type}: ${reportInsights.filter((insight) => insight.type === type).length}개`)
    .join("\n");

  const findingSections = reportInsights
    .map((insight, index) => {
      const evidence = getEvidenceSegmentIds(insight)
        .slice(0, 3)
        .map((segmentId) => segmentById.get(segmentId))
        .filter(Boolean)
        .map((segment) => `  - ${segment?.participant} · ${segment?.question_or_topic}: ${segment?.content}`)
        .join("\n");

      return `### ${index + 1}. ${insight.title}

${insight.summary}

**영향도 / 빈도 / 신뢰도**
${insight.severity} / ${insight.frequency} / ${insight.confidence}

**개선 제안**
${insight.recommendation}

**근거 발화**
${evidence || "  - 연결된 근거 발화가 없습니다."}`;
    })
    .join("\n\n");

  const appendixEvidence = reportInsights
    .flatMap((insight) => getEvidenceSegmentIds(insight))
    .filter((segmentId, index, segmentIds) => segmentIds.indexOf(segmentId) === index)
    .map((segmentId) => segmentById.get(segmentId))
    .filter(Boolean)
    .map((segment) => `- ${segment?.participant} · ${segment?.question_or_topic}: ${segment?.content}`)
    .join("\n");

  return `# ${projectName} UX 리서치 보고서 초안

## Executive Summary
이번 분석에서는 ${reportInsights.length}개의 핵심 인사이트가 자동으로 반영되었습니다.

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

## 인사이트 유형
${typeSummary || "- 추가 검토가 필요합니다."}

## 개선 제안
${reportInsights.map((insight, index) => `${index + 1}. ${insight.recommendation}`).join("\n")}

## Appendix
${appendixEvidence || "- 반영된 인사이트에 연결된 근거 발화가 없습니다."}
`;
}

function getEvidenceSegmentIds(insight: Insight) {
  return (insight.supporting_quotes ?? [])
    .map((quote) => quote.source_id)
    .filter(Boolean)
    .concat(insight.evidence_segment_ids ?? [])
    .filter((segmentId, index, segmentIds) => segmentIds.indexOf(segmentId) === index);
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
