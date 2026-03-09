import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  getCountFromServer,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase.js";

// ─── 설문 데이터 정의 ───────────────────────────────
const SECTIONS = [
  {
    id: "basic", label: "기본 정보", color: "#E8B84B", num: 1,
    questions: [
      { id: "q_gender", text: "성별을 알려주세요.", type: "single", required: true,
        options: ["여성", "남성", "기타 / 답변 안 함"] },
      { id: "q_age", text: "연령대를 알려주세요.", type: "single", required: true,
        options: ["만 18~23세", "만 24~27세", "만 28~33세", "만 34~39세", "만 40세 이상"] },
      { id: "q_spend", text: "한 달에 뷰티 제품 구매에 평균 얼마나 지출하시나요?", type: "single", required: true,
        options: ["3만원 미만", "3만원~7만원", "7만원~15만원", "15만원~30만원", "30만원 이상"] },
    ]
  },
  {
    id: "pain", label: "기존 리뷰 플랫폼 경험", color: "#C0392B", num: 2,
    questions: [
      { id: "q_source", text: "뷰티 제품 구매 시 어떤 정보를 가장 많이 참고하시나요?", type: "multi", max: 2, required: true,
        options: ["화해·글로우픽 등 리뷰 앱", "인스타그램·유튜브 등 SNS", "네이버 블로그·카페", "브랜드 공식몰 리뷰", "주변 지인 추천"] },
      { id: "q_fail", text: "리뷰를 보고 구매했지만 기대와 달랐던 경험이 있으신가요?", type: "single", required: true,
        options: ["자주 있다 (3회 이상/년)", "가끔 있다 (1~2회/년)", "거의 없다", "경험 없음"],
        note: "📌 구매 실패 경험 빈도 → 문제 규모 수치화" },
      { id: "q_pain", text: "기존 리뷰 플랫폼에서 불편하거나 신뢰가 가지 않는 부분이 있으신가요?", type: "multi", required: true,
        options: ["광고·협찬 리뷰가 너무 많다", "나와 피부 타입이 다른 사람의 리뷰가 섞여 있다", "리뷰가 많아도 내 피부에 맞는지 모르겠다", "인기 제품 리뷰만 노출되어 다양성이 없다", "특별히 불편한 점 없다"],
        note: "📌 기존 플랫폼 불만 항목별 비율" },
      { id: "q_need", text: "리뷰를 볼 때 '이 작성자가 나와 피부 타입이 같은지' 확인하고 싶었던 적이 있으신가요?", type: "single", required: true,
        options: ["항상 그렇다", "자주 그렇다", "가끔 그렇다", "그런 생각을 해본 적 없다"],
        note: "📌 예창패 핵심: 나와 같은 피부타입 리뷰 니즈 수치화" },
      { id: "q_reason", text: "뷰티 제품 구매 후 후회한 주된 이유는 무엇이었나요?", type: "single",
        options: ["내 피부 타입에 안 맞았다", "광고·협찬 리뷰에 속았다", "성분이 맞지 않았다", "기대와 다른 발색·텍스처", "후회한 적 없다"] },
    ]
  },
  {
    id: "skin", label: "피부 타입 인식", color: "#27AE60", num: 3,
    questions: [
      { id: "q_know", text: "본인의 피부 타입을 정확히 알고 있다고 생각하시나요?", type: "single", required: true,
        options: ["정확히 알고 있다", "대략적으로 알고 있다", "잘 모르겠다", "전혀 모른다"] },
      { id: "q_howknow", text: "현재 피부 타입을 어떻게 파악하고 계신가요?", type: "multi",
        options: ["피부과·에스테틱에서 진단", "앱·온라인 자가 진단 테스트", "오래 쓴 경험으로 스스로 판단", "건성/지성/복합/민감 정도만 안다", "잘 모른다"] },
      { id: "q_axis", text: "피부 타입을 4가지 요소(생활환경 / 유수분 상태 / 민감도 / 루틴 스타일)로 세분화한다면 유용할 것 같으신가요?", type: "scale", required: true,
        options: ["1\n전혀\n아님", "2", "3\n보통", "4", "5\n매우\n유용"],
        note: "📌 32타입 분류 소비자 수용도" },
      { id: "q_code", text: "MBTI처럼 피부를 코드(예: E-C-S-B)로 표현한다면 활용할 것 같으신가요?", type: "single",
        options: ["매우 그럴 것 같다 – 재밌고 공유하고 싶다", "아마 활용할 것 같다", "잘 모르겠다", "복잡할 것 같아서 안 쓸 것 같다"] },
    ]
  },
  {
    id: "concept", label: "SKINCODE 컨셉 반응", color: "#2563B0", num: 4,
    questions: [
      { id: "q_intent", text: '"내 피부 타입과 같은 사람의 리뷰를 먼저 보여주는 플랫폼"이 있다면 사용하실 의향이 있으신가요?', type: "scale", required: true,
        options: ["1\n전혀\n없음", "2", "3\n보통", "4", "5\n꼭\n쓰고싶다"],
        note: "📌 예창패 핵심 데이터: SKINCODE 사용 의향" },
      { id: "q_feature", text: "위 플랫폼에서 어떤 기능이 가장 중요할 것 같으신가요?", type: "multi", max: 2,
        options: ["내 피부 타입과 같은 사람의 리뷰 우선 노출", "내 피부 타입에 맞는 제품 추천", "광고·협찬 리뷰 자동 분리/표시", "타입별 만족도 통계 확인", "비슷한 피부 타입 커뮤니티"] },
      { id: "q_trust", text: "이 기능이 있다면 기존 플랫폼보다 더 신뢰할 수 있을 것 같으신가요?", type: "single",
        options: ["훨씬 더 신뢰할 것 같다", "조금 더 신뢰할 것 같다", "비슷할 것 같다", "잘 모르겠다"] },
      { id: "q_nps", text: "이 플랫폼이 출시되면 주변에 추천할 의향이 있으신가요?", type: "scale",
        options: ["1\n전혀\n없음", "2", "3\n보통", "4", "5\n꼭\n추천"],
        note: "📌 NPS(순추천지수) 측정" },
      { id: "q_open", text: "기대되는 점 또는 걱정되는 점을 자유롭게 적어주세요. (선택)", type: "open" },
      { id: "q_beta", text: "사전 오픈 베타 테스터에 참여할 의향이 있으신가요?", type: "single",
        options: ["꼭 참여하고 싶다", "관심 있다 (정식 출시 시 사용 예정)", "잘 모르겠다", "참여 의향 없다"],
        note: "📌 프리유저 모집 전환율 측정" },
      { id: "q_email", text: "이메일 주소를 남겨주시면 베타 오픈 시 가장 먼저 연락드릴게요! 📩", type: "email",
        note: "📌 베타 참여 의향자에게만 표시됨 (선택)",
        showIf: { qId: "q_beta", values: ["꼭 참여하고 싶다", "관심 있다 (정식 출시 시 사용 예정)"] } },
    ]
  }
];

const ALL_QUESTIONS = SECTIONS.flatMap(s => s.questions);
const TOTAL = ALL_QUESTIONS.length;

const PALETTE = {
  navy: "#1a2744", blue: "#2563b0", sky: "#5ba4e6",
  cream: "#f8f5f0", white: "#ffffff", gray: "#f2f4f8",
  accent: "#e8b84b", text: "#1a1a2e", muted: "#6b7280",
};

// ─── Firebase helpers ────────────────────────────
const RESPONSES_COLLECTION = "survey_responses";

async function submitResponse(answers) {
  await addDoc(collection(db, RESPONSES_COLLECTION), {
    ...answers,
    submitted_at: serverTimestamp(),
  });
}

async function fetchResults() {
  const snap = await getDocs(collection(db, RESPONSES_COLLECTION));
  const responses = snap.docs.map(d => d.data());
  const count = responses.length;

  const agg = {};
  ALL_QUESTIONS.forEach(q => {
    agg[q.id] = {};
    if (q.options) {
      q.options.forEach(opt => { agg[q.id][opt.replace(/\n/g, " ")] = 0; });
    }
  });

  responses.forEach(resp => {
    ALL_QUESTIONS.forEach(q => {
      const val = resp[q.id];
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach(v => { if (agg[q.id][v] !== undefined) agg[q.id][v]++; });
      } else if (q.type !== "open" && q.type !== "email") {
        const k = String(val).replace(/\n/g, " ");
        if (agg[q.id][k] !== undefined) agg[q.id][k]++;
      }
    });
  });

  return { count, agg, responses };
}

// ─── App ─────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("survey");
  const [answers, setAnswers] = useState({});
  const [currentSection, setCurrentSection] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [totalResponses, setTotalResponses] = useState(0);
  const [resultsData, setResultsData] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);

  const section = SECTIONS[currentSection];

  const handleAnswer = (qId, value, type, max) => {
    if (type === "multi") {
      const prev = answers[qId] || [];
      if (prev.includes(value)) {
        setAnswers(a => ({ ...a, [qId]: prev.filter(v => v !== value) }));
      } else {
        if (max && prev.length >= max) return;
        setAnswers(a => ({ ...a, [qId]: [...prev, value] }));
      }
    } else {
      setAnswers(a => ({ ...a, [qId]: value }));
    }
  };

  const isSectionValid = () =>
    section.questions.every(q => {
      if (!q.required) return true;
      const ans = answers[q.id];
      if (!ans) return false;
      if (Array.isArray(ans) && ans.length === 0) return false;
      return true;
    });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitResponse(answers);
      // 제출 후 총 응답 수 가져오기
      const snap = await getCountFromServer(collection(db, RESPONSES_COLLECTION));
      setTotalResponses(snap.data().count);
      setView("done");
    } catch (e) {
      console.error(e);
      alert("제출 중 오류가 발생했습니다. 다시 시도해 주세요.");
    }
    setSubmitting(false);
  };

  const loadResults = async () => {
    setLoadingResults(true);
    try {
      const data = await fetchResults();
      setResultsData(data);
    } catch (e) {
      console.error(e);
    }
    setLoadingResults(false);
  };

  useEffect(() => {
    if (view === "results") loadResults();
  }, [view]);

  const answeredCount = Object.keys(answers).filter(k => {
    const v = answers[k];
    return v && (Array.isArray(v) ? v.length > 0 : true);
  }).length;
  const progress = Math.round((answeredCount / TOTAL) * 100);

  // ─── SURVEY VIEW ─────────────────────────────
  if (view === "survey") return (
    <div style={{ fontFamily: "'Noto Sans KR', Apple SD Gothic Neo, sans-serif", background: PALETTE.cream, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${PALETTE.navy} 0%, #2a3f7a 60%, #1e5ca8 100%)`, padding: "36px 24px 28px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: PALETTE.accent, color: PALETTE.navy, fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: "4px 14px", borderRadius: 20, marginBottom: 14 }}>
          SKINCODE · 사전 설문조사
        </div>
        <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>
          당신의 피부, 제대로 된 리뷰를<br />
          <span style={{ color: PALETTE.accent }}>찾아본 적 있으신가요?</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,.7)", fontSize: 13, marginBottom: 20 }}>
          총 {TOTAL}문항 · 약 3~5분 · 뷰티 관심 2030
        </p>
        <div style={{ maxWidth: 400, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "rgba(255,255,255,.8)", fontSize: 12 }}>응답 현황</span>
            <span style={{ color: PALETTE.accent, fontSize: 12, fontWeight: 700 }}>{answeredCount}/{TOTAL}</span>
          </div>
          <div style={{ background: "rgba(255,255,255,.2)", borderRadius: 8, height: 6 }}>
            <div style={{ background: PALETTE.accent, width: `${progress}%`, height: 6, borderRadius: 8, transition: "width .3s" }} />
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: "flex", overflowX: "auto", background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
        {SECTIONS.map((s, i) => (
          <button key={s.id} onClick={() => setCurrentSection(i)}
            style={{ flex: 1, minWidth: 80, padding: "12px 8px", border: "none", cursor: "pointer", fontSize: 12,
              fontWeight: currentSection === i ? 700 : 400,
              background: currentSection === i ? "#fff" : "#fafafa",
              color: currentSection === i ? s.color : PALETTE.muted,
              borderBottom: currentSection === i ? `3px solid ${s.color}` : "3px solid transparent",
              transition: "all .2s", whiteSpace: "nowrap" }}>
            {s.num}. {s.label}
          </button>
        ))}
      </div>

      {/* Questions */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 40px" }}>
        {section.questions.map((q, qi) => {
          const globalIdx = SECTIONS.slice(0, currentSection).reduce((acc, s) => acc + s.questions.length, 0) + qi + 1;
          return (
            <div key={q.id} style={{ background: "#fff", borderRadius: 14, padding: "22px 20px", marginBottom: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(26,39,68,.05)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.sky, letterSpacing: 1.5, marginBottom: 6 }}>
                Q{globalIdx}
                {q.required && <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10, marginLeft: 8 }}>필수</span>}
                {q.type === "multi" && <span style={{ background: "#e0f2fe", color: "#0369a1", fontSize: 10, padding: "1px 7px", borderRadius: 10, marginLeft: 6 }}>복수선택{q.max ? ` 최대${q.max}개` : ""}</span>}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: PALETTE.navy, marginBottom: 14, lineHeight: 1.6 }}>{q.text}</div>

              {(q.type === "single" || q.type === "multi") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {q.options.map(opt => {
                    const selected = q.type === "multi"
                      ? (answers[q.id] || []).includes(opt)
                      : answers[q.id] === opt;
                    return (
                      <div key={opt} onClick={() => handleAnswer(q.id, opt, q.type, q.max)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                          borderRadius: 8, border: `1.5px solid ${selected ? section.color : "#e2e8f0"}`,
                          background: selected ? `${section.color}12` : "#fafafa",
                          cursor: "pointer", fontSize: 14, color: selected ? section.color : "#374151",
                          fontWeight: selected ? 600 : 400, transition: "all .15s", userSelect: "none" }}>
                        <div style={{ width: 18, height: 18, borderRadius: q.type === "multi" ? 4 : "50%",
                          border: `2px solid ${selected ? section.color : "#cbd5e1"}`,
                          background: selected ? section.color : "transparent", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {selected && <div style={{ width: 8, height: 8, background: "#fff", borderRadius: q.type === "multi" ? 2 : "50%" }} />}
                        </div>
                        {opt}
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === "scale" && (
                <div style={{ display: "flex", gap: 8 }}>
                  {q.options.map((opt, i) => {
                    const val = String(i + 1);
                    const selected = answers[q.id] === val;
                    return (
                      <div key={i} onClick={() => handleAnswer(q.id, val, "single")}
                        style={{ flex: 1, textAlign: "center", padding: "12px 4px 8px",
                          borderRadius: 10, border: `1.5px solid ${selected ? section.color : "#e2e8f0"}`,
                          background: selected ? section.color : "#fafafa",
                          cursor: "pointer", transition: "all .15s", userSelect: "none" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: selected ? "#fff" : PALETTE.navy }}>{i + 1}</div>
                        {opt.split("\n").slice(1).map((l, j) => (
                          <div key={j} style={{ fontSize: 10, color: selected ? "rgba(255,255,255,.85)" : PALETTE.muted, marginTop: 2, lineHeight: 1.3 }}>{l}</div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === "open" && (
                <textarea value={answers[q.id] || ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                  placeholder="자유롭게 작성해 주세요..."
                  style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "12px 14px",
                    fontSize: 14, fontFamily: "inherit", resize: "none", height: 80,
                    background: "#fafafa", outline: "none", color: "#374151" }} />
              )}

              {q.type === "email" && (() => {
                const cond = q.showIf;
                const shouldShow = cond ? (cond.values || []).includes(answers[cond.qId]) : true;
                if (!shouldShow) return null;
                const emailVal = answers[q.id] || "";
                const isValid = !emailVal || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
                return (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10 }}>
                        베타 참여 의향자 전용
                      </div>
                    </div>
                    <input type="email" value={emailVal}
                      onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                      placeholder="example@email.com"
                      style={{ width: "100%", border: `1.5px solid ${!isValid ? "#f87171" : emailVal ? "#22c55e" : "#e2e8f0"}`,
                        borderRadius: 8, padding: "12px 14px", fontSize: 14, fontFamily: "inherit",
                        background: "#fafafa", outline: "none", color: "#374151", transition: "border .2s" }} />
                    {!isValid && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>올바른 이메일 형식을 입력해 주세요.</div>}
                    {emailVal && isValid && <div style={{ fontSize: 12, color: "#16a34a", marginTop: 6 }}>✅ 입력 완료! 베타 오픈 시 연락드릴게요.</div>}
                    <div style={{ fontSize: 12, color: PALETTE.muted, marginTop: 8 }}>* 이메일은 베타 테스트 안내 외 다른 목적으로 사용되지 않습니다.</div>
                  </div>
                );
              })()}

              {q.note && (
                <div style={{ marginTop: 10, padding: "7px 12px", background: "#eff6ff", borderRadius: 6, borderLeft: `3px solid ${PALETTE.sky}`, fontSize: 12, color: "#1e40af" }}>
                  {q.note}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          {currentSection > 0 && (
            <button onClick={() => setCurrentSection(c => c - 1)}
              style={{ flex: 1, padding: "14px", borderRadius: 10, border: `2px solid ${PALETTE.navy}`,
                background: "#fff", color: PALETTE.navy, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              ← 이전
            </button>
          )}
          {currentSection < SECTIONS.length - 1 ? (
            <button onClick={() => { if (isSectionValid()) setCurrentSection(c => c + 1); else alert("필수 항목을 모두 응답해 주세요."); }}
              style={{ flex: 2, padding: "14px", borderRadius: 10, border: "none",
                background: isSectionValid() ? section.color : "#cbd5e1",
                color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "background .2s" }}>
              다음 섹션 →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              style={{ flex: 2, padding: "14px", borderRadius: 10, border: "none",
                background: submitting ? "#94a3b8" : PALETTE.navy,
                color: "#fff", fontSize: 15, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer" }}>
              {submitting ? "제출 중..." : "✅ 제출하기"}
            </button>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={() => setView("results")}
            style={{ background: "none", border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 20px",
              fontSize: 13, color: PALETTE.muted, cursor: "pointer" }}>
            📊 실시간 결과 보기
          </button>
        </div>
      </div>
    </div>
  );

  // ─── DONE VIEW ───────────────────────────────
  if (view === "done") return (
    <div style={{ fontFamily: "inherit", background: PALETTE.cream, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "48px 36px", textAlign: "center", maxWidth: 480, boxShadow: "0 8px 32px rgba(26,39,68,.1)" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>💙</div>
        <h2 style={{ color: PALETTE.navy, fontSize: 22, fontWeight: 700, marginBottom: 12 }}>설문 완료!</h2>
        <p style={{ color: PALETTE.muted, fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
          소중한 응답 감사합니다.<br />
          SKINCODE가 출시되면 가장 먼저 알려드릴게요.
        </p>
        <div style={{ background: "#eff6ff", borderRadius: 12, padding: "16px 20px", marginBottom: 28, textAlign: "left" }}>
          <div style={{ fontSize: 13, color: "#1e40af", fontWeight: 700, marginBottom: 8 }}>📌 지금까지 {totalResponses}명이 응답했어요</div>
          <div style={{ fontSize: 12, color: "#3b82f6" }}>실시간 결과에서 집계된 데이터를 확인하세요</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
          <button onClick={() => setView("results")}
            style={{ padding: "14px", borderRadius: 10, border: "none", background: PALETTE.navy, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            📊 실시간 결과 확인하기
          </button>
          <button onClick={() => { setAnswers({}); setCurrentSection(0); setView("survey"); }}
            style={{ padding: "12px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: PALETTE.muted, fontSize: 13, cursor: "pointer" }}>
            처음으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );

  // ─── RESULTS VIEW ────────────────────────────
  if (view === "results") return (
    <div style={{ fontFamily: "inherit", background: PALETTE.cream, minHeight: "100vh" }}>
      <div style={{ background: `linear-gradient(135deg, ${PALETTE.navy}, #2a3f7a)`, padding: "28px 24px", textAlign: "center" }}>
        <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>📊 실시간 설문 결과</h1>
        <p style={{ color: "rgba(255,255,255,.7)", fontSize: 13 }}>SKINCODE 사전 설문 집계</p>
        {resultsData && (
          <div style={{ display: "inline-block", background: PALETTE.accent, color: PALETTE.navy, fontWeight: 700, fontSize: 16, padding: "8px 24px", borderRadius: 20, marginTop: 12 }}>
            총 {resultsData.count}명 응답
          </div>
        )}
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px" }}>
        {loadingResults ? (
          <div style={{ textAlign: "center", padding: 60, color: PALETTE.muted, fontSize: 15 }}>데이터 불러오는 중...</div>
        ) : resultsData && resultsData.count === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📭</div>
            <p style={{ color: PALETTE.muted }}>아직 응답이 없어요. 링크를 공유해 보세요!</p>
          </div>
        ) : resultsData ? (
          <>
            {SECTIONS.map(sec => (
              <div key={sec.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "32px 0 16px" }}>
                  <div style={{ width: 10, height: 32, background: sec.color, borderRadius: 4 }} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: PALETTE.navy }}>섹션 {sec.num}. {sec.label}</span>
                </div>
                {sec.questions.filter(q => q.type !== "open" && q.type !== "email").map((q, qi) => {
                  const globalIdx = SECTIONS.slice(0, SECTIONS.indexOf(sec)).reduce((a, s) => a + s.questions.length, 0) + qi + 1;
                  const data = resultsData.agg[q.id] || {};
                  const total = resultsData.count;
                  const entries = Object.entries(data);
                  const maxVal = Math.max(...entries.map(([, v]) => v), 1);
                  return (
                    <div key={q.id} style={{ background: "#fff", borderRadius: 14, padding: "20px", marginBottom: 12, border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 11, color: PALETTE.sky, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>Q{globalIdx}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: PALETTE.navy, marginBottom: 16, lineHeight: 1.5 }}>{q.text}</div>
                      {entries.map(([opt, cnt]) => {
                        const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
                        return (
                          <div key={opt} style={{ marginBottom: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 13, color: "#374151" }}>{opt}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: sec.color }}>{pct}% ({cnt}명)</span>
                            </div>
                            <div style={{ background: "#f1f5f9", borderRadius: 6, height: 8 }}>
                              <div style={{ background: cnt === maxVal ? sec.color : `${sec.color}70`, width: `${pct}%`, height: 8, borderRadius: 6, transition: "width .6s ease", minWidth: cnt > 0 ? 4 : 0 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {sec.questions.filter(q => q.type === "open").map(q => {
                  const opens = resultsData.responses.map(r => r[q.id]).filter(Boolean);
                  if (!opens.length) return null;
                  return (
                    <div key={q.id} style={{ background: "#fff", borderRadius: 14, padding: "20px", marginBottom: 12, border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: PALETTE.navy, marginBottom: 14 }}>주관식 응답 ({opens.length}건)</div>
                      {opens.map((txt, i) => (
                        <div key={i} style={{ padding: "10px 14px", background: "#f8faff", borderRadius: 8, marginBottom: 8, fontSize: 13, color: "#374151", borderLeft: `3px solid ${sec.color}` }}>
                          {txt}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        ) : null}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={() => setView("survey")}
            style={{ flex: 1, padding: "13px", borderRadius: 10, border: `2px solid ${PALETTE.navy}`, background: "#fff", color: PALETTE.navy, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            ← 설문으로
          </button>
          <button onClick={loadResults}
            style={{ flex: 1, padding: "13px", borderRadius: 10, border: "none", background: PALETTE.navy, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            🔄 새로고침
          </button>
        </div>

        {/* 이메일 수집 목록 */}
        {resultsData && (() => {
          const emails = resultsData.responses
            .filter(r => r.q_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.q_email))
            .map(r => ({ email: r.q_email, beta: r.q_beta || "-" }));
          if (!emails.length) return (
            <div style={{ marginTop: 24, background: "#fff", borderRadius: 14, padding: "20px", border: "1px solid #e2e8f0", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: PALETTE.muted }}>📭 아직 이메일 수집이 없어요.</div>
            </div>
          );
          return (
            <div style={{ marginTop: 24, background: "#fff", borderRadius: 14, padding: "20px", border: "2px solid #22c55e" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: PALETTE.navy }}>📩 베타 신청 이메일 목록</div>
                <div style={{ background: "#dcfce7", color: "#16a34a", fontSize: 13, fontWeight: 700, padding: "4px 14px", borderRadius: 20 }}>
                  {emails.length}명
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {emails.map((e, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", background: "#f0fdf4", borderRadius: 8, borderLeft: "3px solid #22c55e" }}>
                    <span style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>{e.email}</span>
                    <span style={{ fontSize: 11, color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: 8 }}>
                      {e.beta === "꼭 참여하고 싶다" ? "🔥 적극 참여" : "👀 관심 있음"}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: PALETTE.muted, padding: "8px 12px", background: "#f8fafc", borderRadius: 6 }}>
                💡 이메일을 드래그해서 복사하거나, 엑셀에 붙여넣어 관리하세요.
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
