import { useMemo, useRef, useState } from 'react'
import { SparklesIcon } from './Icons'

type SpeechRecognitionResultLike = {
  transcript: string
}

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>
}

type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike

type SpeechRecognitionWindow = {
  SpeechRecognition?: SpeechRecognitionConstructorLike
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike
}

export type AssistantSheetProps = {
  open: boolean
  onClose: () => void
  onSubmit: (text: string) => Promise<AssistantResult | null> | AssistantResult | null
  onApplyPlan?: (
    apply: AssistantPlanApply,
  ) => Promise<AssistantResult | null> | AssistantResult | null
}

export type AssistantPlanApply = {
  eventsNext?: unknown
  themesNext?: unknown
  highlightIds?: string[]
  navigateTo?: 'calendar' | 'schedule' | 'report'
  scheduleDateKey?: string
}

export type AssistantPlanOption = {
  id: 'A' | 'B'
  name: string
  summary: string
  rationale: string
  changes: string[]
  apply: AssistantPlanApply
}

export type AssistantResult =
  | {
      type: 'events_added'
      title: string
      items: Array<{ title: string; when: string }>
    }
  | {
      type: 'theme_updated'
      title: string
      detail: string
    }
  | {
      type: 'navigated'
      title: string
      detail: string
    }
  | {
      type: 'noop'
      title: string
      detail: string
    }
  | {
      type: 'plan_options'
      title: string
      detail: string
      plans: [AssistantPlanOption, AssistantPlanOption]
    }

type AssistantStep = {
  label: string
  state: 'pending' | 'running' | 'done'
}

type AssistantRun = {
  id: string
  input: string
  steps: AssistantStep[]
  result: AssistantResult | null
}

export function AssistantSheet({
  open,
  onClose,
  onSubmit,
  onApplyPlan,
}: AssistantSheetProps) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const [runs, setRuns] = useState<AssistantRun[]>([])
  const [submitting, setSubmitting] = useState(false)

  const canUseSpeech = useMemo(() => {
    const w = window as unknown as SpeechRecognitionWindow
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
  }, [])

  const startVoice = () => {
    if (!canUseSpeech) return
    const w = window as unknown as SpeechRecognitionWindow
    const SpeechRecognitionCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) return
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'zh-CN'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0]?.transcript ?? '')
        .join('')
      setText(transcript)
    }
    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }
    recognition.onerror = () => {
      setListening(false)
      recognitionRef.current = null
    }
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  const stopVoice = () => {
    const recognition = recognitionRef.current
    if (recognition) recognition.stop()
  }

  const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
  const rand = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min

  const submit = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setText('')
    if (listening) stopVoice()

    const runId = `run-${Date.now()}`
    const initialSteps: AssistantStep[] = [
      { label: '理解你的需求', state: 'running' },
      { label: '解析时间与任务', state: 'pending' },
      { label: '检查冲突与可行性', state: 'pending' },
      { label: '生成调整方案', state: 'pending' },
      { label: '完成', state: 'pending' },
    ]

    setRuns((prev) => [{ id: runId, input: trimmed, steps: initialSteps, result: null }, ...prev])
    setSubmitting(true)

    const advance = (index: number) => {
      setRuns((prev) =>
        prev.map((r) => {
          if (r.id !== runId) return r
          const nextSteps = r.steps.map((s, idx) => {
            if (idx < index) return { ...s, state: 'done' as const }
            if (idx === index) return { ...s, state: 'running' as const }
            return s
          })
          return { ...r, steps: nextSteps }
        }),
      )
    }

    try {
      await delay(rand(300, 800))
      advance(1)
      await delay(rand(300, 800))
      advance(2)
      await delay(rand(300, 800))
      advance(3)

      const result = await onSubmit(trimmed)
      await delay(rand(300, 800))

      setRuns((prev) =>
        prev.map((r) => {
          if (r.id !== runId) return r
          const doneSteps = r.steps.map((s) => ({ ...s, state: 'done' as const }))
          return {
            ...r,
            steps: doneSteps,
            result:
              result ?? { type: 'noop', title: '我还没能理解这个指令', detail: '你可以试试：下午3点加个会议 / 周末安排健身 / 帮我优化今天安排' },
          }
        }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const applyPlan = async (runId: string, plan: AssistantPlanOption) => {
    if (!onApplyPlan) return
    setSubmitting(true)
    try {
      const result = await onApplyPlan(plan.apply)
      setRuns((prev) =>
        prev.map((r) => {
          if (r.id !== runId) return r
          return {
            ...r,
            result:
              result ??
              ({
                type: 'noop',
                title: '我帮你调整了一下安排',
                detail: '已应用方案，但暂时没有可展示的确认信息',
              } satisfies AssistantResult),
          }
        }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="sheetOverlay" role="dialog" aria-modal="true">
      <button
        type="button"
        className="sheetBackdrop"
        aria-label="Close assistant"
        onClick={() => {
          if (listening) stopVoice()
          onClose()
        }}
      />
      <div className="sheet">
        <button
          type="button"
          className="sheetHandleButton"
          aria-label="Close assistant"
          onClick={() => {
            if (listening) stopVoice()
            onClose()
          }}
        >
          <div className="sheetHandle" aria-hidden="true" />
        </button>
        <div className="sheetCenter">
          <div className="sheetIcon">
            <SparklesIcon size={22} />
          </div>
          <div className="sheetTitle">How can I help?</div>
          <div className="sheetSubtitle">
            Ask me to reschedule, find time, or optimize your day
          </div>
        </div>

        {runs.length ? (
          <div className="assistantLog">
            {runs.slice(0, 1).map((run) => (
              <div key={run.id} className="assistantRunCard">
                <div className="assistantRunInput">{run.input}</div>
                <div className="assistantSteps">
                  {run.steps.map((s) => (
                    <div key={s.label} className="assistantStep">
                      <span
                        className={
                          s.state === 'done'
                            ? 'assistantStepDot assistantStepDotDone'
                            : s.state === 'running'
                              ? 'assistantStepDot assistantStepDotRun'
                              : 'assistantStepDot'
                        }
                        aria-hidden="true"
                      />
                      <span className="assistantStepText">{s.label}</span>
                    </div>
                  ))}
                </div>

                {run.result ? (
                  <div className="assistantResult">
                    <div className="assistantResultTitle">{run.result.title}</div>
                    {'detail' in run.result ? (
                      <div className="assistantResultDetail">{run.result.detail}</div>
                    ) : null}
                    {'items' in run.result ? (
                      <div className="assistantResultItems">
                        {run.result.items.map((it) => (
                          <div key={`${it.title}-${it.when}`} className="assistantResultItem">
                            <div className="assistantResultItemTitle">{it.title}</div>
                            <div className="assistantResultItemWhen">{it.when}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {'plans' in run.result ? (
                      <div className="assistantPlans">
                        {run.result.plans.map((p) => (
                          <div key={p.id} className="assistantPlanCard">
                            <div className="assistantPlanTop">
                              <div className="assistantPlanName">
                                {p.id}. {p.name}
                              </div>
                              <div className="assistantPlanSummary">{p.summary}</div>
                            </div>
                            <div className="assistantPlanRationale">{p.rationale}</div>
                            <div className="assistantPlanChanges">
                              {p.changes.map((c) => (
                                <div key={c} className="assistantPlanChange">
                                  • {c}
                                </div>
                              ))}
                            </div>
                            <div className="assistantPlanActions">
                              <button
                                type="button"
                                className="assistantPlanApply"
                                disabled={submitting || !onApplyPlan}
                                onClick={() => void applyPlan(run.id, p)}
                              >
                                应用方案{p.id}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <div className="assistantInputRow">
          <button
            type="button"
            className={listening ? 'assistantMic assistantMicActive' : 'assistantMic'}
            onClick={() => (listening ? stopVoice() : startVoice())}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            disabled={!canUseSpeech}
          >
            {listening ? '■' : '🎤'}
          </button>
          <input
            className="assistantInput"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入或语音描述你的需求…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit()
            }}
          />
          <button type="button" className="assistantSend" onClick={() => void submit()} disabled={submitting}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
