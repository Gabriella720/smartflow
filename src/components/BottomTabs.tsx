import {
  CalendarIcon,
  ChartIcon,
  GearIcon,
} from './Icons'
import type { ReactNode } from 'react'

export type TabId = 'calendar' | 'schedule' | 'report'

export type BottomTabsProps = {
  activeTab: TabId
  onChange: (tab: TabId) => void
}

const tabs: Array<{
  id: TabId
  label: string
  Icon: (props: { className?: string }) => ReactNode
}> = [
  {
    id: 'calendar',
    label: 'Calendar',
    Icon: ({ className }) => <CalendarIcon className={className} />,
  },
  {
    id: 'schedule',
    label: 'Schedule',
    Icon: ({ className }) => <GearIcon className={className} />,
  },
  {
    id: 'report',
    label: 'Report',
    Icon: ({ className }) => <ChartIcon className={className} />,
  },
]

export function BottomTabs({ activeTab, onChange }: BottomTabsProps) {
  return (
    <nav className="tabBar" aria-label="Bottom navigation">
      {tabs.map((tab) => {
        const selected = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            className={selected ? 'tabItem tabItemActive' : 'tabItem'}
            onClick={() => onChange(tab.id)}
            aria-current={selected ? 'page' : undefined}
          >
            <span className="tabIcon" aria-hidden="true">
              <tab.Icon className="tabSvg" />
            </span>
            <span className="tabLabel">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
