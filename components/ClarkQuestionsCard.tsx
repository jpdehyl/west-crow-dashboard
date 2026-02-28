"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

type Question = {
  id: string
  question: string
  context: string
  type: "text" | "number" | "choice"
  choices?: string[]
}

export default function ClarkQuestionsCard({ bidId, estimateData }: { bidId: string; estimateData: string | null }) {
  const router = useRouter()
  const parsed = useMemo(() => {
    if (!estimateData) return null
    try {
      return JSON.parse(estimateData)
    } catch {
      return null
    }
  }, [estimateData])

  const questionData = parsed?.clark_questions
  const isQuestionsState = parsed?.meta?.status === "clark_questions" && questionData
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)

  if (!isQuestionsState) return null

  const questions = (questionData.questions ?? []) as Question[]

  async function submit() {
    setSending(true)
    try {
      await fetch(`/api/bids/${bidId}/clark-finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map(q => ({ id: q.id, answer: answers[q.id] ?? "" })),
        }),
      })
      router.refresh()
    } finally {
      setSending(false)
    }
  }

  return (
    <div id="clark-questions-card" style={{ marginBottom: "1.5rem", background: "#fffbeb", border: "1px solid #f1c85a", borderRadius: "10px", padding: "1rem 1.1rem" }}>
      <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a6700", fontWeight: 700, marginBottom: "0.5rem" }}>
        Clark has questions
      </p>
      <p style={{ fontSize: "13px", color: "#7a5300", marginBottom: "0.8rem", lineHeight: 1.55 }}>{questionData.scope_summary}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        {questions.map((q, idx) => (
          <div key={q.id} style={{ background: "#fff", border: "1px solid #f3dea3", borderRadius: "8px", padding: "0.8rem" }}>
            <p style={{ fontSize: "13px", color: "var(--ink)", fontWeight: 600, marginBottom: "0.25rem" }}>{idx + 1}. {q.question}</p>
            {q.context && <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginBottom: "0.5rem" }}>{q.context}</p>}
            {q.type === "choice" && (q.choices?.length ?? 0) > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {q.choices?.map(choice => (
                  <label key={choice} style={{ fontSize: "13px", color: "var(--ink-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={answers[q.id] === choice}
                      onChange={() => setAnswers(prev => ({ ...prev, [q.id]: choice }))}
                    />
                    {choice}
                  </label>
                ))}
              </div>
            ) : (
              <input
                type={q.type === "number" ? "number" : "text"}
                value={answers[q.id] ?? ""}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                style={{ width: "100%", padding: "0.5rem 0.65rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit" }}
              />
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: "0.95rem", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={submit}
          disabled={sending}
          style={{ padding: "0.6rem 1rem", background: "#9a6700", color: "#fff", borderRadius: "7px", border: "none", fontSize: "13px", fontWeight: 600, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1 }}
        >
          {sending ? "Sending..." : "Send answers to Clark"}
        </button>
      </div>
    </div>
  )
}
