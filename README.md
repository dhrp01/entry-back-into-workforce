# entry-back-into-workforce
AI Collective Hackthon

## Run the chat prototype

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then put your Gemini API key in .env
streamlit run app.py
```

The page opens at http://localhost:8501. Never commit `.env`.
