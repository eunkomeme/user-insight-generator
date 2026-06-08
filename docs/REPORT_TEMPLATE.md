# UX Research Report Template

## 1. Executive Summary

### Purpose

의사결정자가 빠르게 핵심 결론을 이해하도록 한다.

### Content

- 연구의 한 줄 결론
- 가장 중요한 사용성 이슈 3-5개
- 제품 리스크
- 우선 개선 권고

### AI Input

- approved insights
- severity/frequency/confidence
- score summary

### Template

```markdown
## Executive Summary

이번 리서치는 {product_or_feature}의 {research_goal}을 확인하기 위해 진행되었다.

핵심 결론은 다음과 같다.

1. {finding_1}
2. {finding_2}
3. {finding_3}

가장 우선적으로 개선해야 할 영역은 {priority_area}이며, 그 이유는 {reason}이다.
```

## 2. Research Background

### Content

- 리서치 배경
- 제품/기능 맥락
- 확인하고자 한 질문
- 조사 범위

### Template

```markdown
## Research Background

### Background
{background}

### Research Questions
- {question_1}
- {question_2}
- {question_3}

### Scope
이번 분석은 {scope}에 초점을 맞췄다.
```

## 3. Method

### Content

- 참여자 수
- 자료 유형
- 태스크
- 평가 기준
- 분석 방법

### Template

```markdown
## Method

- Participants: {participant_count}
- Data sources: {data_sources}
- Tasks: {tasks}
- Evaluation criteria: {evaluation_criteria}

분석은 인터뷰/관찰 메모와 사용성 평가 점수 데이터를 함께 검토하는 방식으로 진행되었다. AI가 인사이트 초안을 생성했고, 리서처가 근거와 우선순위를 검수했다.
```

## 4. Key Findings

### Content

- 가장 중요한 발견
- 사용자 행동 패턴
- 정성/정량 근거 연결
- 제품 영향

### Template

```markdown
## Key Findings

### Finding 1. {title}

{summary}

- Evidence: "{quote}"
- Related task: {task}
- Severity: {severity}
- Frequency: {frequency}
- Confidence: {confidence}
- Product impact: {impact}
```

## 5. Usability Issues

### Content

- 사용성 문제 목록
- 심각도
- 빈도
- 관련 태스크
- 근거
- 개선 방향

### Template

```markdown
## Usability Issues

| Issue | Severity | Frequency | Related Task | Evidence | Recommendation |
| --- | --- | --- | --- | --- | --- |
| {issue_title} | {severity} | {frequency} | {task} | {evidence_summary} | {recommendation} |
```

## 6. Score Summary

### Content

- 태스크별 점수 요약
- 만족도/난이도/오류 수
- 정성 이슈와 연결되는 정량 신호

### Template

```markdown
## Score Summary

### Task-Level Summary

| Task | Avg Score | Success Rate | Avg Difficulty | Avg Satisfaction | Error Count |
| --- | ---: | ---: | ---: | ---: | ---: |
| {task} | {avg_score} | {success_rate} | {avg_difficulty} | {avg_satisfaction} | {error_count} |

### Interpretation

{score_interpretation}
```

## 7. Evidence

### Content

- quote
- 관찰 메모
- participant
- task
- source
- 연결된 insight

### Template

```markdown
## Evidence

| Evidence | Participant | Task | Source | Related Insight |
| --- | --- | --- | --- | --- |
| "{quote_or_note}" | {participant} | {task} | {source} | {insight_title} |
```

## 8. Recommendations

### Content

- 우선순위별 개선 제안
- 기대 효과
- 관련 근거
- 후속 검증 방법

### Template

```markdown
## Recommendations

### Priority 1. {recommendation_title}

- Problem: {problem}
- Recommendation: {recommendation}
- Evidence: {evidence}
- Expected impact: {impact}
- Follow-up validation: {validation}
```

## 9. Appendix

### Content

- 입력 데이터 요약
- 전체 인사이트 목록
- rejected insight 목록, 선택 사항
- 분석 설정
- LLM provider 정보, 민감 정보 제외

### Template

```markdown
## Appendix

### Data Summary
- Text records: {text_record_count}
- CSV rows: {csv_row_count}
- Participants: {participants}
- Tasks: {tasks}

### Analysis Settings
- LLM provider: {provider_name}
- Generated at: {generated_at}
```

## Report Generation Rules

- approved insight만 보고서 본문에 사용한다.
- draft/rejected insight는 Appendix 후보로만 둔다.
- 모든 핵심 발견은 최소 하나 이상의 evidence를 포함해야 한다.
- 근거가 약한 항목은 confidence를 명시한다.
- 과장된 표현보다 근거 중심의 실무 문체를 사용한다.
- 사내 민감 정보가 export 파일에 포함될 수 있으므로 저장 위치와 공유 대상을 확인한다.
