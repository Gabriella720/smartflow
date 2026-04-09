import './App.css'
import { useCallback, useMemo, useState } from 'react'
import {
  AssistantSheet,
  type AssistantPlanApply,
  type AssistantResult,
} from './components/AssistantSheet'
import { BottomTabs, type TabId } from './components/BottomTabs'
import { HomeScreen } from './screens/HomeScreen'
import { WeeklyReportScreen } from './screens/WeeklyReportScreen'
import { ScheduleConflictScreen } from './screens/ScheduleConflictScreen'

function FloatingAssistantButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="fab" onClick={onClick} aria-label="AI Assistant">
      <span className="fabIcon" aria-hidden="true">
        ✦
      </span>
    </button>
  )
}

type ThemeMain = 'workday' | 'holiday'
type ThemeSub =
  | 'Normal Workday'
  | 'Business Trip'
  | 'Gym Day'
  | 'Travel Day'
  | 'Cycling'
  | 'Walking'

export type DayTheme = { main: ThemeMain; sub: ThemeSub }

export type CalendarEvent = {
  id: string
  date: string
  tag: 'MEETING' | 'FOCUS' | 'BREAK' | 'HEALTH' | 'PERSONAL'
  title: string
  startMinutes: number
  endMinutes: number
  gradient: string
  completed?: boolean
  notes?: string
  images?: string[]
}

function pad2(v: number) {
  return String(v).padStart(2, '0')
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function addDays(d: Date, days: number) {
  const next = new Date(d)
  next.setDate(d.getDate() + days)
  return next
}

function isWeekend(d: Date) {
  const day = d.getDay()
  return day === 0 || day === 6
}

function defaultThemeFor(d: Date): DayTheme {
  if (isWeekend(d)) return { main: 'holiday', sub: 'Gym Day' }
  return { main: 'workday', sub: 'Normal Workday' }
}

function parseAssistantTime(text: string): number | null {
  const m = text.match(/(上午|下午)?\s*(\d{1,2})\s*点\s*(半)?/)
  if (!m) return null
  const meridiem = m[1]
  const hour = Number(m[2])
  const half = Boolean(m[3])
  let h = hour
  if (meridiem === '下午' && h < 12) h += 12
  if (meridiem === '上午' && h === 12) h = 0
  const minutes = half ? 30 : 0
  return h * 60 + minutes
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('calendar')
  const [assistantOpen, setAssistantOpen] = useState(false)
  const today = new Date()
  const todayKey = dateKey(today)
  const [scheduleDateKey, setScheduleDateKey] = useState<string | null>(null)

  const [themesByDate, setThemesByDate] = useState<Record<string, DayTheme>>(() => {
    const base: Record<string, DayTheme> = {}
    base[todayKey] = defaultThemeFor(today)
    base[dateKey(addDays(today, 1))] = defaultThemeFor(addDays(today, 1))
    base[dateKey(addDays(today, -1))] = defaultThemeFor(addDays(today, -1))
    return base
  })

  const [events, setEvents] = useState<CalendarEvent[]>(() => [
    {
      id: 'e1',
      date: todayKey,
      tag: 'MEETING',
      title: 'Morning Standup',
      startMinutes: 9 * 60,
      endMinutes: 9 * 60 + 30,
      gradient: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
      completed: true,
    },
    {
      id: 'e2',
      date: todayKey,
      tag: 'FOCUS',
      title: 'Deep Work: Q2 Strategy',
      startMinutes: 10 * 60,
      endMinutes: 12 * 60,
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
      completed: true,
    },
    {
      id: 'e3',
      date: todayKey,
      tag: 'BREAK',
      title: 'Lunch Break',
      startMinutes: 12 * 60,
      endMinutes: 13 * 60,
      gradient: 'linear-gradient(135deg, #22c55e 0%, #34d399 100%)',
    },
    {
      id: 'e4',
      date: todayKey,
      tag: 'MEETING',
      title: 'Client Presentation',
      startMinutes: 14 * 60,
      endMinutes: 15 * 60 + 30,
      gradient: 'linear-gradient(135deg, #0ea5e9 0%, #1d4ed8 100%)',
    },
    {
      id: 'e5',
      date: todayKey,
      tag: 'FOCUS',
      title: 'Design Review',
      startMinutes: 16 * 60,
      endMinutes: 17 * 60 + 30,
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
    },
    {
      id: 'e6',
      date: todayKey,
      tag: 'HEALTH',
      title: 'Evening Workout',
      startMinutes: 18 * 60,
      endMinutes: 19 * 60,
      gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
    },
    {
      id: 'h1',
      date: dateKey(addDays(today, -1)),
      tag: 'FOCUS',
      title: 'Weekly Planning',
      startMinutes: 9 * 60,
      endMinutes: 10 * 60,
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
      completed: true,
    },
    {
      id: 'h2',
      date: dateKey(addDays(today, -1)),
      tag: 'HEALTH',
      title: 'Strength Training',
      startMinutes: 18 * 60,
      endMinutes: 19 * 60,
      gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
      completed: true,
    },
  ])

  const [highlightEventIds, setHighlightEventIds] = useState<string[]>([])

  const highlight = useCallback((ids: string[]) => {
    setHighlightEventIds(ids)
    window.setTimeout(() => setHighlightEventIds([]), 2000)
  }, [])

  const formatWhen = (date: string, start: number, end: number) =>
    `${date} ${pad2(Math.floor(start / 60))}:${pad2(start % 60)} - ${pad2(
      Math.floor(end / 60),
    )}:${pad2(end % 60)}`

  const handleAssistantSubmit = async (input: string): Promise<AssistantResult | null> => {
    const text = input.trim()
    if (!text) return null

    const now = new Date()
    const key = dateKey(now)

    const hasMeeting = /会议|meeting/i.test(text)
    const hasGym = /健身|gym/i.test(text)
    const hasTravel = /旅行|travel/i.test(text)
    const hasOptimize = /优化|太忙|冲突/i.test(text)

    if (hasMeeting && !hasOptimize) {
      const start = parseAssistantTime(text) ?? 15 * 60
      const end = start + 60
      const id = `ai-meeting-${Date.now()}`
      setEvents((prev) => [
        ...prev,
        {
          id,
          date: key,
          tag: 'MEETING',
          title: '会议',
          startMinutes: start,
          endMinutes: end,
          gradient: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
        },
      ])
      highlight([id])
      setActiveTab('calendar')
      return {
        type: 'events_added',
        title: '我帮你把会议加进日历了',
        items: [{ title: '会议', when: formatWhen(key, start, end) }],
      }
    }

    if (hasGym && !hasOptimize) {
      const saturday = addDays(now, (6 - now.getDay() + 7) % 7)
      const date = dateKey(saturday)
      const base = `ai-gym-${Date.now()}`
      const gymEvents: CalendarEvent[] = [
        {
          id: `${base}-1`,
          date,
          tag: 'PERSONAL',
          title: 'Travel to Gym',
          startMinutes: 17 * 60 + 45,
          endMinutes: 18 * 60,
          gradient: 'linear-gradient(135deg, #22c55e 0%, #34d399 100%)',
        },
        {
          id: `${base}-2`,
          date,
          tag: 'HEALTH',
          title: 'Warm Up',
          startMinutes: 18 * 60,
          endMinutes: 18 * 60 + 10,
          gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
        },
        {
          id: `${base}-3`,
          date,
          tag: 'HEALTH',
          title: 'Strength Training',
          startMinutes: 18 * 60 + 10,
          endMinutes: 18 * 60 + 50,
          gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
        },
      ]
      setThemesByDate((prev) => ({ ...prev, [date]: { main: 'holiday', sub: 'Gym Day' } }))
      setEvents((prev) => [...prev, ...gymEvents])
      highlight(gymEvents.map((e) => e.id))
      setScheduleDateKey(date)
      setActiveTab('schedule')
      return {
        type: 'events_added',
        title: '我帮你把周末健身安排好了',
        items: gymEvents.map((e) => ({
          title: e.title,
          when: formatWhen(e.date, e.startMinutes, e.endMinutes),
        })),
      }
    }

    if (hasTravel && !hasOptimize) {
      const saturday = addDays(now, (6 - now.getDay() + 7) % 7)
      const date = dateKey(saturday)
      const base = `ai-travel-${Date.now()}`
      const travelEvents: CalendarEvent[] = [
        {
          id: `${base}-1`,
          date,
          tag: 'PERSONAL',
          title: 'Depart',
          startMinutes: 9 * 60,
          endMinutes: 10 * 60 + 30,
          gradient: 'linear-gradient(135deg, #22c55e 0%, #34d399 100%)',
        },
        {
          id: `${base}-2`,
          date,
          tag: 'BREAK',
          title: 'Lunch at local spot',
          startMinutes: 12 * 60,
          endMinutes: 13 * 60,
          gradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
        },
      ]
      setThemesByDate((prev) => ({ ...prev, [date]: { main: 'holiday', sub: 'Travel Day' } }))
      setEvents((prev) => [...prev, ...travelEvents])
      highlight(travelEvents.map((e) => e.id))
      setScheduleDateKey(date)
      setActiveTab('schedule')
      return {
        type: 'events_added',
        title: '我先帮你生成了一个旅行日程草案',
        items: travelEvents.map((e) => ({
          title: e.title,
          when: formatWhen(e.date, e.startMinutes, e.endMinutes),
        })),
      }
    }

    if (/分析.*(运动|健身).*(本月|这个月)/i.test(text)) {
      setActiveTab('report')
      return {
        type: 'navigated',
        title: '已打开 Report',
        detail: '你可以在 Report 查看运动相关统计与历史摘要',
      }
    }

    if (hasOptimize) {
      const todayKeyLocal = key
      const todayEvents = events.filter((e) => e.date === todayKeyLocal && !e.completed)
      const byTag = (tag: CalendarEvent['tag']) => todayEvents.find((e) => e.tag === tag)
      const workout = byTag('HEALTH')
      const focus = byTag('FOCUS')
      const meeting = byTag('MEETING')

      const baseB = `planB-${Date.now()}`

      const eventsNextA = events.map((e) => {
        if (workout && e.id === workout.id) {
          return { ...e, startMinutes: 20 * 60, endMinutes: 21 * 60 }
        }
        return e
      })

      const extraBreak: CalendarEvent = {
        id: `${baseB}-break`,
        date: todayKeyLocal,
        tag: 'BREAK',
        title: 'Recovery Break',
        startMinutes: 16 * 60,
        endMinutes: 16 * 60 + 20,
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
        notes: '给自己留一点缓冲时间',
      }

      const eventsNextB = events
        .filter((e) => !(focus && e.id === focus.id))
        .map((e) => e)
        .concat([extraBreak])

      const planA: AssistantPlanApply = {
        eventsNext: eventsNextA,
        highlightIds: workout ? [workout.id] : [],
        navigateTo: 'calendar',
      }

      const planB: AssistantPlanApply = {
        eventsNext: eventsNextB,
        highlightIds: [extraBreak.id],
        navigateTo: 'calendar',
      }

      return {
        type: 'plan_options',
        title: '我可以给你两套调整方案',
        detail: '你想偏效率，还是偏健康？我会按你的选择更新今天安排。',
        plans: [
          {
            id: 'A',
            name: 'Plan A（效率优先）',
            summary: '尽量保留工作块，把可挪动项往后放',
            rationale: '你今天的工作块优先级更高，我把运动时间后移，减少对工作连续性的打断。',
            changes: [
              workout ? `将「${workout.title}」调整到 20:00-21:00` : '将运动时间后移',
              meeting ? `保留「${meeting.title}」不变` : '保留核心事项不变',
            ],
            apply: planA,
          },
          {
            id: 'B',
            name: 'Plan B（健康优先）',
            summary: '释放部分负荷，插入恢复时间',
            rationale: '你已经比较忙了，我减少高强度任务，并加一段恢复时间，让节奏更可持续。',
            changes: [
              focus ? `移除/下沉「${focus.title}」` : '减少高强度任务',
              '增加 20 分钟恢复休息',
            ],
            apply: planB,
          },
        ],
      }
    }

    return { type: 'noop', title: '我还没能理解这个指令', detail: '你可以试试：下午3点加个会议 / 周末安排健身 / 帮我优化今天安排' }
  }

  const handleApplyPlan = async (apply: AssistantPlanApply): Promise<AssistantResult | null> => {
    const nextEvents = apply.eventsNext ? (apply.eventsNext as CalendarEvent[]) : null
    const highlightIds = apply.highlightIds ?? []

    if (apply.themesNext) {
      setThemesByDate(apply.themesNext as Record<string, DayTheme>)
    }
    if (apply.eventsNext) {
      setEvents(nextEvents as CalendarEvent[])
    }
    if (highlightIds.length) highlight(highlightIds)
    if (apply.scheduleDateKey) setScheduleDateKey(apply.scheduleDateKey)
    if (apply.navigateTo) setActiveTab(apply.navigateTo)

    const confirmItems =
      nextEvents && highlightIds.length
        ? highlightIds
            .map((id) => nextEvents.find((e) => e.id === id))
            .filter(Boolean)
            .map((e) => ({
              title: (e as CalendarEvent).title,
              when: formatWhen(
                (e as CalendarEvent).date,
                (e as CalendarEvent).startMinutes,
                (e as CalendarEvent).endMinutes,
              ),
            }))
        : []

    return {
      type: 'events_added',
      title: '我帮你调整了一下安排',
      items: confirmItems.length ? confirmItems : [{ title: '已更新日程', when: '可在页面里查看变更' }],
    }
  }

  const screen = useMemo(() => {
    switch (activeTab) {
      case 'calendar':
        return (
          <HomeScreen
            events={events}
            highlightEventIds={highlightEventIds}
            onOpenSchedule={(date: string) => {
              setScheduleDateKey(date)
              setActiveTab('schedule')
            }}
          />
        )
      case 'schedule':
        return (
          <ScheduleConflictScreen
            key={scheduleDateKey ?? 'today'}
            events={events}
            themesByDate={themesByDate}
            initialDateKey={scheduleDateKey ?? undefined}
            onAddedToCalendar={(ids) => {
              highlight(ids)
              setScheduleDateKey(null)
              setActiveTab('calendar')
            }}
            onChangeTheme={(date: string, theme: DayTheme) =>
              setThemesByDate((prev) => ({ ...prev, [date]: theme }))
            }
            onUpdateEvents={setEvents}
          />
        )
      case 'report':
        return <WeeklyReportScreen events={events} themesByDate={themesByDate} demoMode />
    }
  }, [activeTab, events, highlight, highlightEventIds, scheduleDateKey, themesByDate])

  return (
    <div className="appFrame">
      <div className="phone">
        <div className="phoneInner">
          <div className="screen">{screen}</div>
          <FloatingAssistantButton onClick={() => setAssistantOpen(true)} />
          <AssistantSheet
            open={assistantOpen}
            onClose={() => setAssistantOpen(false)}
            onSubmit={handleAssistantSubmit}
            onApplyPlan={handleApplyPlan}
          />
          <BottomTabs
            activeTab={activeTab}
            onChange={(tab) => {
              if (tab === 'schedule' && activeTab !== 'schedule') setScheduleDateKey(null)
              setActiveTab(tab)
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default App
