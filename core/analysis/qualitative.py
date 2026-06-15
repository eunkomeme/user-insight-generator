from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field
from typing import Any

from core.intake import Segment


@dataclass
class SupportingQuote:
    quote: str
    participant: str
    source_id: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class InsightDraft:
    id: str
    type: str
    title: str
    summary: str
    severity: str
    frequency: str
    confidence: str
    related_tasks: list[str]
    related_participants: list[str]
    supporting_quotes: list[SupportingQuote]
    recommendation: str
    status: str

    def to_dict(self) -> dict[str, Any]:
        return {
            **asdict(self),
            "supporting_quotes": [quote.to_dict() for quote in self.supporting_quotes],
        }


@dataclass
class InsightRelationship:
    from_id: str
    to_id: str
    label: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class AnalysisResult:
    insights: list[InsightDraft]
    participant_mentions: dict[str, int]
    relationships: list[InsightRelationship] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "insights": [insight.to_dict() for insight in self.insights],
            "participant_mentions": self.participant_mentions,
            "relationships": [r.to_dict() for r in self.relationships],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "AnalysisResult":
        return cls(
            insights=[
                InsightDraft(
                    id=item.get("id", ""),
                    type=item.get("type", "usability_issue"),
                    title=item.get("title", ""),
                    summary=item.get("summary", ""),
                    severity=item.get("severity", "보통"),
                    frequency=item.get("frequency", "보통"),
                    confidence=item.get("confidence", "보통"),
                    related_tasks=list(item.get("related_tasks", [])),
                    related_participants=list(item.get("related_participants", [])),
                    supporting_quotes=[
                        SupportingQuote(
                            quote=quote.get("quote", ""),
                            participant=quote.get("participant", ""),
                            source_id=quote.get("source_id", ""),
                        )
                        for quote in item.get("supporting_quotes", [])
                    ],
                    recommendation=item.get("recommendation", "후속 검토가 필요합니다."),
                    status=item.get("status", "draft"),
                )
                for item in data.get("insights", [])
            ],
            participant_mentions=dict(data.get("participant_mentions", {})),
            relationships=[
                InsightRelationship(
                    from_id=str(r.get("from_id", "")),
                    to_id=str(r.get("to_id", "")),
                    label=str(r.get("label", "")),
                )
                for r in data.get("relationships", [])
                if r.get("from_id") and r.get("to_id")
            ],
        )


TOPIC_RULES = [
    ("과정 중심의 사용 맥락", {"요리", "저녁", "준비", "과정", "흐름", "가족", "재료", "레시피"}),
    ("신뢰와 안전 불안", {"불안", "확신", "신뢰", "걱정", "오류", "실패", "안전", "실제로", "확인"}),
    ("앱 조작 부담", {"느리", "빠르", "반복", "시간", "귀찮", "번거", "손", "물", "기름", "잠금", "로딩"}),
    ("상태 확인과 알림", {"알림", "완료", "상태", "남은", "예열", "몇", "확인", "시간"}),
    ("자동화 기대와 실제 경험 차이", {"자동", "설정", "레시피", "취향", "조정", "냉동", "개인화", "피드백"}),
    ("기능 범위 이해 어려움", {"이해", "용어", "문구", "설명", "헷갈", "의미", "라벨", "가능", "못"}),
    ("탐색과 정보구조", {"찾", "검색", "메뉴", "위치", "경로", "카테고리", "내비", "어디"}),
    ("긍정 신호", {"좋", "편하", "쉬", "만족", "괜찮", "익숙", "명확"}),
]

INSIGHT_LIBRARY = {
    "과정 중심의 사용 맥락": {
        "title": "사용자는 기기를 제어하려는 게 아니라 요리 과정을 끝내고 싶어 한다",
        "summary": "참여자 발화는 오븐, 식기세척기, 냉장고를 각각 조작하는 문제보다 '저녁 준비'라는 하나의 흐름 안에서 앱이 어떻게 도와주는지가 더 중요하다는 쪽으로 모입니다.",
        "recommendation": "기기별 메뉴보다 '요리 전 준비 → 조리 중 확인 → 요리 후 정리' 같은 과정 중심 진입점을 검토하세요.",
    },
    "신뢰와 안전 불안": {
        "title": "원격 제어는 편하지만 실제 동작 여부를 확인하기 전까지 불안하다",
        "summary": "앱에서 명령이 완료된 것처럼 보여도 사용자는 실제 기기가 켜졌는지, 안전한지 눈으로 확인하려고 합니다. 특히 열이 발생하는 가전에서는 신뢰 문제가 사용을 막습니다.",
        "recommendation": "명령 전송 여부가 아니라 실제 기기 상태, 현재 온도, 안전 조건, 남은 시간을 더 구체적으로 보여주세요.",
    },
    "앱 조작 부담": {
        "title": "요리 중 앱 조작은 편의가 아니라 흐름을 끊는 부담으로 느껴진다",
        "summary": "요리 중에는 손에 물이나 기름이 묻어 있고 여러 일이 동시에 일어나기 때문에, 앱을 켜고 기기를 찾는 과정 자체가 번거로운 행동으로 인식됩니다.",
        "recommendation": "요리 중 자주 쓰는 기능은 첫 화면, 알림, 빠른 실행으로 꺼내고 조작 단계를 줄이는 방향이 필요합니다.",
    },
    "상태 확인과 알림": {
        "title": "제어보다 상태 확인과 타이밍 알림의 가치가 더 명확하다",
        "summary": "참여자들은 앱으로 조리 전체를 제어하는 것보다 예열 완료, 남은 시간, 식기세척기 종료처럼 다음 행동을 결정하게 해주는 정보에 더 긍정적입니다.",
        "recommendation": "'예열 중' 같은 추상 상태 대신 현재 온도, 예상 완료 시간, 지금 할 수 있는 다음 행동을 함께 제시하세요.",
    },
    "자동화 기대와 실제 경험 차이": {
        "title": "자동 조리는 기대를 만들지만 실제 집의 재료와 취향을 반영하지 못한다",
        "summary": "레시피 기반 자동 설정은 처음에는 매력적이지만, 재료 양, 냉동 상태, 가족 취향이 달라지면 사용자가 다시 확인하고 조정해야 합니다.",
        "recommendation": "자동 설정을 고정값으로 보내기보다 재료 상태와 사용자 피드백을 반영해 다음 조리를 조정하는 학습 흐름을 설계하세요.",
    },
    "기능 범위 이해 어려움": {
        "title": "어떤 기기를 앱에서 어디까지 제어할 수 있는지 명확하지 않다",
        "summary": "사용자는 기기마다 가능한 기능과 제한이 다르다는 점을 매번 기억하기 어렵고, 기대했다가 안 되는 경험이 반복되면 앱을 덜 열게 됩니다.",
        "recommendation": "기기 연결 시 가능한 조작, 제한되는 조작, 직접 확인이 필요한 조작을 명확히 안내하세요.",
    },
    "탐색과 정보구조": {
        "title": "필요한 기능을 찾는 과정이 실제 기기 조작보다 느리게 느껴진다",
        "summary": "사용자는 앱 안에서 기기와 메뉴를 찾아 들어가는 시간이 길면 실제 기기 앞에서 버튼을 누르는 편을 선택합니다.",
        "recommendation": "사용 빈도가 높은 기기와 상황별 액션을 상단에 노출하고, 반복 조작은 바로 실행할 수 있게 만드세요.",
    },
    "긍정 신호": {
        "title": "명확한 상태 정보와 완료 알림은 재사용 의지가 있는 기능이다",
        "summary": "상태 확인, 완료 알림, 예열 확인처럼 사용자의 동선을 줄여주는 기능은 실제 가치로 받아들여집니다.",
        "recommendation": "긍정적으로 언급된 상태 확인 기능을 중심으로 경험을 확장하고, 제어 기능은 신뢰를 보강한 뒤 단계적으로 강화하세요.",
    },
    "기타 반복 패턴": {
        "title": "반복적으로 언급된 경험을 추가 분류할 필요가 있다",
        "summary": "여러 발화에서 비슷한 경험이 반복되지만 현재 규칙으로는 명확한 주제로 분류되지 않았습니다.",
        "recommendation": "리서처가 해당 발화를 검토해 별도 주제명으로 재분류하는 것이 좋습니다.",
    },
}


def run_mock_qualitative_analysis(segments: list[Segment]) -> AnalysisResult:
    included = [segment for segment in segments if segment.include_in_analysis and segment.content.strip()]
    topics = _cluster_segments(included)
    insights = _draft_insights(topics, included)
    participant_mentions = Counter(segment.participant for segment in included)
    return AnalysisResult(
        insights=insights,
        participant_mentions=dict(participant_mentions),
    )


def _cluster_segments(segments: list[Segment]) -> list[dict[str, Any]]:
    grouped: dict[str, list[Segment]] = defaultdict(list)
    for segment in segments:
        topic_name = _match_topic(segment.content)
        grouped[topic_name].append(segment)

    clusters: list[dict[str, Any]] = []
    for index, (topic_name, topic_segments) in enumerate(grouped.items(), start=1):
        participants = {segment.participant for segment in topic_segments}
        clusters.append({
            "id": f"topic_{index:03d}",
            "topic_name": topic_name,
            "segment_ids": [segment.id for segment in topic_segments],
            "participant_count": len(participants),
        })

    return sorted(clusters, key=lambda topic: len(topic["segment_ids"]), reverse=True)


def _match_topic(content: str) -> str:
    for topic_name, needles in TOPIC_RULES:
        if any(needle in content for needle in needles):
            return topic_name
    return "기타 반복 패턴"


def _draft_insights(topics: list[dict[str, Any]], segments: list[Segment]) -> list[InsightDraft]:
    segment_by_id = {segment.id: segment for segment in segments}
    insights: list[InsightDraft] = []
    for index, topic in enumerate(topics[:5], start=1):
        segment_ids = topic["segment_ids"]
        evidence_segments = [segment_by_id[segment_id] for segment_id in segment_ids[:3] if segment_id in segment_by_id]
        participants = sorted({segment.participant for segment in evidence_segments})
        participant_count = int(topic["participant_count"])
        confidence = "높음" if participant_count >= 3 else "보통" if participant_count >= 2 else "낮음"
        insight_copy = INSIGHT_LIBRARY.get(topic["topic_name"], INSIGHT_LIBRARY["기타 반복 패턴"])
        insights.append(
            InsightDraft(
                id=f"insight_{index:03d}",
                type="positive_signal" if topic["topic_name"] == "긍정 신호" else "usability_issue",
                title=insight_copy["title"],
                summary=insight_copy["summary"],
                severity="높음" if participant_count >= 3 else "보통" if participant_count >= 2 else "낮음",
                frequency="높음" if participant_count >= 3 else "보통" if participant_count >= 2 else "낮음",
                confidence=confidence,
                related_tasks=sorted({segment.question_or_topic for segment in evidence_segments if segment.question_or_topic != "질문 미확인"}),
                related_participants=participants,
                supporting_quotes=[
                    SupportingQuote(
                        quote=segment.content[:180],
                        participant=segment.participant,
                        source_id=segment.id,
                    )
                    for segment in evidence_segments
                ],
                recommendation=insight_copy["recommendation"],
                status="draft",
            )
        )
    return insights
