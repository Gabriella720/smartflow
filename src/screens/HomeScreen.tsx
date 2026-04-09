import { useMemo, useState } from 'react'
import { ChevronRightIcon, SparklesIcon } from '../components/Icons'

type CalendarRange = 'today' | 'tomorrow' | 'thisWeek' | 'nextWeek' | 'custom'

export type CalendarEvent = {
  id: string
  date: string
  tag: string
  title: string
  startMinutes: number
  endMinutes: number
  gradient: string
  completed?: boolean
}

export type HomeScreenProps = {
  events: CalendarEvent[]
  onOpenSchedule?: (date: string) => void
  highlightEventIds?: string[]
}

function getDateInputValue(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
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

function formatMinutes(minutes: number) {
  const h24 = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const suffix = h24 >= 12 ? 'PM' : 'AM'
  const h12 = ((h24 + 11) % 12) + 1
  return `${h12}:${pad2(m)} ${suffix}`
}

function formatRange(startMinutes: number, endMinutes: number) {
  return `${formatMinutes(startMinutes)} - ${formatMinutes(endMinutes)}`
}

export function HomeScreen({ events, onOpenSchedule, highlightEventIds }: HomeScreenProps) {
  const [range, setRange] = useState<CalendarRange>('today')
  const [customDate, setCustomDate] = useState(getDateInputValue(new Date()))
  const [showCompleted, setShowCompleted] = useState(false)

  const selectedKeys = useMemo(() => {
    const base = new Date()
    const todayKey = dateKey(base)
    if (range === 'today') return [dateKey(base)]
    if (range === 'tomorrow') return [dateKey(addDays(base, 1))]
    if (range === 'custom') {
      if (customDate < todayKey) return []
      return [customDate]
    }
    if (range === 'thisWeek') {
      const dayIndexMonday0 = (base.getDay() + 6) % 7
      const remaining = 6 - dayIndexMonday0
      return Array.from({ length: remaining + 1 }).map((_, idx) => dateKey(addDays(base, idx)))
    }
    const nextMonday = addDays(base, 7 - ((base.getDay() + 6) % 7))
    return Array.from({ length: 7 }).map((_, idx) => dateKey(addDays(nextMonday, idx)))
  }, [customDate, range])

  const eventsForRange = useMemo(
    () =>
      events
        .filter((e) => selectedKeys.includes(e.date))
        .slice()
        .sort((a, b) => (a.date === b.date ? a.startMinutes - b.startMinutes : a.date.localeCompare(b.date))),
    [events, selectedKeys],
  )

  const incomplete = useMemo(
    () => eventsForRange.filter((e) => !e.completed),
    [eventsForRange],
  )
  const completed = useMemo(
    () => eventsForRange.filter((e) => e.completed),
    [eventsForRange],
  )
  const nextUp = incomplete[0]

  const headerDate = useMemo(() => {
    const base = new Date()
    if (range === 'today') return base
    if (range === 'tomorrow') return addDays(base, 1)
    if (range === 'thisWeek') return base
    if (range === 'nextWeek') return addDays(base, 7)
    const [y, m, d] = customDate.split('-').map((v) => Number(v))
    return new Date(y, m - 1, d)
  }, [customDate, range])

  const dateLabel = headerDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="calendar">
      <div className="topRow">
        <div className="brandTop">
          <div className="brandDot" aria-hidden="true" />
          <div className="brandName">SmartFlow</div>
        </div>
        <div className="avatar" aria-hidden="true">
          A
        </div>
      </div>

      <div className="homeDate">{dateLabel}</div>
      <div className="calendarTitle">Your Schedule</div>

      <div className="rangeRow">
        <button
          type="button"
          className={range === 'today' ? 'rangeChip rangeChipActive' : 'rangeChip'}
          onClick={() => setRange('today')}
        >
          Today
        </button>
        <button
          type="button"
          className={range === 'tomorrow' ? 'rangeChip rangeChipActive' : 'rangeChip'}
          onClick={() => setRange('tomorrow')}
        >
          Tomorrow
        </button>
        <button
          type="button"
          className={range === 'thisWeek' ? 'rangeChip rangeChipActive' : 'rangeChip'}
          onClick={() => setRange('thisWeek')}
        >
          This Week
        </button>
        <button
          type="button"
          className={range === 'nextWeek' ? 'rangeChip rangeChipActive' : 'rangeChip'}
          onClick={() => setRange('nextWeek')}
        >
          Next Week
        </button>
      </div>

      <div className="datePickerRow">
        <button
          type="button"
          className={range === 'custom' ? 'rangeChip rangeChipActive' : 'rangeChip'}
          onClick={() => setRange('custom')}
        >
          Pick Date
        </button>
        <input
          className="dateInput"
          type="date"
          value={customDate}
          onChange={(e) => {
            setCustomDate(e.target.value)
            setRange('custom')
          }}
        />
      </div>

      {nextUp ? (
        <>
          <div className="nextUpLabel">
            <span className="nextUpIcon" aria-hidden="true">
              🕒
            </span>
            <span>Next Up</span>
          </div>
          <div
            className={
              highlightEventIds?.includes(nextUp.id)
                ? 'nextUpCard timelineCardHighlight'
                : 'nextUpCard'
            }
            style={{ background: nextUp.gradient }}
            onClick={() => onOpenSchedule?.(nextUp.date)}
          >
            <div className="timelineLeft">
              <div className="timelineTag">
                <span className="timelineTagText">{nextUp.tag}</span>
              </div>
              <div className="timelineTitle">{nextUp.title}</div>
              <div className="timelineTime">
                {formatRange(nextUp.startMinutes, nextUp.endMinutes)}
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="sectionTitle">Upcoming Events ({incomplete.length})</div>
      <div className="timeline">
        {incomplete.slice(0, 4).map((item) => (
          <div
            key={item.id}
            className={
              highlightEventIds?.includes(item.id)
                ? 'timelineCard timelineCardHighlight'
                : 'timelineCard'
            }
            style={{ background: item.gradient }}
            onClick={() => onOpenSchedule?.(item.date)}
          >
            <div className="timelineLeft">
              <div className="timelineTag">
                <span className="timelineTagText">{item.tag}</span>
              </div>
              <div className="timelineTitle">{item.title}</div>
              <div className="timelineTime">
                {formatRange(item.startMinutes, item.endMinutes)}
              </div>
            </div>
            <div className="timelineRight" aria-hidden="true">
              <ChevronRightIcon />
            </div>
          </div>
        ))}
      </div>

      {completed.length ? (
        <div className="completedWrap">
          <button
            type="button"
            className="completedHeader"
            onClick={() => setShowCompleted((v) => !v)}
          >
            <span>Completed ({completed.length})</span>
            <span className="completedChevron" aria-hidden="true">
              {showCompleted ? '▴' : '▾'}
            </span>
          </button>
          {showCompleted ? (
            <div className="completedList">
              {completed.map((c) => (
                <div key={c.id} className="completedItem">
                  <div className="completedTag">{c.tag}</div>
                  <div className="completedTitle">{c.title}</div>
                  <div className="completedTime">
                    {formatRange(c.startMinutes, c.endMinutes)}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <section className="insightCard calendarInsight">
        <div className="insightIcon">
          <SparklesIcon size={18} />
        </div>
        <div className="insightBody">
          <div className="insightTitle">AI Insight</div>
          <div className="insightText">
            Next up is prioritized. Completed items are collapsed by default.
          </div>
        </div>
      </section>
    </div>
  )
}
