export type IconProps = {
  size?: number
  className?: string
}

function svgProps(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    className,
  } as const
}

export function SparklesIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path
        d="M12 2l1.1 4.1c.4 1.6 1.6 2.8 3.2 3.2L20.4 10l-4.1 1.1c-1.6.4-2.8 1.6-3.2 3.2L12 18.4l-1.1-4.1c-.4-1.6-1.6-2.8-3.2-3.2L3.6 10l4.1-1.1c1.6-.4 2.8-1.6 3.2-3.2L12 2Z"
        fill="currentColor"
        opacity="0.95"
      />
      <path
        d="M5.5 14.5l.5 1.8c.2.7.7 1.2 1.4 1.4l1.8.5-1.8.5c-.7.2-1.2.7-1.4 1.4l-.5 1.8-.5-1.8c-.2-.7-.7-1.2-1.4-1.4L1.8 18l1.8-.5c.7-.2 1.2-.7 1.4-1.4l.5-1.8Z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  )
}

export function ChevronRightIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function HomeIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path
        d="M4 10.5l8-6 8 6V20a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 20v-9.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 21.5v-6a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CalendarIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path
        d="M7 3.5v3M17 3.5v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4.5 8.5h15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.5 5.5h11A2 2 0 0 1 19.5 7.5v12A2 2 0 0 1 17.5 21.5h-11A2 2 0 0 1 4.5 19.5v-12A2 2 0 0 1 6.5 5.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ChartIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path
        d="M6 20V10M12 20V4M18 20v-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function DumbbellIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path
        d="M4.5 9.5v5M7 8v8M17 8v8M19.5 9.5v5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M7 12h10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function PlaneIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path
        d="M21 3L10.5 13.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M21 3l-6.5 19-4.2-7.2L3 10.5 21 3Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function GearIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 13.1v-2.2l-2-.7a7.6 7.6 0 0 0-.6-1.4l1-1.9-1.6-1.6-1.9 1a7.6 7.6 0 0 0-1.4-.6l-.7-2h-2.2l-.7 2c-.5.1-1 .3-1.4.6l-1.9-1L5.2 6.9l1 1.9c-.3.5-.5 1-.6 1.4l-2 .7v2.2l2 .7c.1.5.3 1 .6 1.4l-1 1.9 1.6 1.6 1.9-1c.5.3 1 .5 1.4.6l.7 2h2.2l.7-2c.5-.1 1-.3 1.4-.6l1.9 1 1.6-1.6-1-1.9c.3-.5.5-1 .6-1.4l2-.7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
