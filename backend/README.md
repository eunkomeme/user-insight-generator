# Backend

```bash
python3 -m uvicorn backend.main:app --reload --port 8000
```

The backend reads `GROQ_API_KEY`, `GROQ_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and `OPENROUTER_MODELS` from the root `.env` file.

Groq is used first. If Groq returns a 429 rate-limit response, the same analysis request is retried through OpenRouter when `OPENROUTER_API_KEY` is configured.

Use `OPENROUTER_MODEL=openrouter/free` to let OpenRouter choose from currently available free models. Set `OPENROUTER_MODELS` only when you want to provide a comma-separated fallback order yourself.
