# Backend

```bash
python3 -m uvicorn backend.main:app --reload --port 8000
```

The backend reads `GROQ_API_KEY` and `GROQ_MODEL` from the root `.env` file.
