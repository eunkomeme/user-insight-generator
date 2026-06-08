# Technical Approach

## 1. Architecture Summary

v1은 Streamlit 기반 내부 MVP로 구현한다. 회사에서 Streamlit이 실행된 경험이 있고 외부 웹사이트 접속이 제한될 가능성이 높기 때문이다.

```text
Streamlit UI
  -> analysis pipeline
  -> LLM provider interface
      -> CompanyLLMProvider
      -> MockProvider
      -> GroqProvider, local dev only
  -> project folder storage
  -> Markdown/JSON export
```

## 2. Proposed Package Structure

```text
app.py
core/
  analysis/
    text_analysis.py
    csv_analysis.py
    insight_schema.py
  llm/
    base.py
    company.py
    groq.py
    mock.py
  report/
    builder.py
    templates.py
  storage/
    projects.py
    snapshots.py
docs/
  PRD.md
  FEATURE_SPEC.md
  SCREEN_DESIGN.md
  REPORT_TEMPLATE.md
  TECHNICAL_APPROACH.md
```

## 3. Streamlit App Flow

### Session State

Streamlit session state should hold:

- current_project
- project_metadata
- text_records
- csv_data
- column_mapping
- generated_insights
- approved_insights
- report_draft
- selected_provider

### Pages

Streamlit can use sidebar navigation or `st.tabs` for the v1 flow:

- Project Setup
- Data Intake
- Analysis Workspace
- Insight Review
- Report Builder
- Export
- Settings

## 4. LLM Provider Interface

The app should call all model providers through a common interface.

```python
class LLMProvider:
    def generate_json(self, prompt: str, schema: dict) -> dict:
        raise NotImplementedError

    def generate_text(self, prompt: str) -> str:
        raise NotImplementedError
```

### CompanyLLMProvider

- Default for company environment.
- Reads endpoint and key from environment variables.
- Calls only the company-approved LLM API.

Expected environment variables:

- `COMPANY_LLM_ENDPOINT`
- `COMPANY_LLM_API_KEY`
- `COMPANY_LLM_MODEL`

### MockProvider

- Default for local structure testing.
- Returns deterministic fake insights and report text.
- Does not call external services.

### GroqProvider

- Optional local development provider only.
- Disabled by default in company environment.
- Reads API key from environment variable.

Expected environment variables:

- `GROQ_API_KEY`
- `GROQ_MODEL`

## 5. Storage Strategy

v1 should avoid making SQLite the operating default. Instead, each project is stored as a folder.

```text
projects/
  {project_slug}/
    metadata.json
    inputs/
      text_records.json
      scores.csv
    analysis/
      insights.json
      score_summary.json
    reports/
      report.md
    snapshot.json
```

### Rationale

- Easier to inspect in early MVP.
- Avoids introducing DB governance questions before internal validation.
- Works in restricted network environments.
- Can later migrate to Postgres or an internal storage system if approved.

### Security Notes

- Store real company data only in approved internal paths.
- Do not commit `projects/` data.
- Do not use real research data in personal or external development.
- Do not log raw transcripts or sensitive quotes.

## 6. Data Processing

### Text Processing

Text records should be normalized into:

- id
- source_type
- participant
- task
- text
- created_at

The text analysis prompt should ask for:

- pain points
- usability issues
- positive signals
- representative quotes
- related task
- related participant
- confidence

### CSV Processing

CSV analysis should calculate:

- row count
- participant count
- task count
- task-level averages
- success rate
- difficulty average
- satisfaction average
- error count summary

CSV analysis should not require every optional column. It should use the mapped columns selected by the user.

## 7. Insight Schema

Recommended insight object:

```json
{
  "id": "insight_001",
  "title": "Users miss the next-step action after task completion",
  "type": "usability_issue",
  "summary": "Participants completed the form but hesitated because the next action was not visually clear.",
  "severity": "high",
  "frequency": "medium",
  "confidence": "medium",
  "related_tasks": ["Task 2"],
  "related_participants": ["P1", "P4"],
  "evidence": [
    {
      "quote": "I am not sure what I should click next.",
      "participant": "P1",
      "task": "Task 2",
      "source_id": "text_001"
    }
  ],
  "status": "draft"
}
```

## 8. Report Generation

Report generation should use only approved insights by default.

Process:

1. Collect project metadata.
2. Collect approved insights.
3. Collect score summary.
4. Build section prompts.
5. Generate Markdown sections.
6. Save report draft.

Report sections:

- Executive Summary
- Research Background
- Method
- Key Findings
- Usability Issues
- Score Summary
- Evidence
- Recommendations
- Appendix

## 9. Deployment Assumptions

### Local Development

- Streamlit app runs on localhost.
- MockProvider is safe default.
- GroqProvider can be used only with fake or de-identified data.

### Company Environment

- Streamlit runs on a company-approved machine.
- Users access it through a browser on the company network.
- CompanyLLMProvider is the default.
- External providers can be disabled.
- Storage path is configured to an approved internal location.

## 10. v2 Migration Path

Move beyond Streamlit only if the following conditions appear:

- Multiple concurrent users need stable sessions.
- Role-based access control becomes necessary.
- Report editing requires richer document collaboration.
- Internal deployment requires standard web app packaging.
- Product usage grows beyond MVP validation.

Potential v2 stack:

- Next.js frontend
- FastAPI backend
- Postgres database
- internal object storage
- SSO/auth integration
- audit logging
