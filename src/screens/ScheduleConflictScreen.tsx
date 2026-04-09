import { useMemo, useState } from 'react'
import type { CalendarEvent, DayTheme } from '../App.tsx'
import { SparklesIcon } from '../components/Icons'

type ScheduleRange = 'today' | 'tomorrow' | 'thisWeek' | 'nextWeek' | 'custom'

type Conflict = {
  id: string
  title: string
  detail: string
  suggestion: string
  a: CalendarEvent
  b: CalendarEvent
}

export type ScheduleConflictScreenProps = {
  events: CalendarEvent[]
  themesByDate: Record<string, DayTheme>
  initialDateKey?: string
  onAddedToCalendar?: (highlightIds: string[]) => void
  onChangeTheme: (date: string, theme: DayTheme) => void
  onUpdateEvents: (events: CalendarEvent[]) => void
}

function pad2(v: number) {
  return String(v).padStart(2, '0')
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function getDateInputValue(d: Date) {
  return dateKey(d)
}

function parseDateInput(value: string) {
  const [y, m, d] = value.split('-').map((v) => Number(v))
  return new Date(y, m - 1, d)
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

function detectConflicts(items: CalendarEvent[]): Conflict[] {
  const sorted = items.slice().sort((a, b) => a.startMinutes - b.startMinutes)
  const conflicts: Conflict[] = []
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i]
      const b = sorted[j]
      if (b.startMinutes >= a.endMinutes) break
      const detail = `${a.title} and ${b.title} overlap at ${formatRange(
        Math.max(a.startMinutes, b.startMinutes),
        Math.min(a.endMinutes, b.endMinutes),
      )}`
      const suggestion =
        a.tag === 'MEETING' || b.tag === 'MEETING'
          ? `AI Suggestion: Move '${a.tag === 'MEETING' ? a.title : b.title}' to ${formatMinutes(
              Math.max(a.endMinutes, b.endMinutes),
            )}`
          : `AI Suggestion: Reschedule one item to avoid overlap`
      conflicts.push({
        id: `conf-${a.id}-${b.id}`,
        title: 'Scheduling Conflict',
        detail,
        suggestion,
        a,
        b,
      })
    }
  }
  return conflicts
}

type PlanKind =
  | 'workday-normal'
  | 'workday-trip'
  | 'holiday-gym'
  | 'holiday-travel'
  | 'holiday-cycling'
  | 'holiday-walking'

type DraftItem = {
  id: string
  title: string
  startMinutes: number
  durationMinutes: number
  tag: CalendarEvent['tag']
  notes: string
  images: string[]
}

type DraftDay = {
  offsetDays: number
  title: string
  items: DraftItem[]
}

type DraftPlan = {
  kind: PlanKind
  days: DraftDay[]
  selectedDestination?: number
}

function planKindForTheme(theme: DayTheme): PlanKind {
  if (theme.main === 'workday') {
    return theme.sub === 'Business Trip' ? 'workday-trip' : 'workday-normal'
  }
  if (theme.sub === 'Gym Day') return 'holiday-gym'
  if (theme.sub === 'Travel Day') return 'holiday-travel'
  if (theme.sub === 'Cycling') return 'holiday-cycling'
  return 'holiday-walking'
}

function parseTimeInput(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function formatTimeInput(minutes: number) {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${pad2(h)}:${pad2(m)}`
}

function gradientForTag(tag: CalendarEvent['tag']) {
  if (tag === 'FOCUS') return 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)'
  if (tag === 'BREAK') return 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
  if (tag === 'MEETING') return 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)'
  if (tag === 'HEALTH') return 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)'
  return 'linear-gradient(135deg, #22c55e 0%, #34d399 100%)'
}

function draftItem(
  id: string,
  title: string,
  startMinutes: number,
  durationMinutes: number,
  tag: CalendarEvent['tag'],
  notes = '',
  images: string[] = [],
): DraftItem {
  return { id, title, startMinutes, durationMinutes, tag, notes, images }
}

function createDefaultPlan(kind: PlanKind): DraftPlan {
  if (kind === 'workday-trip') {
    return {
      kind,
      selectedDestination: 0,
      days: [
        {
          offsetDays: 0,
          title: 'Day 1',
          items: [
            draftItem('t1', 'Depart', 9 * 60, 90, 'PERSONAL'),
            draftItem('t2', 'Flight / Train', 10 * 60 + 30, 120, 'PERSONAL'),
            draftItem('t3', 'Arrive & Check-in', 14 * 60, 60, 'PERSONAL'),
            draftItem('t4', 'Client Meeting', 16 * 60, 60, 'MEETING'),
            draftItem('t5', 'Dinner (Business)', 19 * 60, 60, 'BREAK'),
          ],
        },
        {
          offsetDays: 1,
          title: 'Day 2',
          items: [
            draftItem('t6', 'Hotel Breakfast', 8 * 60, 45, 'BREAK'),
            draftItem('t7', 'Meetings Block', 10 * 60, 120, 'MEETING'),
            draftItem('t8', 'Return Travel', 15 * 60, 120, 'PERSONAL'),
            draftItem('t9', 'Arrive Home', 18 * 60, 30, 'PERSONAL'),
          ],
        },
      ],
    }
  }

  if (kind === 'holiday-travel') {
    return {
      kind,
      selectedDestination: 0,
      days: [
        {
          offsetDays: 0,
          title: 'Day 1',
          items: [
            draftItem('d1', 'Depart', 9 * 60, 90, 'PERSONAL'),
            draftItem('d2', 'Arrive & Check-in', 10 * 60 + 30, 60, 'PERSONAL'),
            draftItem('d3', 'Lunch at local spot', 12 * 60, 60, 'BREAK'),
            draftItem('d4', 'Beach walk & explore', 14 * 60, 90, 'HEALTH'),
            draftItem('d5', 'Sunset viewing', 18 * 60, 30, 'PERSONAL'),
            draftItem('d6', 'Dinner by the water', 19 * 60 + 30, 60, 'BREAK'),
          ],
        },
        {
          offsetDays: 1,
          title: 'Day 2',
          items: [
            draftItem('d7', 'Morning yoga session', 8 * 60, 45, 'HEALTH'),
            draftItem('d8', 'Brunch & relax', 10 * 60, 60, 'BREAK'),
            draftItem('d9', 'Free time / Activities', 12 * 60, 120, 'PERSONAL'),
            draftItem('d10', 'Check-out & depart', 15 * 60, 60, 'PERSONAL'),
            draftItem('d11', 'Arrive home', 16 * 60 + 30, 30, 'PERSONAL'),
          ],
        },
      ],
    }
  }

  if (kind === 'holiday-gym') {
    return {
      kind,
      days: [
        {
          offsetDays: 0,
          title: 'Today • Evening Session',
          items: [
            draftItem('g1', 'Travel to Gym', 17 * 60 + 45, 15, 'PERSONAL'),
            draftItem('g2', 'Warm Up', 18 * 60, 10, 'HEALTH'),
            draftItem('g3', 'Strength Training', 18 * 60 + 10, 40, 'HEALTH'),
            draftItem('g4', 'Cool Down & Stretch', 18 * 60 + 50, 10, 'HEALTH'),
            draftItem('g5', 'Buffer Time', 19 * 60, 15, 'BREAK'),
          ],
        },
      ],
    }
  }

  if (kind === 'holiday-cycling' || kind === 'holiday-walking') {
    return {
      kind,
      days: [{ offsetDays: 0, title: 'Day Plan', items: [] }],
    }
  }

  return {
    kind: 'workday-normal',
    days: [
      {
        offsetDays: 0,
        title: 'Working Day',
        items: [
          draftItem('w1', 'Deep Work Block', 9 * 60, 120, 'FOCUS'),
          draftItem('w2', 'Lunch Break', 12 * 60, 60, 'BREAK'),
          draftItem('w3', 'Client Presentation', 14 * 60, 90, 'MEETING'),
          draftItem('w4', 'Design Review', 16 * 60, 90, 'FOCUS'),
        ],
      },
    ],
  }
}

function createPlanFromExistingEvents(
  kind: PlanKind,
  baseDateKey: string,
  allEvents: CalendarEvent[],
) {
  const baseDate = parseDateInput(baseDateKey)
  const defaultPlan = createDefaultPlan(kind)
  const days = defaultPlan.days.map((day) => {
    const date = dateKey(addDays(baseDate, day.offsetDays))
    const items = allEvents
      .filter((e) => e.date === date && !e.completed)
      .slice()
      .sort((a, b) => a.startMinutes - b.startMinutes)
      .map((e) =>
        draftItem(
          e.id,
          e.title,
          e.startMinutes,
          Math.max(15, e.endMinutes - e.startMinutes),
          e.tag,
          e.notes ?? '',
          e.images ?? [],
        ),
      )
    return { ...day, items: items.length ? items : day.items }
  })
  return { ...defaultPlan, days }
}

function planToCalendarEvents(plan: DraftPlan, baseDateKey: string): CalendarEvent[] {
  const baseDate = parseDateInput(baseDateKey)
  return plan.days.flatMap((day) => {
    const date = dateKey(addDays(baseDate, day.offsetDays))
    return day.items.map((item) => {
      const duration = Math.max(15, item.durationMinutes)
      return {
        id: `draft::${date}::${item.id}`,
        date,
        tag: item.tag,
        title: item.title,
        startMinutes: item.startMinutes,
        endMinutes: item.startMinutes + duration,
        gradient: gradientForTag(item.tag),
      } satisfies CalendarEvent
    })
  })
}

function parseDraftEventId(eventId: string) {
  const parts = eventId.split('::')
  if (parts.length < 3) return null
  if (parts[0] !== 'draft') return null
  return { date: parts[1], itemId: parts.slice(2).join('::') }
}

const travelDestinations = [
  {
    title: 'Coastal Retreat',
    location: 'Malibu, CA',
    daysColor: 'destDaysOrange',
    metaLeft: '1.5 hours drive',
    metaRight: 'Relaxing & Restorative',
    activities: ['Beach walks', 'Sunset yoga', 'Seafood dining'],
    buttonClass: 'destButtonOrange',
    coverClass: 'destCoverCoast',
  },
  {
    title: 'Mountain Escape',
    location: 'Big Bear, CA',
    daysColor: 'destDaysTeal',
    metaLeft: '2 hours drive',
    metaRight: 'Active & Refreshing',
    activities: ['Hiking trails', 'Lake kayaking', 'Stargazing'],
    buttonClass: 'destButtonGreen',
    coverClass: 'destCoverMountain',
  },
  {
    title: 'City Discovery',
    location: 'Santa Barbara, CA',
    daysColor: 'destDaysPurple',
    metaLeft: '1.5 hours drive',
    metaRight: 'Cultural & Inspiring',
    activities: ['Wine tasting', 'Art galleries', 'Local cafes'],
    buttonClass: 'destButtonPurple',
    coverClass: 'destCoverCity',
  },
]

export function ScheduleConflictScreen({
  events,
  themesByDate,
  initialDateKey,
  onAddedToCalendar,
  onChangeTheme,
  onUpdateEvents,
}: ScheduleConflictScreenProps) {
  const [range, setRange] = useState<ScheduleRange>(() =>
    initialDateKey && initialDateKey !== dateKey(new Date()) ? 'custom' : 'today',
  )
  const [customDate, setCustomDate] = useState(() =>
    initialDateKey ? initialDateKey : getDateInputValue(new Date()),
  )
  const [draftByKey, setDraftByKey] = useState<Record<string, DraftPlan>>({})
  const selectedDate = useMemo(() => {
    const base = new Date()
    if (range === 'today') return base
    if (range === 'tomorrow') return addDays(base, 1)
    if (range === 'thisWeek') return base
    if (range === 'nextWeek') return addDays(base, 7)
    return parseDateInput(customDate)
  }, [customDate, range])
  const selectedDateKey = dateKey(selectedDate)

  const theme = themesByDate[selectedDateKey] ?? defaultThemeFor(selectedDate)
  const planKind = useMemo(() => planKindForTheme(theme), [theme])
  const planKey = useMemo(
    () => `${selectedDateKey}::${theme.main}::${theme.sub}`,
    [selectedDateKey, theme.main, theme.sub],
  )

  const [resolvedByPlanKey, setResolvedByPlanKey] = useState<
    Record<string, Record<string, boolean>>
  >({})
  const resolvedConflicts = useMemo(
    () => resolvedByPlanKey[planKey] ?? {},
    [planKey, resolvedByPlanKey],
  )
  const [manualFixIdByPlanKey, setManualFixIdByPlanKey] = useState<
    Record<string, string | null>
  >({})
  const manualFixConflictId = manualFixIdByPlanKey[planKey] ?? null
  const manualFixOpen = manualFixConflictId !== null

  const draftPlan =
    draftByKey[planKey] ??
    createPlanFromExistingEvents(planKind, selectedDateKey, events)
  const draftCalendarEvents = useMemo(
    () => planToCalendarEvents(draftPlan, selectedDateKey),
    [draftPlan, selectedDateKey],
  )
  const draftConflicts = useMemo(
    () => detectConflicts(draftCalendarEvents).filter((c) => !resolvedConflicts[c.id]),
    [draftCalendarEvents, resolvedConflicts],
  )

  const activeManualConflict = useMemo(() => {
    if (!manualFixConflictId) return null
    return draftConflicts.find((c) => c.id === manualFixConflictId) ?? null
  }, [draftConflicts, manualFixConflictId])

  const updateDraftDayItem = (
    dayIndex: number,
    itemId: string,
    patch: Partial<
      Pick<DraftItem, 'title' | 'startMinutes' | 'durationMinutes' | 'tag' | 'notes'>
    >,
  ) => {
    setDraftByKey((prev) => {
      const current = prev[planKey] ?? draftPlan
      const nextDays = current.days.map((d, idx) => {
        if (idx !== dayIndex) return d
        return {
          ...d,
          items: d.items.map((it) => {
            if (it.id !== itemId) return it
            const next: DraftItem = { ...it }
            if (patch.title !== undefined) next.title = patch.title
            if (patch.startMinutes !== undefined) next.startMinutes = patch.startMinutes
            if (patch.durationMinutes !== undefined) next.durationMinutes = patch.durationMinutes
            if (patch.tag !== undefined) next.tag = patch.tag
            if (patch.notes !== undefined) next.notes = patch.notes
            return next
          }),
        }
      })
      return { ...prev, [planKey]: { ...current, days: nextDays } }
    })
  }

  const addDraftItem = (dayIndex: number) => {
    setDraftByKey((prev) => {
      const current = prev[planKey] ?? draftPlan
      const nextDays: DraftDay[] = current.days.map((d, idx): DraftDay => {
        if (idx !== dayIndex) return d
        const last = d.items
          .slice()
          .sort((a, b) => a.startMinutes - b.startMinutes)
          .at(-1)
        const startMinutes = last
          ? Math.min(23 * 60, last.startMinutes + last.durationMinutes + 30)
          : 9 * 60
        const id = `new-${Date.now()}`
        const newItem = draftItem(id, 'New Item', startMinutes, 60, 'MEETING')
        return { ...d, items: [...d.items, newItem] }
      })
      const nextPlan: DraftPlan = { ...current, days: nextDays }
      return { ...prev, [planKey]: nextPlan }
    })
  }

  const removeDraftItem = (dayIndex: number, itemId: string) => {
    setDraftByKey((prev) => {
      const current = prev[planKey] ?? draftPlan
      const nextDays: DraftDay[] = current.days.map((d, idx): DraftDay => {
        if (idx !== dayIndex) return d
        return { ...d, items: d.items.filter((it) => it.id !== itemId) }
      })
      const nextPlan: DraftPlan = { ...current, days: nextDays }
      return { ...prev, [planKey]: nextPlan }
    })
  }

  const addDraftItemImage = (dayIndex: number, itemId: string, file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : null
      if (!url) return
      setDraftByKey((prev) => {
        const current = prev[planKey] ?? draftPlan
        const nextDays: DraftDay[] = current.days.map((d, idx): DraftDay => {
          if (idx !== dayIndex) return d
          return {
            ...d,
            items: d.items.map((it) => {
              if (it.id !== itemId) return it
              return { ...it, images: [...it.images, url] }
            }),
          }
        })
        const nextPlan: DraftPlan = { ...current, days: nextDays }
        return { ...prev, [planKey]: nextPlan }
      })
    }
    reader.readAsDataURL(file)
  }

  const removeDraftItemImage = (dayIndex: number, itemId: string, index: number) => {
    setDraftByKey((prev) => {
      const current = prev[planKey] ?? draftPlan
      const nextDays: DraftDay[] = current.days.map((d, idx): DraftDay => {
        if (idx !== dayIndex) return d
        return {
          ...d,
          items: d.items.map((it) => {
            if (it.id !== itemId) return it
            return { ...it, images: it.images.filter((_, i) => i !== index) }
          }),
        }
      })
      const nextPlan: DraftPlan = { ...current, days: nextDays }
      return { ...prev, [planKey]: nextPlan }
    })
  }

  const setSelectedDestination = (index: number) => {
    setDraftByKey((prev) => {
      const current = prev[planKey] ?? draftPlan
      const nextPlan: DraftPlan = { ...current, selectedDestination: index }
      return { ...prev, [planKey]: nextPlan }
    })
  }

  const commitToCalendar = () => {
    const baseDate = parseDateInput(selectedDateKey)
    const affectedDates = draftPlan.days.map((d) => dateKey(addDays(baseDate, d.offsetDays)))
    const toKeep = events.filter((e) => e.completed || !affectedDates.includes(e.date))
    const scheduled: CalendarEvent[] = draftPlan.days.flatMap((day) => {
      const date = dateKey(addDays(baseDate, day.offsetDays))
      return day.items.map((it) => {
        const duration = Math.max(15, it.durationMinutes)
        return {
          id: `sched-${date}-${it.id}`,
          date,
          tag: it.tag,
          title: it.title,
          startMinutes: it.startMinutes,
          endMinutes: it.startMinutes + duration,
          gradient: gradientForTag(it.tag),
          notes: it.notes,
          images: it.images,
        }
      })
    })
    onUpdateEvents([...toKeep, ...scheduled])
    onAddedToCalendar?.(scheduled.map((e) => e.id))
  }

  return (
    <div className="schedule">
      <div className="topRow">
        <div className="brandTop">
          <div className="brandDot" aria-hidden="true" />
          <div className="brandName">SmartFlow</div>
        </div>
        <div className="avatar" aria-hidden="true">
          A
        </div>
      </div>

      <div className="screenTitle">Schedule Planner</div>
      <div className="screenSubtitle">Manage your schedule and resolve conflicts</div>

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
          Custom
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

      {theme.sub === 'Gym Day' || theme.sub === 'Travel Day' || theme.sub === 'Business Trip' ? (
        <div className="dayThemeTag">
          {(theme.main === 'workday' ? 'Workday' : 'Holiday') + ' • ' + theme.sub}
        </div>
      ) : null}

      <div className="sectionTitle">Day Theme</div>
      <div className="themeGrid">
        <button
          type="button"
          className={theme.main === 'workday' ? 'themeCard themeCardActive' : 'themeCard'}
          onClick={() => onChangeTheme(selectedDateKey, { main: 'workday', sub: 'Normal Workday' })}
        >
          <div className="themeIcon" aria-hidden="true">
            🧳
          </div>
          <div className="themeName">Workday</div>
        </button>
        <button
          type="button"
          className={theme.main === 'holiday' ? 'themeCard themeCardActive' : 'themeCard'}
          onClick={() => onChangeTheme(selectedDateKey, { main: 'holiday', sub: 'Gym Day' })}
        >
          <div className="themeIcon" aria-hidden="true">
            🌴
          </div>
          <div className="themeName">Holiday</div>
        </button>
      </div>

      <div className="themeSubLabel">SPECIFIC TYPE</div>
      <div className="themeSubGrid">
        {theme.main === 'workday' ? (
          <>
            <button
              type="button"
              className={
                theme.sub === 'Normal Workday'
                  ? 'themeSubBtn themeSubBtnActive'
                  : 'themeSubBtn'
              }
              onClick={() => onChangeTheme(selectedDateKey, { main: 'workday', sub: 'Normal Workday' })}
            >
              Normal Workday
            </button>
            <button
              type="button"
              className={
                theme.sub === 'Business Trip'
                  ? 'themeSubBtn themeSubBtnActive'
                  : 'themeSubBtn'
              }
              onClick={() => onChangeTheme(selectedDateKey, { main: 'workday', sub: 'Business Trip' })}
            >
              Business Trip
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={
                theme.sub === 'Gym Day'
                  ? 'themeSubBtn themeSubBtnActive'
                  : 'themeSubBtn'
              }
              onClick={() => onChangeTheme(selectedDateKey, { main: 'holiday', sub: 'Gym Day' })}
            >
              Gym Day
            </button>
            <button
              type="button"
              className={
                theme.sub === 'Travel Day'
                  ? 'themeSubBtn themeSubBtnActive'
                  : 'themeSubBtn'
              }
              onClick={() => onChangeTheme(selectedDateKey, { main: 'holiday', sub: 'Travel Day' })}
            >
              Travel Day
            </button>
            <button
              type="button"
              className={
                theme.sub === 'Cycling'
                  ? 'themeSubBtn themeSubBtnActive themeSubBtnDisabled'
                  : 'themeSubBtn themeSubBtnDisabled'
              }
              onClick={() => onChangeTheme(selectedDateKey, { main: 'holiday', sub: 'Cycling' })}
            >
              Cycling
            </button>
            <button
              type="button"
              className={
                theme.sub === 'Walking'
                  ? 'themeSubBtn themeSubBtnActive themeSubBtnDisabled'
                  : 'themeSubBtn themeSubBtnDisabled'
              }
              onClick={() => onChangeTheme(selectedDateKey, { main: 'holiday', sub: 'Walking' })}
            >
              Walking
            </button>
          </>
        )}
      </div>

      {draftConflicts.length ? (
        <>
          <div className="sectionTitle">Conflicts ({draftConflicts.length})</div>
          <div className="conflictList">
            {draftConflicts.map((c) => (
              <div key={c.id} className="conflictCard">
                <div className="conflictCardTop">
                  <div className="conflictWarn" aria-hidden="true">
                    ⚠︎
                  </div>
                  <div className="conflictCardMain">
                    <div className="conflictCardTitle">{c.title}</div>
                    <div className="conflictCardDetail">{c.detail}</div>
                    <div className="conflictCardSuggestion">
                      <SparklesIcon size={14} />
                      <span>{c.suggestion}</span>
                    </div>
                  </div>
                </div>

                <div className="conflictActions">
                  <button
                    type="button"
                    className="applySuggestionBtn"
                    onClick={() => {
                      const moveTarget =
                        c.a.tag === 'MEETING' ? c.a : c.b.tag === 'MEETING' ? c.b : c.b
                      const parsed = parseDraftEventId(moveTarget.id)
                      if (!parsed) return
                      const dayIndex = draftPlan.days.findIndex((d) => {
                        const base = parseDateInput(selectedDateKey)
                        const target = parseDateInput(parsed.date)
                        const diff = Math.round((target.getTime() - base.getTime()) / 86400000)
                        return d.offsetDays === diff
                      })
                      if (dayIndex < 0) return
                      const newStart = Math.max(c.a.endMinutes, c.b.endMinutes)
                      updateDraftDayItem(dayIndex, parsed.itemId, { startMinutes: newStart })
                      setResolvedByPlanKey((prev) => ({
                        ...prev,
                        [planKey]: { ...(prev[planKey] ?? {}), [c.id]: true },
                      }))
                    }}
                  >
                    Apply Suggestion
                  </button>
                  <button
                    type="button"
                    className="manualFixBtn"
                    onClick={() => {
                      setManualFixIdByPlanKey((prev) => ({ ...prev, [planKey]: c.id }))
                    }}
                  >
                    Manual Fix
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <div className="sectionTitle">Session Plan</div>

      {planKind === 'holiday-gym' ? (
        <div className="gymTemplate">
          <div className="gymHeader">
            <div className="gymIcon" aria-hidden="true">
              🏋︎
            </div>
            <div>
              <div className="screenTitle">Gym Day</div>
              <div className="screenSubtitle">{draftPlan.days[0]?.title ?? 'Session'}</div>
            </div>
          </div>

          <section className="protectedCard">
            <div className="protectedTop">
              <div className="protectedDot" aria-hidden="true" />
              <div className="protectedTitle">Protected Time</div>
            </div>
            <div className="protectedText">
              This block is locked. No meetings or interruptions will be scheduled.
            </div>
          </section>

          <div className="gymStats">
            <div className="statPill">
              <div className="statValue">
                {Math.round(
                  (draftPlan.days[0]?.items.reduce((s, i) => s + i.durationMinutes, 0) ?? 0) /
                    5,
                ) * 5}{' '}
                min
              </div>
              <div className="statLabel">Total Duration</div>
            </div>
            <div className="statPill">
              <div className="statValue">
                {Math.round(
                  (draftPlan.days[0]?.items
                    .filter((i) => i.tag === 'HEALTH')
                    .reduce((s, i) => s + i.durationMinutes, 0) ?? 0) / 5,
                ) * 5}{' '}
                min
              </div>
              <div className="statLabel">Workout Time</div>
            </div>
            <div className="statPill">
              <div className="statValue">
                {Math.round(
                  (draftPlan.days[0]?.items
                    .filter((i) => i.tag !== 'HEALTH')
                    .reduce((s, i) => s + i.durationMinutes, 0) ?? 0) / 5,
                ) * 5}{' '}
                min
              </div>
              <div className="statLabel">Travel Buffer</div>
            </div>
          </div>

          <div className="sectionTitle">Session Plan</div>
          <div className="sessionCard">
            <div className="timelineLine" aria-hidden="true" />
            <div className="sessionSteps">
              {(draftPlan.days[0]?.items ?? []).map((it, idx) => {
                const colors = ['blue', 'orange', 'pink', 'green', 'purple'] as const
                const color = colors[idx % colors.length]
                return (
                  <div key={it.id} className="stepRow">
                    <div className={`stepDot stepDot-${color}`} aria-hidden="true" />
                    <div className="stepCard">
                      <div className="stepTop">
                        <input
                          className="stepTitleInput"
                          value={it.title}
                          title={it.title}
                          onChange={(e) =>
                            updateDraftDayItem(0, it.id, { title: e.target.value })
                          }
                        />
                        <input
                          className="stepMiniInput"
                          type="number"
                          min={15}
                          step={5}
                          value={it.durationMinutes}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            if (Number.isNaN(v)) return
                            updateDraftDayItem(0, it.id, {
                              durationMinutes: Math.max(15, v),
                            })
                          }}
                        />
                      </div>
                      <div className="stepBottom">
                        <input
                          className="stepTimeInput"
                          type="time"
                          value={formatTimeInput(it.startMinutes)}
                          onChange={(e) => {
                            const minutes = parseTimeInput(e.target.value)
                            if (minutes === null) return
                            updateDraftDayItem(0, it.id, { startMinutes: minutes })
                          }}
                        />
                        <button
                          type="button"
                          className="stepDeleteBtn"
                          onClick={() => removeDraftItem(0, it.id)}
                          aria-label="Delete"
                        >
                          ×
                        </button>
                      </div>

                      <div className="templateNotesBox">
                        <textarea
                          className="templateNotesInput"
                          value={it.notes}
                          onChange={(e) =>
                            updateDraftDayItem(0, it.id, { notes: e.target.value })
                          }
                          placeholder="Notes…（可输入文字，或插入图片）"
                        />
                        <label className="templateImageButton">
                          + Image
                          <input
                            type="file"
                            accept="image/*"
                            className="templateImageInput"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              addDraftItemImage(0, it.id, file)
                              e.currentTarget.value = ''
                            }}
                          />
                        </label>
                      </div>

                      {it.images.length ? (
                        <div className="templateImages">
                          {it.images.map((src, idx2) => (
                            <button
                              key={`${it.id}-${idx2}`}
                              type="button"
                              className="templateImageThumb"
                              onClick={() => removeDraftItemImage(0, it.id, idx2)}
                              aria-label="Remove image"
                            >
                              <img src={src} alt="" />
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <button type="button" className="templateAddBtn" onClick={() => addDraftItem(0)}>
            + Add Step
          </button>
        </div>
      ) : (
        <>
          {planKind === 'holiday-travel' || planKind === 'workday-trip' ? (
            <section className="travelInfoCard">
              <div className="travelInfoIcon" aria-hidden="true">
                <SparklesIcon size={18} />
              </div>
              <div className="travelInfoBody">
                <div className="travelInfoTitle">
                  {planKind === 'workday-trip' ? 'Business Trip' : 'Holiday Trip'}
                </div>
                <div className="travelInfoText">
                  Recommended itinerary is ready. Edit below and add to calendar when done.
                </div>
              </div>
            </section>
          ) : null}

          {planKind === 'holiday-travel' || planKind === 'workday-trip' ? (
            <>
              <div className="sectionTitle">Recommended Destinations</div>
              <div className="destList">
                {travelDestinations.map((d, idx) => {
                  const selected = (draftPlan.selectedDestination ?? 0) === idx
                  return (
                    <article
                      key={d.title}
                      className={selected ? 'destCard destCardSelected' : 'destCard'}
                      onClick={() => setSelectedDestination(idx)}
                    >
                      <div className={`destCover ${d.coverClass}`}>
                        <div className={`destDays ${d.daysColor}`}>2 Days</div>
                        <div className="destCoverText">
                          <div className="destTitle">{d.title}</div>
                          <div className="destLocation">📍 {d.location}</div>
                        </div>
                      </div>

                      <div className="destMetaRow">
                        <div className="destMetaItem">🕒 {d.metaLeft}</div>
                        <div className="destMetaItem">♡ {d.metaRight}</div>
                      </div>

                      <div className="destActivitiesLabel">ACTIVITIES</div>
                      <div className="destChips">
                        {d.activities.map((a) => (
                          <div key={a} className="destChip">
                            {a}
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        className={`destButton ${d.buttonClass}`}
                        onClick={() => setSelectedDestination(idx)}
                      >
                        View Itinerary <span aria-hidden="true">→</span>
                      </button>
                    </article>
                  )
                })}
              </div>
            </>
          ) : null}

          <div className="templateStack">
            {draftPlan.days.map((day, dayIndex) => (
              <div key={`${day.title}-${day.offsetDays}`} className="templateCard">
                <div className="templateHeader">
                  <div className="templateTitle">{day.title}</div>
                  <button
                    type="button"
                    className="templateAddBtn"
                    onClick={() => addDraftItem(dayIndex)}
                  >
                    + Add
                  </button>
                </div>

                <div className="templateList">
                  {day.items.map((it) => (
                    <div key={it.id} className="templateItemCard">
                      <div className="templateRowTop">
                        <div
                          className={`templateDot templateDot-${it.tag.toLowerCase()}`}
                          aria-hidden="true"
                        />
                        <input
                          className="templateTitleInput"
                          value={it.title}
                          title={it.title}
                          onChange={(e) =>
                            updateDraftDayItem(dayIndex, it.id, { title: e.target.value })
                          }
                        />
                      </div>
                      <div className="templateRowBottom">
                        <input
                          className="templateTimeInput"
                          type="time"
                          value={formatTimeInput(it.startMinutes)}
                          onChange={(e) => {
                            const minutes = parseTimeInput(e.target.value)
                            if (minutes === null) return
                            updateDraftDayItem(dayIndex, it.id, { startMinutes: minutes })
                          }}
                        />
                        <input
                          className="templateDurationInput"
                          type="number"
                          value={it.durationMinutes}
                          min={15}
                          step={5}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            if (Number.isNaN(v)) return
                            updateDraftDayItem(dayIndex, it.id, {
                              durationMinutes: Math.max(15, v),
                            })
                          }}
                        />
                        <button
                          type="button"
                          className="templateDeleteBtn"
                          onClick={() => removeDraftItem(dayIndex, it.id)}
                          aria-label="Delete"
                        >
                          ×
                        </button>
                      </div>

                      <div className="templateNotesBox">
                        <textarea
                          className="templateNotesInput"
                          value={it.notes}
                          onChange={(e) =>
                            updateDraftDayItem(dayIndex, it.id, { notes: e.target.value })
                          }
                          placeholder="Notes…（可输入文字，或插入图片）"
                        />
                        <label className="templateImageButton">
                          + Image
                          <input
                            type="file"
                            accept="image/*"
                            className="templateImageInput"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              addDraftItemImage(dayIndex, it.id, file)
                              e.currentTarget.value = ''
                            }}
                          />
                        </label>
                      </div>

                      {it.images.length ? (
                        <div className="templateImages">
                          {it.images.map((src, idx) => (
                            <button
                              key={`${it.id}-${idx}`}
                              type="button"
                              className="templateImageThumb"
                              onClick={() => removeDraftItemImage(dayIndex, it.id, idx)}
                              aria-label="Remove image"
                            >
                              <img src={src} alt="" />
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <button type="button" className="scheduleAddButton" onClick={commitToCalendar}>
        Add to Calendar
      </button>

      {manualFixOpen ? (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="modalBackdrop"
            aria-label="Close"
            onClick={() =>
              setManualFixIdByPlanKey((prev) => ({ ...prev, [planKey]: null }))
            }
          />
          <div className="modalSheet">
            <div className="sheetHandle" aria-hidden="true" />
            <div className="modalTitle">Resolve Conflict</div>
            <div className="modalSub">
              {manualFixConflictId ? `Conflict: ${manualFixConflictId}` : ''}
            </div>

            <div className="planCard planSelected">
              <div className="planHeader">
                <div className="planLeft">
                  <div className="planName">Plan A</div>
                  <div className="planBadge">RECOMMENDED</div>
                </div>
                <div className="radioDot" aria-hidden="true" />
              </div>
              <div className="planRow">
                <div className="chip chipKeep">Keep</div>
                <div className="planTask">
                  <div className="planTaskTitle">
                    {activeManualConflict ? activeManualConflict.a.title : '—'}
                  </div>
                  <div className="planTaskTime">
                    {activeManualConflict
                      ? formatRange(
                          activeManualConflict.a.startMinutes,
                          activeManualConflict.a.endMinutes,
                        )
                      : '—'}
                  </div>
                </div>
              </div>
              <div className="planRow">
                <div className="chip chipMove">Move</div>
                <div className="planTask">
                  <div className="planTaskTitle">
                    {activeManualConflict ? activeManualConflict.b.title : '—'}
                  </div>
                  <div className="planTaskTime">
                    {activeManualConflict
                      ? formatMinutes(
                          Math.max(
                            activeManualConflict.a.endMinutes,
                            activeManualConflict.b.endMinutes,
                          ),
                        )
                      : '—'}
                  </div>
                </div>
              </div>
              <div className="planNote">
                <SparklesIcon size={16} />
                <span>Minimal disruption, maintains commitments</span>
              </div>
            </div>

            <div className="planCard">
              <div className="planHeader">
                <div className="planLeft">
                  <div className="planName">Plan B</div>
                  <div className="planAlt">Alternative</div>
                </div>
                <div className="radioRing" aria-hidden="true" />
              </div>
              <div className="planRow">
                <div className="chip chipShorten">Shorten</div>
                <div className="planTask">
                  <div className="planTaskTitle">
                    {activeManualConflict ? activeManualConflict.a.title : '—'}
                  </div>
                  <div className="planTaskTime">
                    {activeManualConflict
                      ? `${formatMinutes(activeManualConflict.a.startMinutes)} - ${formatMinutes(
                          Math.max(
                            activeManualConflict.a.startMinutes + 15,
                            activeManualConflict.b.startMinutes,
                          ),
                        )}`
                      : '—'}
                  </div>
                </div>
              </div>
              <div className="planRow">
                <div className="chip chipKeep">Keep</div>
                <div className="planTask">
                  <div className="planTaskTitle">
                    {activeManualConflict ? activeManualConflict.b.title : '—'}
                  </div>
                  <div className="planTaskTime">
                    {activeManualConflict
                      ? formatRange(
                          activeManualConflict.b.startMinutes,
                          activeManualConflict.b.endMinutes,
                        )
                      : '—'}
                  </div>
                </div>
              </div>
              <div className="planNote">
                <SparklesIcon size={16} />
                <span>Tighter schedule, may feel rushed</span>
              </div>
            </div>

            <button
              type="button"
              className="primaryButton"
              onClick={() => {
                if (activeManualConflict) {
                  const c = activeManualConflict
                  const moveTarget =
                    c.a.tag === 'MEETING' ? c.a : c.b.tag === 'MEETING' ? c.b : c.b
                  const parsed = parseDraftEventId(moveTarget.id)
                  if (parsed) {
                    const base = parseDateInput(selectedDateKey)
                    const target = parseDateInput(parsed.date)
                    const diff = Math.round((target.getTime() - base.getTime()) / 86400000)
                    const dayIndex = draftPlan.days.findIndex((d) => d.offsetDays === diff)
                    if (dayIndex >= 0) {
                      const newStart = Math.max(c.a.endMinutes, c.b.endMinutes)
                      updateDraftDayItem(dayIndex, parsed.itemId, { startMinutes: newStart })
                    }
                  }
                  setResolvedByPlanKey((prev) => ({
                    ...prev,
                    [planKey]: { ...(prev[planKey] ?? {}), [c.id]: true },
                  }))
                }
                setManualFixIdByPlanKey((prev) => ({ ...prev, [planKey]: null }))
              }}
            >
              Apply Plan A →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
