import { useMemo, useState } from 'react'
import type { CalendarEvent, DayTheme } from '../App.tsx'
import { SparklesIcon } from '../components/Icons'

type Metric = {
  label: string
  value: string
  delta: string
  deltaUp?: boolean
  color: string
}

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const breakdown = [
  { work: 48, health: 10, rest: 34, learning: 8 },
  { work: 46, health: 8, rest: 36, learning: 10 },
  { work: 50, health: 10, rest: 30, learning: 10 },
  { work: 52, health: 8, rest: 30, learning: 10 },
  { work: 44, health: 12, rest: 34, learning: 10 },
  { work: 22, health: 16, rest: 44, learning: 18 },
  { work: 18, health: 14, rest: 50, learning: 18 },
]

export type WeeklyReportScreenProps = {
  events: CalendarEvent[]
  themesByDate: Record<string, DayTheme>
  demoMode?: boolean
}

export function WeeklyReportScreen({ events, themesByDate, demoMode }: WeeklyReportScreenProps) {
  const [historyMode, setHistoryMode] = useState<'week' | 'custom'>('week')
  const [customDate, setCustomDate] = useState(dateKey(new Date()))

  const useDemo = demoMode ?? true

  const today = useMemo(() => new Date(), [])
  const todayKey = useMemo(() => dateKey(today), [today])
  const thisWeekStart = useMemo(() => weekStartMonday(today), [today])
  const nextWeekStart = useMemo(() => addDays(thisWeekStart, 7), [thisWeekStart])
  const prevWeekStart = useMemo(() => addDays(thisWeekStart, -7), [thisWeekStart])

  const thisWeekKeys = useMemo(
    () => Array.from({ length: 7 }).map((_, idx) => dateKey(addDays(thisWeekStart, idx))),
    [thisWeekStart],
  )
  const prevWeekKeys = useMemo(
    () => Array.from({ length: 7 }).map((_, idx) => dateKey(addDays(prevWeekStart, idx))),
    [prevWeekStart],
  )

  const minutesByCategoryThisWeek = useMemo(() => {
    const totals: Record<string, number> = { Work: 0, Health: 0, Rest: 0, Learning: 0 }
    for (const e of events) {
      if (!thisWeekKeys.includes(e.date)) continue
      const dur = Math.max(0, e.endMinutes - e.startMinutes)
      totals[categoryForTag(e.tag)] += dur
    }
    return totals
  }, [events, thisWeekKeys])

  const minutesByCategoryPrevWeek = useMemo(() => {
    const totals: Record<string, number> = { Work: 0, Health: 0, Rest: 0, Learning: 0 }
    for (const e of events) {
      if (!prevWeekKeys.includes(e.date)) continue
      const dur = Math.max(0, e.endMinutes - e.startMinutes)
      totals[categoryForTag(e.tag)] += dur
    }
    return totals
  }, [events, prevWeekKeys])

  const computedMetrics = useMemo(() => {
    if (useDemo) {
      const fixed: Metric[] = [
        { label: 'Work', value: '40h', delta: '+0%', deltaUp: true, color: '#6366f1' },
        { label: 'Health', value: '2h', delta: '+0%', deltaUp: true, color: '#f43f5e' },
        { label: 'Rest', value: '6h', delta: '+0%', deltaUp: true, color: '#22c55e' },
        { label: 'Learning', value: '0h', delta: '+0%', deltaUp: true, color: '#f59e0b' },
      ]
      return fixed
    }
    const order: Array<{ label: Metric['label']; color: string }> = [
      { label: 'Work', color: '#6366f1' },
      { label: 'Health', color: '#f43f5e' },
      { label: 'Rest', color: '#22c55e' },
      { label: 'Learning', color: '#f59e0b' },
    ]
    return order.map((o) => {
      const curMin = minutesByCategoryThisWeek[o.label] ?? 0
      const prevMin = minutesByCategoryPrevWeek[o.label] ?? 0
      const delta = prevMin === 0 ? 0 : Math.round(((curMin - prevMin) / prevMin) * 100)
      const deltaUp = delta >= 0
      const value = `${(curMin / 60).toFixed(curMin % 60 === 0 ? 0 : 1)}h`
      return {
        label: o.label,
        value,
        delta: `${deltaUp ? '+' : ''}${delta}%`,
        deltaUp,
        color: o.color,
      }
    })
  }, [minutesByCategoryPrevWeek, minutesByCategoryThisWeek, useDemo])

  const computedBreakdown = useMemo(() => {
    if (useDemo) return breakdown
    return thisWeekKeys.map((key) => {
      const dayEvents = events.filter((e) => e.date === key)
      const mins = { work: 0, health: 0, rest: 0, learning: 0 }
      for (const e of dayEvents) {
        const dur = Math.max(0, e.endMinutes - e.startMinutes)
        const c = categoryForTag(e.tag)
        if (c === 'Work') mins.work += dur
        else if (c === 'Health') mins.health += dur
        else if (c === 'Rest') mins.rest += dur
        else mins.learning += dur
      }
      const total = mins.work + mins.health + mins.rest + mins.learning
      if (total === 0) return { work: 0, health: 0, rest: 0, learning: 0 }
      return {
        work: Math.round((mins.work / total) * 100),
        health: Math.round((mins.health / total) * 100),
        rest: Math.round((mins.rest / total) * 100),
        learning: Math.max(0, 100 - Math.round((mins.work / total) * 100) - Math.round((mins.health / total) * 100) - Math.round((mins.rest / total) * 100)),
      }
    })
  }, [events, thisWeekKeys, useDemo])

  const summaryStats = useMemo(() => {
    if (useDemo) return { meetings: 12, focusHours: '38h', onSchedule: '94%' }
    const meetings = events.filter(
      (e) => thisWeekKeys.includes(e.date) && e.tag === 'MEETING',
    ).length
    const focusMin = events
      .filter((e) => thisWeekKeys.includes(e.date) && e.tag === 'FOCUS')
      .reduce((sum, e) => sum + Math.max(0, e.endMinutes - e.startMinutes), 0)
    const total = events.filter((e) => thisWeekKeys.includes(e.date)).length
    const completed = events.filter((e) => thisWeekKeys.includes(e.date) && e.completed).length
    const onSchedule = total === 0 ? 0 : Math.round((completed / total) * 100)
    return { meetings, focusHours: `${(focusMin / 60).toFixed(0)}h`, onSchedule: `${onSchedule}%` }
  }, [events, thisWeekKeys, useDemo])

  const historyItems = useMemo(() => {
    const byDate: Record<
      string,
      { total: number; completed: number; titles: string[]; theme?: DayTheme }
    > = {}

    const cutoff = addDays(today, -60)
    for (const e of events) {
      const [y, m, d] = e.date.split('-').map((v) => Number(v))
      const dateObj = new Date(y, m - 1, d)
      if (dateObj < cutoff) continue
      if (!byDate[e.date]) {
        byDate[e.date] = { total: 0, completed: 0, titles: [], theme: themesByDate[e.date] }
      }
      byDate[e.date].total += 1
      if (e.completed) byDate[e.date].completed += 1
      if (byDate[e.date].titles.length < 3) byDate[e.date].titles.push(e.title)
    }

    const keys = Object.keys(byDate).sort((a, b) => b.localeCompare(a))
    return keys.map((k) => {
      const v = byDate[k]
      return {
        dateKey: k,
        dateLabel: formatDateLabel(k),
        theme: themeLabel(v.theme),
        detail: `${v.completed}/${v.total} completed`,
        summary: v.titles.join(', '),
      }
    })
  }, [events, themesByDate, today])

  const visibleHistory = useMemo(() => {
    if (historyMode === 'custom') {
      return historyItems.filter((h) => h.dateKey === customDate)
    }
    return historyItems.filter((h) => thisWeekKeys.includes(h.dateKey) && h.dateKey !== todayKey)
  }, [customDate, historyItems, historyMode, thisWeekKeys, todayKey])

  return (
    <div className="report">
      <div className="brandTop">
        <div className="brandDot" aria-hidden="true" />
        <div className="brandName">SmartFlow</div>
      </div>

      <div className="screenTitle">Activity Report</div>
      <div className="screenSubtitle">Insights and completed schedules</div>

      <div className="reportSummaryCard">
        <div className="reportSummaryTop">
          <div className="reportSummaryTitle">
            <span className="reportSummaryIcon" aria-hidden="true">
              🕒
            </span>
            <span>This Week Summary</span>
          </div>
        </div>
        <div className="reportSummaryStats">
          <div className="reportSummaryStat">
            <div className="reportSummaryValue">{summaryStats.meetings}</div>
            <div className="reportSummaryLabel">Meetings</div>
          </div>
          <div className="reportSummaryStat">
            <div className="reportSummaryValue">{summaryStats.focusHours}</div>
            <div className="reportSummaryLabel">Focus Time</div>
          </div>
          <div className="reportSummaryStat">
            <div className="reportSummaryValue">{summaryStats.onSchedule}</div>
            <div className="reportSummaryLabel">On Schedule</div>
          </div>
        </div>
      </div>

      <div className="sectionTitle">Time Distribution</div>
      <div className="metricGrid">
        {computedMetrics.map((m) => (
          <div key={m.label} className="metricCard">
            <div className="metricTop">
              <div className="metricDot" style={{ background: m.color }} />
              <div className={m.deltaUp ? 'metricDelta metricUp' : 'metricDelta metricDown'}>
                {m.deltaUp ? '↗' : '↘'} {m.delta}
              </div>
            </div>
            <div className="metricValue">{m.value}</div>
            <div className="metricLabel">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="sectionTitle">Daily Breakdown</div>
      <div className="breakdownCard">
        <div className="legend">
          <div className="legendItem">
            <span className="legendSwatch legendWork" />
            <span>Work</span>
          </div>
          <div className="legendItem">
            <span className="legendSwatch legendHealth" />
            <span>Health</span>
          </div>
          <div className="legendItem">
            <span className="legendSwatch legendRest" />
            <span>Rest</span>
          </div>
          <div className="legendItem">
            <span className="legendSwatch legendLearning" />
            <span>Learning</span>
          </div>
        </div>

        <div className="bars">
          {days.map((day, idx) => {
            const row = computedBreakdown[idx] ?? breakdown[idx]
            return (
              <div key={day} className="barRow">
                <div className="barDay">{day}</div>
                <div className="barTrack">
                  <div className="barSeg barWork" style={{ width: `${row.work}%` }} />
                  <div className="barSeg barHealth" style={{ width: `${row.health}%` }} />
                  <div className="barSeg barRest" style={{ width: `${row.rest}%` }} />
                  <div className="barSeg barLearning" style={{ width: `${row.learning}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="sectionTitle">AI Insights & Suggestions</div>
      <div className="insightList">
        <div className="aiCard">
          <div className="aiIcon aiOrange" aria-hidden="true">
            ↗
          </div>
          <div>
            <div className="aiTitle">AI Summary</div>
            <div className="aiText">
              本周工作强度较高，建议增加恢复时间。
            </div>
          </div>
        </div>
        <div className="aiCard">
          <div className="aiIcon aiGreen" aria-hidden="true">
            ✓
          </div>
          <div>
            <div className="aiTitle">Great Consistency</div>
            <div className="aiText">
              You&apos;re staying on top of your schedule. Keep the recovery blocks protected.
            </div>
          </div>
        </div>
        <div className="aiCard">
          <div className="aiIcon aiPurple" aria-hidden="true">
            <SparklesIcon size={16} />
          </div>
          <div>
            <div className="aiTitle">Add Recovery Time</div>
            <div className="aiText">
              Schedule 30 minutes of mindfulness or stretching between intense work blocks.
            </div>
          </div>
        </div>
      </div>

      <div className="sectionTitle">Historical Activities</div>
      <div className="reportHistoryHint">View past completed schedules (60 days retention)</div>
      <div className="historyControls">
        <button
          type="button"
          className={historyMode === 'week' ? 'rangeChip rangeChipActive' : 'rangeChip'}
          onClick={() => setHistoryMode('week')}
        >
          This Week
        </button>
        <button
          type="button"
          className={historyMode === 'custom' ? 'rangeChip rangeChipActive' : 'rangeChip'}
          onClick={() => setHistoryMode('custom')}
        >
          Custom Date
        </button>
      </div>
      {historyMode === 'custom' ? (
        <input
          className="dateInput"
          type="date"
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
        />
      ) : (
        <div className="reportRangeLabel">
          {formatDateLabel(dateKey(thisWeekStart))} - {formatDateLabel(dateKey(addDays(nextWeekStart, -1)))}
        </div>
      )}

      <div className="historyList">
        {visibleHistory.map((h) => (
          <div key={h.dateKey} className="historyItem">
            <div className="historyTop">
              <div className="historyDate">
                <span className="historyCal" aria-hidden="true">
                  🗓
                </span>
                <span>{h.dateLabel}</span>
              </div>
              <div className="historyChevron" aria-hidden="true">
                <span>›</span>
              </div>
            </div>
            <div className="historyMeta">
              <span className="historyTag">{h.theme}</span>
              <span className="historyDetail">{h.detail}</span>
            </div>
            <div className="historySummary">{h.summary}</div>
          </div>
        ))}

        {!visibleHistory.length ? (
          <div className="historyEmpty">
            <SparklesIcon size={16} />
            <span>No records for this range</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function pad2(v: number) {
  return String(v).padStart(2, '0')
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function weekStartMonday(d: Date) {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const start = new Date(d)
  start.setDate(d.getDate() + diff)
  return start
}

function addDays(d: Date, daysToAdd: number) {
  const next = new Date(d)
  next.setDate(d.getDate() + daysToAdd)
  return next
}

function categoryForTag(tag: CalendarEvent['tag']) {
  if (tag === 'HEALTH') return 'Health'
  if (tag === 'BREAK' || tag === 'PERSONAL') return 'Rest'
  if (tag === 'MEETING' || tag === 'FOCUS') return 'Work'
  return 'Learning'
}

function formatDateLabel(key: string) {
  const [y, m, d] = key.split('-').map((v) => Number(v))
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function themeLabel(theme: DayTheme | undefined) {
  if (!theme) return 'Workday'
  const main = theme.main === 'workday' ? 'Workday' : 'Holiday'
  return theme.sub ? `${main} - ${theme.sub}` : main
}

 
