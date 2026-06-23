import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const PORT = Number(process.env.ANALYSIS_API_PORT ?? 8787);
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.5";
const REASONING_EFFORT = process.env.OPENAI_REASONING_EFFORT ?? "high";

const allowedOrigin = (request) => {
  const origin = request.headers.origin;
  if (!origin) return "*";
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  if (process.env.ALLOWED_ORIGIN && origin === process.env.ALLOWED_ORIGIN) return origin;
  if (process.env.ALLOW_ANY_ORIGIN === "true") return origin;
  return "null";
};

const jsonHeaders = (request) => ({
  "Access-Control-Allow-Origin": allowedOrigin(request),
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json; charset=utf-8"
});

const readBody = (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let length = 0;
    request.on("data", (chunk) => {
      chunks.push(chunk);
      length += chunk.length;
      if (length > 1024 * 1024) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });

const sendJson = (request, response, statusCode, payload) => {
  response.writeHead(statusCode, jsonHeaders(request));
  response.end(JSON.stringify(payload));
};

const getApiKey = async () => {
  const key = await readFile(join(process.cwd(), "key.txt"), "utf8");
  return key.trim();
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readJsonResponse = async (response, label) => {
  const text = await response.text();
  if (!text.trim()) {
    const requestId = response.headers.get("x-request-id") ?? response.headers.get("openai-request-id") ?? "unknown";
    throw new Error(`${label} returned an empty body. status=${response.status}, request_id=${requestId}`);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const preview = text.slice(0, 300).replace(/\s+/g, " ");
    throw new Error(`${label} returned invalid JSON. status=${response.status}, body=${preview}`);
  }
};

const fetchOpenAiJson = async (url, options, label, maxAttempts = 4) => {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const payload = await readJsonResponse(response, label);
      return { response, payload };
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) break;
      console.warn(JSON.stringify({
        label,
        attempt,
        retrying: true,
        error: error instanceof Error ? error.message : String(error)
      }));
      await wait(1200 * attempt);
    }
  }

  throw lastError;
};

const extractJsonText = (output) => {
  if (typeof output?.output_text === "string") return output.output_text;
  const chunks = [];
  for (const item of output?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && content.text) chunks.push(content.text);
      if (content?.type === "text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n");
};

const parseJsonFromText = (text) => {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("GPT 응답에서 JSON을 찾지 못했습니다.");
  }
};

const ensureDisplayableData = (data, keyword) => {
  data.summary ??= {};
  data.raw_job_postings ??= [];
  data.discovered_jobs ??= [];
  data.graph_nodes ??= [];
  data.graph_edges ??= [];

  if (!data.graph_nodes.length && data.discovered_jobs.length) {
    data.graph_nodes = data.discovered_jobs
      .filter((job) => job?.job_name)
      .map((job) => ({ type: "job", id: job.job_name, frequency: job.frequency ?? 1 }));
  }

  if (!data.graph_nodes.length && data.raw_job_postings.length) {
    const counts = new Map();
    for (const posting of data.raw_job_postings) {
      const name = posting.job_name || posting.job_category || posting.title;
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    data.graph_nodes = Array.from(counts.entries()).slice(0, 12).map(([id, frequency]) => ({ type: "job", id, frequency }));
  }

  if (!data.graph_nodes.length) {
    data.discovered_jobs = [{
      job_name: `${keyword} 공고 표본 부족`,
      frequency: 1,
      required_skills: [],
      preferred_skills: [],
      mentioned_skills: [],
      related_jobs: [],
      description: "공개 검색 결과에서 화면에 표시할 만큼의 채용공고 표본을 확보하지 못했습니다."
    }];
    data.graph_nodes = [{ type: "job", id: `${keyword} 공고 표본 부족`, frequency: 1, category: "insufficient_sample" }];
    data.summary.limitations = [
      ...(Array.isArray(data.summary.limitations) ? data.summary.limitations : []),
      "화면 표시를 위해 공고 표본 부족 노드를 생성했습니다. 실제 분석 표본이 충분하지 않습니다."
    ];
  }

  return data;
};

const buildPrompt = (keyword) => `
너는 채용시장 분석 전문 리서처이자 직무 데이터 분석가이다.

관심 키워드 "${keyword}"를 seed keyword로 삼아 사람인, 잡코리아, 인크루트의 공개 채용공고와 공개 검색결과를 조사하라.
최종 결과를 "${keyword}"라는 단어에만 제한하지 말고, 실제 공고에서 함께 발견되는 직무명과 기술스택으로 확장하라.

엄격한 기준:
- 로그인, 유료, 비공개, 개인정보성 데이터는 사용하지 않는다.
- 접근 가능한 공개 공고/검색결과 URL만 근거로 사용한다.
- 표본 수가 부족하면 limitations와 sampling_note에 명확히 적는다.
- 빈도는 "이번 분석 표본 내 빈도"로만 표현한다.
- 추정과 공고 근거를 구분한다.
- JSON만 출력한다. 마크다운, 설명문, 코드블록은 쓰지 않는다.
- 발견한 공고가 1건 이상이면 discovered_jobs는 절대 빈 배열이면 안 된다.
- discovered_jobs의 각 항목은 반드시 job_name과 frequency를 포함한다.
- graph_nodes에는 발견 직무별 { "type": "job", "id": 직무명, "frequency": 빈도 } 노드를 반드시 포함한다.
- graph_edges에는 가능한 경우 { "type": "job_to_skill", "source": 직무명, "target": 기술명, "weight": 숫자 } 관계를 포함한다.

필수 조사 항목:
1. raw_job_postings: 사이트, 회사, 제목, URL, 요구 경력, 주요 업무, 필수/우대/언급 기술. 최대 20건만 포함한다.
2. discovered_jobs: 발견 직무, 빈도, 대표 회사/제목, 주요 업무, 필수/우대/언급 기술, 진입 난이도. 최대 12개.
3. skill_taxonomy: 기술 카테고리별 빈도. 카테고리별 최대 8개 기술.
4. skill_co_occurrence: 함께 등장하는 기술 조합. 최대 15개.
5. job_relation_graph: 직무 간 관계. 최대 15개.
6. entry_level_analysis: 신입/주니어 기준 분석
7. learning_roadmaps, recommended_projects, recommended_certificates
8. graph_nodes, graph_edges: React Flow 트리 표시용 간단 그래프

출력 JSON 스키마:
{
  "summary": {
    "analyzed_sites": ["사람인", "잡코리아", "인크루트"],
    "analysis_date": "",
    "total_job_postings_analyzed": 0,
    "site_breakdown": [{"site": "사람인", "count": 0}, {"site": "잡코리아", "count": 0}, {"site": "인크루트", "count": 0}],
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
  "service_utilization": {"search_to_job_graph_suggestions": [], "student_recommendation_rules": [], "data_fields_for_platform": [], "graph_nodes": [], "graph_edges": []},
  "graph_nodes": [],
  "graph_edges": []
}
`.trim();

const analyzeKeyword = async (keyword) => {
  const apiKey = await getApiKey();
  console.log(JSON.stringify({ receivedKeyword: keyword, codepoints: Array.from(keyword).map((char) => char.codePointAt(0)?.toString(16)) }));

  const { response: createResponse, payload: createPayload } = await fetchOpenAiJson("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      input: buildPrompt(keyword),
      tools: [{ type: "web_search_preview" }],
      reasoning: { effort: REASONING_EFFORT, summary: "auto" },
      text: { verbosity: "medium" },
      max_output_tokens: 30000,
      background: true
    })
  }, "OpenAI response creation");

  let payload = createPayload;
  if (!createResponse.ok) {
    throw new Error(payload?.error?.message ?? `OpenAI API error: ${createResponse.status}`);
  }

  const responseId = payload?.id;
  if (!responseId) {
    throw new Error("OpenAI background response id를 받지 못했습니다.");
  }

  const startedAt = Date.now();
  while (["queued", "in_progress"].includes(payload?.status)) {
    if (Date.now() - startedAt > 10 * 60 * 1000) {
      throw new Error("GPT 분석이 10분을 초과했습니다. 키워드를 좁히거나 다시 시도해 주세요.");
    }
    console.log(JSON.stringify({ keyword, responseId, status: payload.status }));
    await wait(5000);
    const { response: pollResponse, payload: pollPayload } = await fetchOpenAiJson(`https://api.openai.com/v1/responses/${responseId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    }, "OpenAI response polling");
    payload = pollPayload;
    if (!pollResponse.ok) {
      throw new Error(payload?.error?.message ?? `OpenAI polling error: ${pollResponse.status}`);
    }
  }

  if (payload?.status === "incomplete") {
    throw new Error(`OpenAI 응답이 중간에 종료되었습니다: ${payload?.incomplete_details?.reason ?? "unknown"}`);
  }
  if (payload?.status !== "completed") {
    throw new Error(`OpenAI 분석 실패: ${payload?.status ?? "unknown"}`);
  }

  const data = ensureDisplayableData(parseJsonFromText(extractJsonText(payload)), keyword);
  const graphNodeCount = Array.isArray(data?.graph_nodes) ? data.graph_nodes.length : 0;
  const discoveredJobCount = Array.isArray(data?.discovered_jobs) ? data.discovered_jobs.length : 0;
  const postingCount = Array.isArray(data?.raw_job_postings) ? data.raw_job_postings.length : 0;
  console.log(JSON.stringify({ keyword, model: MODEL, reasoning: REASONING_EFFORT, postingCount, discoveredJobCount, graphNodeCount }));
  return data;
};

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, jsonHeaders(request));
    response.end();
    return;
  }

  if (request.url === "/api/health") {
    sendJson(request, response, 200, { ok: true, model: MODEL, reasoningEffort: REASONING_EFFORT });
    return;
  }

  if (request.url === "/api/debug-keyword" && request.method === "POST") {
    try {
      const body = JSON.parse(await readBody(request));
      const keyword = String(body.keyword ?? "").trim();
      sendJson(request, response, 200, {
        keyword,
        codepoints: Array.from(keyword).map((char) => char.codePointAt(0)?.toString(16)),
        promptIncludesKeyword: buildPrompt(keyword).includes(keyword)
      });
    } catch {
      sendJson(request, response, 400, { error: "Invalid JSON request body." });
    }
    return;
  }

  if (request.url !== "/api/analyze" || request.method !== "POST") {
    sendJson(request, response, 404, { error: "Not found" });
    return;
  }

  try {
    const body = JSON.parse(await readBody(request));
    const keyword = String(body.keyword ?? "").trim();
    if (!keyword) {
      sendJson(request, response, 400, { error: "keyword is required" });
      return;
    }
    const data = await analyzeKeyword(keyword);
    sendJson(request, response, 200, { data });
  } catch (error) {
    console.error(error);
    sendJson(request, response, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`analysis api listening on http://127.0.0.1:${PORT}`);
});
