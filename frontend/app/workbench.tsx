"use client";

import type { DragEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleSlash,
  ClipboardCheck,
  ClipboardPaste,
  Database,
  Download,
  FileText,
  FileUp,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  Loader2,
  MessageSquare,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { cn } from "../lib/utils";
import InsightGraph from "../components/InsightGraph";
import type {
  AnalysisResponse,
  ChatMessage,
  Citation,
  DraftState,
  Insight,
  InsightRelationship,
  ProjectSummary,
  RecognitionResponse,
  ReviewedInsight,
  RiskFlag,
  Segment,
  SourceRecord,
} from "../lib/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://localhost:8000");
const DRAFT_STORAGE_KEY = "cxi-studio:draft:v1";
type ArtifactKind = "insights" | "affinity" | "insight-map" | "report";

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
  const [recognition, setRecognition] = useState<RecognitionResponse | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [reviewedInsights, setReviewedInsights] = useState<ReviewedInsight[]>([]);
  const [segmentTopicOverrides, setSegmentTopicOverrides] = useState<Record<string, string>>({});
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysisStageIndex, setAnalysisStageIndex] = useState(0);
  const [error, setError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<ArtifactKind | null>(null);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [studioCollapsed, setStudioCollapsed] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [checkedSourceIds, setCheckedSourceIds] = useState<string[]>([]);
  const draftRestoredRef = useRef(false);
  const suppressNextSaveRef = useRef(false);
  const affinityHydratedRef = useRef(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadSources(activeProjectSlug);
  }, [activeProjectSlug]);

  // 소스 목록이 바뀌면 체크 상태 동기화 — 기존 선택 유지 + 새 소스는 기본 체크.
  useEffect(() => {
    setCheckedSourceIds((prev) => {
      const ids = sources.map((source) => source.id);
      if (prev.length === 0) return ids;
      const kept = prev.filter((id) => ids.includes(id));
      const added = ids.filter((id) => !prev.includes(id));
      return [...kept, ...added];
    });
  }, [sources]);

  useEffect(() => {
    if (!selectedSourceId || !activeProjectSlug || !affinityHydratedRef.current) return;
    const timer = setTimeout(() => {
      fetch(
        `${API_BASE}/api/projects/${encodeURIComponent(activeProjectSlug)}/sources/${encodeURIComponent(selectedSourceId)}/affinity`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ overrides: segmentTopicOverrides }),
        }
      ).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [segmentTopicOverrides, selectedSourceId, activeProjectSlug]);

  const segmentById = useMemo(() => {
    const map = new Map<string, Segment>();
    result?.segments.forEach((segment) => map.set(segment.id, segment));
    return map;
  }, [result]);

  // 기본은 전부 반영. 사용자가 명시적으로 제외(hidden)한 항목만 리포트에서 빠진다.
  const reportInsights = useMemo(
    () => reviewedInsights.filter((i) => i.findingStatus !== "hidden"),
    [reviewedInsights]
  );
  const excludedCount = reviewedInsights.filter((i) => i.findingStatus === "hidden").length;
  const autoIncludedCount = reportInsights.length;

  useEffect(() => {
    let cancelled = false;
    if (!result || !reportInsights.length) {
      setReportMarkdown("");
      setReportLoading(false);
      return;
    }

    setReportLoading(true);
    fetch(`${API_BASE}/api/report/markdown`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: projectName,
        source_name: result.source_name,
        source_type: recognition?.source_type ?? "",
        segment_count: recognition?.segment_count ?? result.segment_count,
        participant_utterance_count: recognition?.participant_utterance_count ?? null,
        participants: recognition?.participants ?? [],
        insights: reportInsights,
        segments: result.segments,
      }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail ?? "보고서 Markdown 생성에 실패했습니다.");
        }
        if (!cancelled) setReportMarkdown(data.markdown ?? "");
      })
      .catch((requestError) => {
        if (!cancelled) {
          setReportMarkdown("");
          setError(requestError instanceof Error ? requestError.message : "보고서 Markdown 생성 중 오류가 발생했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setReportLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectName, recognition, reportInsights, result]);

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

  async function loadSourceAffinity(projectSlug: string, sourceId: string) {
    try {
      const response = await fetch(
        `${API_BASE}/api/projects/${encodeURIComponent(projectSlug)}/sources/${encodeURIComponent(sourceId)}/affinity`
      );
      if (!response.ok) return {};
      const data = await response.json();
      return data.overrides ?? {};
    } catch {
      return {};
    }
  }

  async function selectSource(sourceId: string) {
    if (!activeProjectSlug) {
      setSelectedSourceId(sourceId);
      return;
    }
    const source = sources.find((item) => item.id === sourceId);
    affinityHydratedRef.current = false;
    setSelectedSourceId(sourceId);
    setError("");
    const overrides = await loadSourceAffinity(activeProjectSlug, sourceId);
    setSegmentTopicOverrides(overrides);
    affinityHydratedRef.current = true;

    if (source?.status !== "분석완료") return;

    try {
      const response = await fetch(
        `${API_BASE}/api/projects/${encodeURIComponent(activeProjectSlug)}/sources/${encodeURIComponent(sourceId)}/analysis`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? "저장된 분석 결과를 불러오지 못했습니다.");
      }
      setResult(data);
      setRecognition(data.recognition ?? null);
      setReviewedInsights(
        data.analysis.insights.map((insight: Insight) => ({
          ...insight,
          ...assignFindingStatus(insight),
        }))
      );
      setProjectMessage("저장된 분석 결과를 불러왔습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "저장된 분석 결과를 불러오는 중 오류가 발생했습니다.");
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
      setSelectedSourceId("");
      affinityHydratedRef.current = false;
      setRecognition(null);
      setResult(null);
      setReviewedInsights([]);
      setSegmentTopicOverrides({});
      await loadSources(selected.slug);
      setActiveArtifact(null);
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
      if (typeof draft.selectedSourceId === "string") setSelectedSourceId(draft.selectedSourceId);
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
      selectedSourceId,
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
  }, [activeProjectSlug, evaluationCriteriaText, inputMode, projectName, recognition, researchGoal, result, reviewedInsights, segmentTopicOverrides, selectedSourceId, sourceName, tasksText, text]);

  function assignFindingStatus(insight: Insight): Pick<ReviewedInsight, "findingStatus" | "riskFlags"> {
    const quoteCount = insight.supporting_quotes?.length ?? 0;
    if (quoteCount === 0) return { findingStatus: "needs_attention", riskFlags: ["weak_evidence"] };
    if (insight.confidence === "낮음") return { findingStatus: "needs_attention", riskFlags: ["overgeneralized"] };
    return { findingStatus: "auto_included", riskFlags: [] };
  }

  async function runAnalysis(selectedFile = file, mode: "file" | "text" = inputMode) {
    setLoading(true);
    setAnalysisStageIndex(0);
    setError("");
    setResult(null);
    setReviewedInsights([]);
    setSegmentTopicOverrides({});
    setRecognition(null);
    const stageTimer = window.setInterval(() => {
      setAnalysisStageIndex((current) => Math.min(current + 1, analysisStages.length - 1));
    }, 2500);
    try {
      const parseResponse = mode === "file" && selectedFile
        ? await recognizeFile(selectedFile)
        : await recognizeText();
      const parseData = await parseResponse.json();
      if (!parseResponse.ok) throw new Error(parseData.detail ?? "자료 인식에 실패했습니다.");
      setRecognition(parseData);

      const analyzeResponse = mode === "file" && selectedFile
        ? await analyzeFile(selectedFile)
        : await analyzeText();
      const analyzeData = await analyzeResponse.json();
      if (!analyzeResponse.ok) throw new Error(formatErrorMessage(analyzeData.detail ?? "분석 요청에 실패했습니다."));
      setResult(analyzeData);
      if (analyzeData.source?.id) setSelectedSourceId(analyzeData.source.id);
      setReviewedInsights(
        analyzeData.analysis.insights.map((insight: Insight) => ({
          ...insight,
          ...assignFindingStatus(insight),
        }))
      );
      setUploadOpen(false);
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
      affinityHydratedRef.current = true;
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
      affinityHydratedRef.current = false;
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
      if (data.recognition) setRecognition(data.recognition);
      setReviewedInsights(
        data.analysis.insights.map((insight: Insight) => ({
          ...insight,
          ...assignFindingStatus(insight),
        }))
      );
      const overrides = await loadSourceAffinity(activeProjectSlug, source.id);
      setSegmentTopicOverrides(overrides);
      affinityHydratedRef.current = true;
      setSources((current) => current.map((item) => (item.id === source.id ? data.source : item)));
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
    setSelectedSourceId("");
    affinityHydratedRef.current = false;
    setInputMode("file");
    setRecognition(null);
    setResult(null);
    setReviewedInsights([]);
    setSegmentTopicOverrides({});
    setError("");
    if (selectedFile) {
      setSourceName(selectedFile.name);
      void uploadSourceToLibrary(selectedFile);
      void runAnalysis(selectedFile, "file");
    }
  }

  function updateInsight(insightId: string, updates: Partial<ReviewedInsight>) {
    setReviewedInsights((current) =>
      current.map((insight) => (insight.id === insightId ? { ...insight, ...updates } : insight))
    );
  }

  function toggleCheckedSource(sourceId: string) {
    setCheckedSourceIds((current) =>
      current.includes(sourceId) ? current.filter((id) => id !== sourceId) : [...current, sourceId]
    );
  }

  function toggleAllSources() {
    setCheckedSourceIds((current) => (current.length === sources.length ? [] : sources.map((source) => source.id)));
  }

  async function sendChat(questionOverride = "") {
    const question = (questionOverride || chatInput).trim();
    if (!question || !activeProjectSlug || chatLoading) return;
    const history = chatMessages.map((message) => ({ role: message.role, content: message.content }));
    setChatMessages((current) => [...current, { role: "user", content: question }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(activeProjectSlug)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, source_ids: checkedSourceIds, history }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(formatErrorMessage(data.detail ?? "답변 생성에 실패했습니다."));
      setChatMessages((current) => [...current, { role: "assistant", content: data.answer, citations: data.citations }]);
    } catch (requestError) {
      setChatMessages((current) => [
        ...current,
        { role: "assistant", content: requestError instanceof Error ? requestError.message : "답변 중 오류가 발생했습니다." },
      ]);
    } finally {
      setChatLoading(false);
    }
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
    setRecognition(null);
    setResult(null);
    setReviewedInsights([]);
    setSegmentTopicOverrides({});
    setError("");
    setLastSavedAt("");
    setActiveArtifact(null);
    setUploadOpen(false);
  }

  return (
    <main className="flex min-h-screen flex-col text-[#141413]">
      <TopBar
        activeProjectSlug={activeProjectSlug}
        autoIncludedCount={autoIncludedCount}
        canDownload={Boolean(reportMarkdown) && !reportLoading}
        lastSavedAt={lastSavedAt}
        onClearDraft={clearDraft}
        onCreateProject={createCurrentProject}
        onDeleteProject={removeProject}
        onDownload={() => downloadMarkdown(reportMarkdown)}
        onSelectProject={selectProject}
        projectLoading={projectLoading}
        projectMessage={projectMessage}
        projectName={projectName}
        projects={projects}
      />

      <div className="mx-auto flex w-full max-w-[1700px] flex-1 flex-col lg:h-[calc(100vh-61px)] lg:min-h-0 lg:flex-row lg:overflow-hidden">
        <SourcesPanel
          activeSourceId={selectedSourceId}
          analysisStage={analysisStages[analysisStageIndex]}
          checkedSourceIds={checkedSourceIds}
          collapsed={sourcesCollapsed}
          loading={loading}
          onAddSource={() => setUploadOpen(true)}
          onAnalyzeSource={analyzeLibrarySource}
          onDeleteSource={deleteLibrarySource}
          onSelectSource={selectSource}
          onToggleCollapse={() => setSourcesCollapsed((value) => !value)}
          onToggleSource={toggleCheckedSource}
          onToggleAll={toggleAllSources}
          sources={sources}
        />

        <ChatPanel
          checkedCount={checkedSourceIds.length}
          error={error}
          hasSources={sources.length > 0}
          input={chatInput}
          loading={chatLoading}
          messages={chatMessages}
          onSend={sendChat}
          setInput={setChatInput}
        />

        <StudioPanel
          collapsed={studioCollapsed}
          onOpenArtifact={setActiveArtifact}
          onToggleCollapse={() => setStudioCollapsed((value) => !value)}
          relationshipsCount={result?.analysis.relationships?.length ?? 0}
          reportInsightsCount={reportInsights.length}
          resultReady={Boolean(result)}
        />
      </div>

      {uploadOpen ? (
        <UploadModal
          analysisStage={analysisStages[analysisStageIndex]}
          loading={loading}
          onAnalyzeText={() => {
            setInputMode("text");
            void runAnalysis(null, "text");
          }}
          onClose={() => setUploadOpen(false)}
          onPickFile={handleFileChange}
          setText={setText}
          text={text}
        />
      ) : null}

      {activeArtifact && result ? (
        <ArtifactModal
          excludedCount={excludedCount}
          kind={activeArtifact}
          onClose={() => setActiveArtifact(null)}
          onDownload={() => downloadMarkdown(reportMarkdown)}
          onMoveSegment={(segmentId, topicId) =>
            setSegmentTopicOverrides((current) => ({ ...current, [segmentId]: topicId }))
          }
          onUpdateInsight={updateInsight}
          recognition={recognition}
          reportInsights={reportInsights}
          reportLoading={reportLoading}
          reportMarkdown={reportMarkdown}
          result={result}
          reviewedInsights={reviewedInsights}
          segmentById={segmentById}
          segmentTopicOverrides={segmentTopicOverrides}
        />
      ) : null}
    </main>
  );
}

function TopBar({
  activeProjectSlug,
  autoIncludedCount,
  canDownload,
  lastSavedAt,
  onClearDraft,
  onCreateProject,
  onDeleteProject,
  onDownload,
  onSelectProject,
  projectLoading,
  projectMessage,
  projectName,
  projects
}: {
  activeProjectSlug: string;
  autoIncludedCount: number;
  canDownload: boolean;
  lastSavedAt: string;
  onClearDraft: () => void;
  onCreateProject: () => void;
  onDeleteProject: (project: ProjectSummary) => void;
  onDownload: () => void;
  onSelectProject: (project: ProjectSummary) => void;
  projectLoading: boolean;
  projectMessage: string;
  projectName: string;
  projects: ProjectSummary[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-[#e6dfd8] bg-[#faf9f5]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1700px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#141413] text-[#faf9f5]">
              <Network size={18} />
            </div>
            <span className="hidden font-serif text-lg leading-none sm:block">CXI Studio</span>
          </div>

          <div className="relative min-w-0">
            <button
              className="flex min-w-0 items-center gap-2 rounded-xl border border-[#e6dfd8] bg-[#f5f0e8] px-3 py-2 text-left transition hover:bg-[#efe9de]"
              onClick={() => setMenuOpen((value) => !value)}
              type="button"
            >
              <FolderOpen className="shrink-0 text-[#a9583e]" size={16} />
              <span className="min-w-0 truncate text-sm font-bold text-[#252523]">{projectName}</span>
              <ChevronDown className={cn("shrink-0 text-[#6c6a64] transition", menuOpen && "rotate-180")} size={16} />
            </button>
            {menuOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute left-0 top-full z-20 mt-2 w-80 rounded-2xl border border-[#e6dfd8] bg-[#faf9f5] p-1 shadow-xl shadow-[#e6dfd8]/60">
                  <ProjectSwitcher
                    activeProjectSlug={activeProjectSlug}
                    loading={projectLoading}
                    message={projectMessage}
                    onCreateProject={onCreateProject}
                    onDeleteProject={onDeleteProject}
                    onSelectProject={(project) => {
                      onSelectProject(project);
                      setMenuOpen(false);
                    }}
                    projects={projects}
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="muted">{lastSavedAt ? `자동 저장 ${formatSavedTime(lastSavedAt)}` : "자동 저장 준비"}</Badge>
          <Badge variant={autoIncludedCount ? "green" : "muted"}>{autoIncludedCount ? `자동 반영 ${autoIncludedCount}` : "초안"}</Badge>
          <Button className="hidden sm:inline-flex" onClick={onClearDraft} variant="ghost">
            임시 저장 삭제
          </Button>
          <Button disabled={!canDownload} onClick={onDownload} variant="secondary">
            <Download size={18} />
            <span className="hidden sm:inline">보고서 다운로드</span>
          </Button>
        </div>
      </div>
    </header>
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

function SourcesPanel({
  activeSourceId,
  analysisStage,
  checkedSourceIds,
  collapsed,
  loading,
  onAddSource,
  onAnalyzeSource,
  onDeleteSource,
  onSelectSource,
  onToggleAll,
  onToggleCollapse,
  onToggleSource,
  sources
}: {
  activeSourceId: string;
  analysisStage: string;
  checkedSourceIds: string[];
  collapsed: boolean;
  loading: boolean;
  onAddSource: () => void;
  onAnalyzeSource: (source: SourceRecord) => void;
  onDeleteSource: (source: SourceRecord) => void;
  onSelectSource: (sourceId: string) => void;
  onToggleAll: () => void;
  onToggleCollapse: () => void;
  onToggleSource: (sourceId: string) => void;
  sources: SourceRecord[];
}) {
  if (collapsed) {
    return (
      <aside className="hidden shrink-0 flex-col items-center gap-3 border-r border-[#e6dfd8] bg-[#faf9f5]/60 py-4 lg:flex lg:w-14">
        <button className="rounded-lg p-1.5 text-[#6c6a64] transition hover:bg-[#efe9de]" onClick={onToggleCollapse} title="출처 열기" type="button">
          <PanelLeftOpen size={18} />
        </button>
        <button className="rounded-lg bg-[#141413] p-1.5 text-[#faf9f5] transition hover:bg-[#252320]" onClick={onAddSource} title="소스 추가" type="button">
          <Plus size={18} />
        </button>
        <span className="mt-1 text-xs font-bold tracking-wide text-[#8e8b82] [writing-mode:vertical-rl]">출처 {sources.length}</span>
      </aside>
    );
  }
  return (
    <aside className="shrink-0 border-b border-[#e6dfd8] bg-[#faf9f5]/60 lg:sticky lg:top-[61px] lg:h-[calc(100vh-61px)] lg:w-80 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="text-[#a9583e]" size={16} />
          <h2 className="text-sm font-black">출처</h2>
          <Badge variant={sources.length ? "blue" : "muted"}>{sources.length}</Badge>
        </div>
        <button className="hidden rounded-lg p-1.5 text-[#6c6a64] transition hover:bg-[#efe9de] lg:block" onClick={onToggleCollapse} title="접기" type="button">
          <PanelLeftClose size={18} />
        </button>
      </div>
      <div className="px-4 pt-3">
        <Button className="w-full justify-center" onClick={onAddSource}>
          <Plus size={16} />
          소스 추가
        </Button>
      </div>
      {sources.length ? (
        <button
          className="flex w-full items-center gap-2 px-5 pt-3 text-xs font-bold text-[#6c6a64] transition hover:text-[#252523]"
          onClick={onToggleAll}
          type="button"
        >
          <CheckBox checked={checkedSourceIds.length === sources.length && sources.length > 0} />
          모두 선택
        </button>
      ) : null}
      <div className="p-4">
        <SourceLibraryPanel
          activeSourceId={activeSourceId}
          analysisStage={analysisStage}
          checkedSourceIds={checkedSourceIds}
          loading={loading}
          onAnalyzeSource={onAnalyzeSource}
          onDeleteSource={onDeleteSource}
          onSelectSource={onSelectSource}
          onToggleSource={onToggleSource}
          sources={sources}
        />
      </div>
    </aside>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
        checked ? "border-[#cc785c] bg-[#cc785c] text-[#faf9f5]" : "border-[#c9c2b8] bg-[#faf9f5]"
      )}
    >
      {checked ? <Check size={12} strokeWidth={3} /> : null}
    </span>
  );
}

const CHAT_SUGGESTIONS = ["주요 불만은 무엇인가요?", "참가자별 반응 차이는?", "가장 자주 나온 주제는?", "긍정적인 반응은 어떤 게 있나요?"];

function ChatPanel({
  checkedCount,
  error,
  hasSources,
  input,
  loading,
  messages,
  onSend,
  setInput
}: {
  checkedCount: number;
  error: string;
  hasSources: boolean;
  input: string;
  loading: boolean;
  messages: ChatMessage[];
  onSend: (question?: string) => void;
  setInput: (value: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  return (
    <section className="flex min-h-[520px] min-w-0 flex-1 flex-col lg:h-full lg:min-h-0">
      <div className="shrink-0 flex items-center gap-2 border-b border-[#e6dfd8] px-5 py-3">
        <MessageSquare className="text-[#a9583e]" size={16} />
        <h2 className="text-sm font-black">채팅</h2>
        <span className="text-xs text-[#8e8b82]">선택한 소스에 질문하세요</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6" ref={scrollRef}>
        {error ? (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800">{error}</div>
        ) : null}

        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#efe9de] text-[#a9583e]">
              <MessageSquare size={24} />
            </div>
            <h3 className="mt-5 text-lg font-black text-[#141413]">
              {hasSources ? "소스에 무엇이든 물어보세요" : "소스를 추가하고 질문해보세요"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#6c6a64]">
              {hasSources
                ? "체크한 소스의 발화에만 근거해 답하고, 근거가 된 발화를 함께 보여줍니다."
                : "왼쪽에서 ‘소스 추가’로 리서치 자료를 올리면 대화를 시작할 수 있습니다."}
            </p>
            {hasSources ? (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {CHAT_SUGGESTIONS.map((suggestion) => (
	                  <button
	                    className="rounded-full border border-[#e6dfd8] bg-[#faf9f5] px-4 py-2 text-sm font-semibold text-[#3d3d3a] transition hover:border-[#cc785c] hover:bg-white"
	                    key={suggestion}
	                    onClick={() => onSend(suggestion)}
	                    type="button"
	                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mx-auto grid max-w-2xl gap-4">
            {messages.map((message, index) => (
              <ChatBubble key={index} message={message} />
            ))}
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-[#8e8b82]">
                <Loader2 className="animate-spin" size={16} />
                답변을 생성하고 있습니다…
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-[#e6dfd8] bg-[#faf9f5]/80 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-[#e6dfd8] bg-[#faf9f5] p-2 shadow-sm">
          <Textarea
            className="min-h-11 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            disabled={!hasSources}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder={hasSources ? "질문하거나 창작하세요" : "먼저 소스를 추가하세요"}
            value={input}
          />
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="px-1 text-xs font-semibold text-[#8e8b82]">소스 {checkedCount}개</span>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#141413] text-[#faf9f5] transition hover:bg-[#252320] disabled:opacity-40"
              disabled={!hasSources || !input.trim() || loading}
              onClick={() => onSend()}
              title="전송"
              type="button"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#141413] px-4 py-3 text-sm leading-6 text-[#faf9f5]">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-[#e6dfd8] bg-[#faf9f5] px-4 py-3">
        <p className="whitespace-pre-wrap text-sm leading-7 text-[#3d3d3a]">{message.content}</p>
        {message.citations && message.citations.length ? (
          <div className="mt-3 grid gap-2 border-t border-[#ebe6df] pt-3">
            <p className="text-xs font-black text-[#6c6a64]">근거 {message.citations.length}개</p>
            {message.citations.map((citation: Citation, index: number) => (
              <blockquote className="rounded-xl border-l-2 border-[#cc785c] bg-[#f5f0e8] px-3 py-2 text-xs leading-5 text-[#3d3d3a]" key={index}>
                <span className="mb-1 block font-bold text-[#6c6a64]">
                  {citation.participant} · {citation.source_name}
                </span>
                {citation.quote}
              </blockquote>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StudioPanel({
  collapsed,
  onOpenArtifact,
  onToggleCollapse,
  relationshipsCount,
  reportInsightsCount,
  resultReady
}: {
  collapsed: boolean;
  onOpenArtifact: (kind: ArtifactKind) => void;
  onToggleCollapse: () => void;
  relationshipsCount: number;
  reportInsightsCount: number;
  resultReady: boolean;
}) {
  if (collapsed) {
    return (
      <aside className="hidden shrink-0 flex-col items-center gap-3 border-l border-[#e6dfd8] bg-[#faf9f5]/60 py-4 lg:flex lg:w-14">
        <button className="rounded-lg p-1.5 text-[#6c6a64] transition hover:bg-[#efe9de]" onClick={onToggleCollapse} title="스튜디오 열기" type="button">
          <PanelRightOpen size={18} />
        </button>
        <span className="mt-1 text-xs font-bold tracking-wide text-[#8e8b82] [writing-mode:vertical-rl]">스튜디오</span>
      </aside>
    );
  }
  const artifacts: { kind: ArtifactKind; icon: ReactNode; label: string; description: string; iconClass: string }[] = [
    {
      kind: "insights",
      icon: <ClipboardCheck size={18} />,
      label: "인사이트",
      description: resultReady ? `반영 인사이트 ${reportInsightsCount}개` : "분석 후 핵심 발견 검토",
      iconClass: "bg-rose-50 text-rose-600",
    },
    {
      kind: "affinity",
      icon: <LayoutGrid size={18} />,
      label: "어피니티 다이어그램",
      description: "세그먼트를 주제별로 묶고 재배치",
      iconClass: "bg-amber-50 text-amber-600",
    },
    {
      kind: "insight-map",
      icon: <Network size={18} />,
      label: "인사이트 맵",
      description: relationshipsCount ? `인사이트 관계 ${relationshipsCount}개` : "인사이트 간 관계 그래프",
      iconClass: "bg-teal-50 text-teal-600",
    },
    {
      kind: "report",
      icon: <FileText size={18} />,
      label: "리포트",
      description: `반영 인사이트 ${reportInsightsCount}개`,
      iconClass: "bg-blue-50 text-blue-600",
    },
  ];
  return (
    <aside className="shrink-0 border-t border-[#e6dfd8] bg-[#faf9f5]/60 lg:sticky lg:top-[61px] lg:h-[calc(100vh-61px)] lg:w-80 lg:overflow-y-auto lg:border-l lg:border-t-0">
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-[#a9583e]" size={16} />
          <h2 className="text-sm font-black">스튜디오</h2>
        </div>
        <button className="hidden rounded-lg p-1.5 text-[#6c6a64] transition hover:bg-[#efe9de] lg:block" onClick={onToggleCollapse} title="접기" type="button">
          <PanelRightClose size={18} />
        </button>
      </div>
      <p className="px-4 pt-1 text-xs leading-5 text-[#6c6a64]">분석 결과로 산출물을 만들어 보세요.</p>
      <div className="grid gap-3 p-4">
        {artifacts.map((artifact) => (
          <button
            className={cn(
              "rounded-2xl border p-4 text-left transition",
              resultReady
                ? "border-[#e6dfd8] bg-[#f5f0e8] hover:border-[#cc785c] hover:bg-[#fff7ef]"
                : "cursor-not-allowed border-[#e6dfd8] bg-[#f5f0e8] opacity-50"
            )}
            disabled={!resultReady}
            key={artifact.kind}
            onClick={() => onOpenArtifact(artifact.kind)}
            type="button"
          >
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", artifact.iconClass)}>
                {artifact.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-[#252523]">{artifact.label}</p>
                <p className="mt-0.5 text-xs leading-4 text-[#6c6a64]">{artifact.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
      {resultReady ? null : (
        <p className="px-4 text-xs leading-5 text-[#9c9a94]">소스를 분석하면 산출물을 생성할 수 있습니다.</p>
      )}
    </aside>
  );
}

function UploadModal({
  analysisStage,
  loading,
  onAnalyzeText,
  onClose,
  onPickFile,
  setText,
  text
}: {
  analysisStage: string;
  loading: boolean;
  onAnalyzeText: () => void;
  onClose: () => void;
  onPickFile: (file: File) => void;
  setText: (value: string) => void;
  text: string;
}) {
  const [mode, setMode] = useState<"choose" | "text">("choose");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const chipClass =
    "inline-flex items-center gap-2 rounded-full border border-[#e6dfd8] bg-[#faf9f5] px-5 py-2.5 text-sm font-bold text-[#252523] shadow-sm transition hover:border-[#cc785c] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-[#e6dfd8] bg-[#faf9f5] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#e6dfd8] px-5 py-3">
          <div className="flex items-center gap-2">
            <FileUp className="text-[#a9583e]" size={16} />
            <h2 className="text-base font-black">소스 추가</h2>
          </div>
          <button className="rounded-full p-2 text-[#6c6a64] transition hover:bg-[#efe9de]" onClick={onClose} title="닫기" type="button">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {mode === "choose" ? (
            <div
              className="rounded-3xl border border-dashed border-[#cbb9ab] bg-[#f5f0e8] px-6 py-12 text-center transition"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const dropped = event.dataTransfer.files?.[0];
                if (dropped) onPickFile(dropped);
              }}
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#faf9f5] text-[#a9583e] shadow-sm">
                {loading ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
              </div>
              <p className="mt-5 text-lg font-bold text-[#252523]">{loading ? analysisStage : "또는 파일 드롭"}</p>
              <p className="mt-1 text-sm text-[#8e8b82]">TXT, Markdown, CSV, XLSX 파일을 지원합니다</p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button className={chipClass} disabled={loading} onClick={() => fileInputRef.current?.click()} type="button">
                  <Upload size={16} />
                  파일 업로드
                </button>
                <button className={chipClass} disabled={loading} onClick={() => setMode("text")} type="button">
                  <ClipboardPaste size={16} />
                  복사된 텍스트
                </button>
              </div>
              <input
                accept=".txt,.md,.markdown,.csv,.xlsx"
                className="hidden"
                onChange={(event) => {
                  const picked = event.target.files?.[0];
                  if (picked) onPickFile(picked);
                }}
                ref={fileInputRef}
                type="file"
              />
            </div>
          ) : (
            <div className="grid gap-4">
              <button
                className="flex w-fit items-center gap-1.5 text-xs font-bold text-[#8e8b82] transition hover:text-[#252523]"
                onClick={() => setMode("choose")}
                type="button"
              >
                <ArrowLeft size={14} />
                뒤로
              </button>
              <Textarea
                className={cn("min-h-64", text.trim() ? "border-[#cc785c] focus-visible:ring-[#cc785c]" : "")}
                onChange={(event) => setText(event.target.value)}
                placeholder="인터뷰 발화, 관찰 메모, 설문 응답 텍스트를 여기에 붙여넣으세요"
                value={text}
              />
              {text.trim() ? <span className="text-xs text-[#8e8b82]">{text.trim().length.toLocaleString()}자</span> : null}
              <Button className="w-full" disabled={loading || !text.trim()} onClick={onAnalyzeText} type="button">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                {loading ? analysisStage : "분석 시작"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ArtifactModal({
  excludedCount,
  kind,
  onClose,
  onDownload,
  onMoveSegment,
  onUpdateInsight,
  recognition,
  reportInsights,
  reportLoading,
  reportMarkdown,
  result,
  reviewedInsights,
  segmentById,
  segmentTopicOverrides
}: {
  excludedCount: number;
  kind: ArtifactKind;
  onClose: () => void;
  onDownload: () => void;
  onMoveSegment: (segmentId: string, topicId: string) => void;
  onUpdateInsight: (insightId: string, updates: Partial<ReviewedInsight>) => void;
  recognition: RecognitionResponse | null;
  reportInsights: ReviewedInsight[];
  reportLoading: boolean;
  reportMarkdown: string;
  result: AnalysisResponse;
  reviewedInsights: ReviewedInsight[];
  segmentById: Map<string, Segment>;
  segmentTopicOverrides: Record<string, string>;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const titles: Record<ArtifactKind, string> = {
    insights: "인사이트",
    affinity: "어피니티 다이어그램",
    "insight-map": "인사이트 맵",
    report: "리포트",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div
        className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#e6dfd8] bg-[#faf9f5] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#e6dfd8] px-5 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-[#a9583e]" size={16} />
            <h2 className="text-base font-black">{titles[kind]}</h2>
          </div>
          <button className="rounded-full p-2 text-[#6c6a64] transition hover:bg-[#efe9de]" onClick={onClose} title="닫기" type="button">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {kind === "insights" ? (
            <FindingsWorkspace
              excludedCount={excludedCount}
              onUpdateInsight={onUpdateInsight}
              reviewedInsights={reviewedInsights}
              segmentById={segmentById}
            />
          ) : null}
          {kind === "affinity" ? (
            <AffinityBoard
              onMoveSegment={onMoveSegment}
              result={result}
              segmentById={segmentById}
              segmentTopicOverrides={segmentTopicOverrides}
            />
          ) : null}
          {kind === "insight-map" ? (
            <InsightGraph insights={result.analysis.insights} relationships={result.analysis.relationships ?? []} />
          ) : null}
          {kind === "report" ? (
            <ReportPanel
              excludedCount={excludedCount}
              onDownload={onDownload}
              recognition={recognition}
              reportInsights={reportInsights}
              reportLoading={reportLoading}
              reportMarkdown={reportMarkdown}
              result={result}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SourceLibraryPanel({
  activeSourceId,
  analysisStage,
  checkedSourceIds,
  loading,
  onAnalyzeSource,
  onDeleteSource,
  onSelectSource,
  onToggleSource,
  sources
}: {
  activeSourceId: string;
  analysisStage: string;
  checkedSourceIds: string[];
  loading: boolean;
  onAnalyzeSource: (source: SourceRecord) => void;
  onDeleteSource: (source: SourceRecord) => void;
  onSelectSource: (sourceId: string) => void;
  onToggleSource: (sourceId: string) => void;
  sources: SourceRecord[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionKicker icon={<FolderOpen size={16} />} label="소스 라이브러리" />
          <h3 className="mt-2 text-lg font-black">프로젝트 안의 원자료를 따로 관리합니다</h3>
          <p className="mt-1 text-sm leading-6 text-[#6c6a64]">각 파일은 독립적으로 인식·분석됩니다.</p>
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
                  <div className="grid gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        aria-label="채팅 소스로 선택"
                        className="shrink-0"
                        onClick={() => onToggleSource(source.id)}
                        type="button"
                      >
                        <CheckBox checked={checkedSourceIds.includes(source.id)} />
                      </button>
                      <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => onSelectSource(source.id)} type="button">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#faf9f5] text-[#a9583e]">
                          {source.source_type === "CSV" || source.source_type === "엑셀" ? <Database size={18} /> : <FileText size={18} />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[#252523]">{source.name}</p>
                          <p className="mt-1 text-xs font-semibold text-[#6c6a64]">
                            {source.detected_label} · 세그먼트 {source.segment_count}개 · 참가자 {source.participant_count || "?"}명
                          </p>
                        </div>
                      </button>
                    </div>
	                    <div className="flex flex-wrap items-center gap-2 pl-7">
                      <Badge variant={source.status === "분석완료" ? "green" : source.status === "분석중" || source.status === "오류" ? "amber" : "muted"}>
                        {isAnalyzing ? "분석중" : source.status}
                      </Badge>
                      {source.insight_count ? <Badge variant="blue">인사이트 {source.insight_count}</Badge> : null}
	                      <Button className="max-w-full" disabled={loading} onClick={() => onAnalyzeSource(source)} size="sm" type="button">
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
            아직 저장된 소스가 없습니다. &apos;소스 추가&apos;로 파일을 올리면 소스 라이브러리에 추가됩니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FindingsWorkspace({
  excludedCount,
  onUpdateInsight,
  reviewedInsights,
  segmentById,
}: {
  excludedCount: number;
  onUpdateInsight: (insightId: string, updates: Partial<ReviewedInsight>) => void;
  reviewedInsights: ReviewedInsight[];
  segmentById: Map<string, Segment>;
}) {
  const [selectedInsightId, setSelectedInsightId] = useState(reviewedInsights[0]?.id ?? "");
  const selectedInsight = reviewedInsights.find((insight) => insight.id === selectedInsightId) ?? reviewedInsights[0];
  // 기본은 전부 반영. 제외(hidden)한 항목은 목록 맨 아래로 내려 흐리게 표시한다.
  const orderedInsights = [...reviewedInsights].sort(
    (a, b) => (a.findingStatus === "hidden" ? 1 : 0) - (b.findingStatus === "hidden" ? 1 : 0)
  );
  const includedCount = reviewedInsights.length - excludedCount;

  useEffect(() => {
    if (!reviewedInsights.length) {
      setSelectedInsightId("");
      return;
    }
    if (!reviewedInsights.some((insight) => insight.id === selectedInsightId)) {
      setSelectedInsightId(reviewedInsights[0].id);
    }
  }, [reviewedInsights, selectedInsightId]);

  function riskFlagLabel(flag: RiskFlag) {
    switch (flag) {
      case "weak_evidence": return "근거 부족";
      case "overgeneralized": return "일반화 주의";
      case "duplicate_candidate": return "중복 가능성";
    }
  }

  function toggleInclude(insight: ReviewedInsight) {
    onUpdateInsight(insight.id, {
      findingStatus: insight.findingStatus === "hidden" ? "auto_included" : "hidden",
    });
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 2xl:grid-cols-[minmax(360px,0.95fr)_minmax(420px,1.05fr)]">
        <Card className="overflow-hidden">
          <CardHeader>
            <SectionKicker icon={<ClipboardCheck size={16} />} label="Findings" />
            <h3 className="mt-2 text-lg font-black">모든 인사이트가 리포트에 반영됩니다</h3>
            <p className="mt-1 text-sm leading-6 text-[#6c6a64]">
              반영 {includedCount}개{excludedCount > 0 ? ` · 제외 ${excludedCount}개` : ""} · 빼고 싶은 항목은 카드의 ‘제외’를 누르세요.
            </p>
          </CardHeader>
          <CardContent className="max-h-[720px] overflow-y-auto bg-[#f5f0e8] p-4">
            <div className="grid gap-3">
              {orderedInsights.map((insight, index) => {
                const isSelected = insight.id === selectedInsight?.id;
                const isExcluded = insight.findingStatus === "hidden";
                return (
                  <div
                    className={cn(
                      "relative cursor-pointer rounded-2xl border bg-[#faf9f5] p-4 text-left shadow-sm transition hover:border-[#cc785c]/60",
                      isSelected ? "border-[#cc785c] ring-1 ring-[#cc785c]/30" : "border-[#e6dfd8]",
                      isExcluded && "opacity-55"
                    )}
                    key={insight.id}
                    onClick={() => setSelectedInsightId(insight.id)}
                  >
                    {isSelected ? <span className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-[#cc785c]" /> : null}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={isExcluded ? "muted" : "green"}>{isExcluded ? "제외됨" : "반영"}</Badge>
                        {insight.riskFlags.map((flag) => (
                          <Badge key={flag} variant="muted">{riskFlagLabel(flag)}</Badge>
                        ))}
                        <Badge variant="muted">{readableInsightType(insight.type)}</Badge>
                      </div>
                      <span className="text-xs font-black text-[#8e8b82]">{index + 1}</span>
                    </div>
                    <h4 className={cn("mt-3 line-clamp-2 text-sm font-black leading-6 text-[#141413]", isExcluded && "line-through")}>{insight.title}</h4>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#6c6a64]">{insight.summary}</p>
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#ebe6df] pt-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs font-bold text-[#a9583e]">영향도 {insight.severity}</span>
                        <span className="text-xs font-bold text-[#6c6a64]">빈도 {insight.frequency}</span>
                        <span className="text-xs font-bold text-[#6c6a64]">신뢰도 {insight.confidence}</span>
                      </div>
                      <button
                        className={cn(
                          "flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition",
                          isExcluded
                            ? "bg-[#141413] text-[#faf9f5] hover:bg-[#252320]"
                            : "bg-[#efe9de] text-[#6c6a64] hover:bg-[#e6dccb] hover:text-[#8e3c29]"
                        )}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleInclude(insight);
                        }}
                        type="button"
                      >
                        {isExcluded ? <><BadgeCheck size={13} />포함</> : <><CircleSlash size={13} />제외</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <InsightInspector
          insight={selectedInsight}
          onUpdateInsight={onUpdateInsight}
          segmentById={segmentById}
        />
      </div>

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
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition",
            insight.findingStatus === "hidden"
              ? "bg-[#141413] text-[#faf9f5] hover:bg-[#252320]"
              : "bg-[#efe9de] text-[#6c6a64] hover:bg-[#e6dccb] hover:text-[#8e3c29]"
          )}
          onClick={() =>
            onUpdateInsight(insight.id, {
              findingStatus: insight.findingStatus === "hidden" ? "auto_included" : "hidden",
            })
          }
          type="button"
        >
          {insight.findingStatus === "hidden" ? <><BadgeCheck size={15} />리포트에 포함</> : <><CircleSlash size={15} />리포트에서 제외</>}
        </button>
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

        <div className="flex flex-wrap gap-2">
          <Badge variant="amber">영향도 {insight.severity}</Badge>
          <Badge variant="blue">빈도 {insight.frequency}</Badge>
          <Badge variant="green">신뢰도 {insight.confidence}</Badge>
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

function ReportPanel({
  excludedCount,
  onDownload,
  recognition,
  reportInsights,
  reportLoading,
  reportMarkdown,
  result
}: {
  excludedCount: number;
  onDownload: () => void;
  recognition: RecognitionResponse | null;
  reportInsights: ReviewedInsight[];
  reportLoading: boolean;
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
        <Button disabled={!reportMarkdown || reportLoading} onClick={onDownload} variant="secondary">
          {reportLoading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
          {reportLoading ? "Markdown 준비 중" : "Markdown 다운로드"}
        </Button>
      </CardHeader>
      <CardContent>
        {excludedCount > 0 && (
          <div className="mb-4 rounded-xl border border-[#e6dfd8] bg-[#f5f0e8] px-4 py-3 text-sm font-semibold text-[#6c6a64]">
            제외한 {excludedCount}개는 리포트에 포함되지 않았습니다.
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
  const topicOptions = useMemo(
    () =>
      result.analysis.insights.slice(0, 6).map((insight) => ({
        id: insight.id,
        topic_name: insight.title,
        summary: insight.summary,
        segment_ids: getEvidenceSegmentIds(insight),
      })),
    [result.analysis.insights]
  );
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
    topicOptions.forEach((topic) => {
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
  }, [segmentTopicOverrides, topicOptions]);

  if (!topicOptions.length) {
    return (
      <p className="py-6 text-center text-sm text-[#9c9a94]">
        인사이트 근거 정보가 없습니다. 소스를 분석하면 인사이트별 근거 발화가 표시됩니다.
      </p>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
		          <SectionKicker icon={<Network size={16} />} label="어피니티 보드" />
			          <h3 className="mt-2 text-lg font-black">인사이트별 근거 발화를 훑어보세요</h3>
			          <p className="mt-1 text-sm leading-6 text-slate-500">어색하게 연결된 근거는 끌어서 다른 인사이트 영역에 놓을 수 있습니다.</p>
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
		                        이 인사이트에 연결된 발화가 없습니다. 다른 카드의 근거를 이동하면 이곳에 표시됩니다.
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


function ReportSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="mt-8 border-t border-slate-200 pt-6">
      <h3 className="text-lg font-black">{title}</h3>
      <div className="mt-3 text-sm leading-7 text-slate-600">{children}</div>
    </section>
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
