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
    try {
      return estimateData ? JSON.parse(estimateData) : null
    } catch {
      return null
    }
  }, [estimateData])

  const payload = parsed?.clark_questions_payload
  const status = parsed?.meta?.status
  const questions: Question[] = Array.isArray(payload?.questions) ? payload.questions : []

  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const fromSaved = Array.isArray(parsed?.clark_answers) ? parsed.clark_answers : []
    return fromSaved.reduce((acc: Record<string, string>, curr: any) => {
      if (curr?.id) acc[curr.id] = curr.answer ?? ""
      return acc
    }, {})
  })
  const [sending, setSending] = useState(false)

  if (status !== "clark_questions" || !payload) return null

  async function handleFinalize() {
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
    <div id="clark-questions-card" style={{ marginBottom: "1.5rem", border: "1px solid #f4c542", background: "#fffbeb", borderRadius: "10px", padding: "1rem 1.1rem" }}>
      <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a6700", fontWeight: 700, marginBottom: "0.35rem" }}>
        Clark has questions
      </p>
      <p style={{ fontSize: "13px", color: "#7a5d00", marginBottom: "0.75rem", lineHeight: 1.6 }}>{payload.scope_summary}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
        {questions.map((q, idx) => (
          <div key={q.id} style={{ background: "#fff", border: "1px solid #f0d97a", borderRadius: "8px", padding: "0.8rem" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#6b5100", marginBottom: "0.35rem" }}>{idx + 1}. {q.question}</p>
            <p style={{ fontSize: "12px", color: "#9a6700", marginBottom: "0.6rem" }}>{q.context}</p>

            {q.type === "choice" && Array.isArray(q.choices) && q.choices.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {q.choices.map(choice => (
                  <label key={choice} style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "13px", color: "#6b5100" }}>
                    <input
                      type="radio"
                      name={q.id}
                      value={choice}
                      checked={(answers[q.id] ?? "") === choice}
                      onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    />
                    <span>{choice}</span>
                  </label>
                ))}
              </div>
            ) : (
              <input
                type={q.type === "number" ? "number" : "text"}
                value={answers[q.id] ?? ""}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder={q.type === "number" ? "Enter a number" : "Type your answer"}
                style={{ width: "100%", padding: "0.5rem 0.65rem", border: "1px solid #f0d97a", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
              />
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleFinalize}
          disabled={sending}
          style={{ padding: "0.6rem 1rem", border: "none", borderRadius: "7px", background: "#9a6700", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.8 : 1 }}
        >
          {sending ? "Sending..." : "Send answers to Clark"}
        </button>
      </div>
    </div>
  )
}
