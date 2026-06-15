# UX Research Report Template

`POST /api/report/markdown`이 생성하는 v1 Markdown 보고서 구조다. 이 API는 LLM을 다시 호출하지 않고, 프론트에서 전달한 검토 인사이트와 세그먼트를 deterministic하게 조합한다.

## Template

```markdown
# {project_name} UX 리서치 보고서 초안

## Executive Summary
이번 분석에서는 {included_insight_count}개의 핵심 인사이트가 보고서 초안에 반영되었습니다.

## 리서치 개요
- 프로젝트명: {project_name}
- 자료명: {source_name}
- 자료 유형: {source_type}

## 방법
- 원자료 세그먼트: {segment_count}개
- 분석 대상 참가자 발화: {participant_utterance_count}개
- 인식된 참가자: {participants}

## 주요 발견
### 1. {insight.title}

{insight.summary}

**영향도 / 빈도 / 신뢰도**
{severity} / {frequency} / {confidence}

**개선 제안**
{recommendation}

**근거**
- {participant} · {task}: {segment.content}

## 인사이트 유형
- 사용성 이슈: {count}개
- 긍정 신호: {count}개

## 개선 제안
1. {recommendation}

## Appendix
- {participant} · {task}: {segment.content}
```

## Inclusion Rules

- 프론트는 `hidden`이 아닌 인사이트만 API에 전달한다.
- 백엔드는 전달받은 인사이트를 모두 보고서 본문에 사용한다.
- 근거는 `supporting_quotes.source_id` 또는 `evidence_segment_ids`로 세그먼트와 연결한다.
- 세그먼트를 찾을 수 없으면 supporting quote 텍스트를 fallback으로 사용한다.
- 인사이트가 없으면 API는 400을 반환한다.

## Writing Rules

- 제목은 AI가 생성하거나 리서처가 수정한 인사이트 제목을 그대로 사용한다.
- 보고서 본문은 과장 없이 근거 중심의 실무 문체를 유지한다.
- 민감 정보가 포함될 수 있으므로 export 파일 공유 범위는 리서처가 확인한다.
