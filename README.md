# UX Research AI Workbench

사내망에서 실행 가능한 UX 리서치 자료 정리, 분석, 보고서 작성용 Streamlit MVP입니다.

현재 구현 범위:

- Streamlit 앱 골격
- 사이드바 기반 화면 이동
- 프로젝트 생성 폼
- 프로젝트 폴더 생성
- `metadata.json` 저장 및 불러오기

## Run

```bash
pip install -r requirements.txt
streamlit run app.py
```

앱은 기본적으로 `projects/` 폴더에 프로젝트 데이터를 저장합니다. 실제 회사 리서치 데이터는 사내에서 승인된 저장 위치에서만 사용하세요.
