import { AnalysisStage } from "../types";

export const createAnalysisStages = (): AnalysisStage[] => [
  {
    id: "prepare",
    label: "분석 범위 설정",
    description: "입력 키워드를 기준으로 검색 범위와 제외 조건을 정리합니다.",
    status: "waiting"
  },
  {
    id: "collect",
    label: "채용공고 조회",
    description: "사람인, 잡코리아, 인크루트의 공개 공고를 조회할 준비를 합니다.",
    status: "waiting"
  },
  {
    id: "extract",
    label: "직무/기술 추출",
    description: "공고 본문에서 직무명, 기술스택, 필수/우대 조건을 분리합니다.",
    status: "waiting"
  },
  {
    id: "analyze",
    label: "관계 분석",
    description: "직무 관계, 기술 동시 등장, 신입/주니어 진입 경로를 계산합니다.",
    status: "waiting"
  },
  {
    id: "compose",
    label: "JSON 구성",
    description: "서비스 화면에서 바로 읽을 수 있는 JSON 구조로 정리합니다.",
    status: "waiting"
  }
];

export const buildMarketAnalysisPrompt = (keyword: string) => `
너는 채용시장 분석 전문 리서처이자 직무 데이터 분석가이다.

사용자가 입력한 관심 키워드 "${keyword}"를 시작점으로 삼아 사람인, 잡코리아, 인크루트의 공개 채용공고를 조사하고,
해당 키워드와 직접 또는 간접적으로 관련된 직무, 기술스택, 요구역량, 학습 경로, 프로젝트 추천, 자격증 정보를 구조화하라.

중요 원칙:
- 관심 키워드는 seed keyword일 뿐이다. 최종 직무명과 기술스택을 "${keyword}"에만 제한하지 말라.
- 직무명과 기술스택은 채용공고에서 실제로 발견된 내용을 기반으로 자동 추출하라.
- 로그인, 유료 접근, 비공개 데이터, 개인정보성 데이터는 사용하지 말라.
- 접근 불가한 공고는 제외하고 한계에 기록하라.
- 빈도와 순위는 전체 시장 절대값이 아니라 이번 표본 내 빈도로 표현하라.
- 채용공고 원문에 없는 내용을 사실처럼 말하지 말고, 추론은 추론이라고 구분하라.

조사 대상 사이트:
- 사람인
- 잡코리아
- 인크루트

권장 표본:
- 사이트별 가능한 한 균형 있게 수집
- 전체 60건 이상 권장
- 표본 확보가 어려우면 실제 수집 건수와 한계를 명시

각 공고에서 추출할 정보:
- 사이트명, 회사명, 공고 제목, URL, 게시일 또는 마감일
- 지역, 근무 형태, 고용 형태, 연봉 정보, 요구 경력, 학력 조건
- 직무명, 직무 카테고리, 주요 업무
- 필수 자격요건, 우대사항, 신입/주니어/경력 여부
- 원문에서 발견된 기술스택 전체
- 필수 기술, 우대 기술, 단순 언급 기술
- 자격증, 프로젝트 경험, 도메인 지식, 협업/문서화 요구

분석 요구사항:
1. 발견된 직무 목록과 등장 빈도
2. 직무별 필수 기술, 우대 기술, 단순 언급 기술
3. 기술별 전체/필수/우대/언급 빈도
4. 기술 동시 등장 관계와 실무 연결성
5. 직무 간 관계 그래프
6. 신입/주니어 기준 분석
7. 학생 입장에서의 학습 로드맵
8. 공고 기반 추천 프로젝트
9. 공고 기반/학습 효용 기반 추천 자격증
10. 서비스 화면에서 사용할 graph_nodes, graph_edges

반드시 JSON만 출력하라. 설명 문장이나 마크다운 코드는 JSON 밖에 쓰지 말라.
출력 JSON 최상위 구조:
{
  "summary": {
    "analyzed_sites": ["사람인", "잡코리아", "인크루트"],
    "analysis_date": "",
    "total_job_postings_analyzed": 0,
    "site_breakdown": [],
    "analysis_scope": "${keyword} 관련 채용공고",
    "sampling_note": "",
    "limitations": [],
    "note": "직무명과 기술스택은 사전 정의하지 않고 공고에서 발견된 내용을 기반으로 추출함"
  },
  "raw_job_postings": [],
  "discovered_jobs": [],
  "skill_taxonomy": [],
  "skill_co_occurrence": [],
  "job_relation_graph": [],
  "entry_level_analysis": {},
  "learning_roadmaps": [],
  "recommended_projects": [],
  "recommended_certificates": [],
  "service_utilization": {
    "search_to_job_graph_suggestions": [],
    "student_recommendation_rules": [],
    "data_fields_for_platform": [],
    "graph_nodes": [],
    "graph_edges": []
  },
  "graph_nodes": [],
  "graph_edges": []
}
`.trim();
