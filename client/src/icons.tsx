type IconProps = { className?: string };

function Svg({ className = "w-5 h-5", children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {children}
    </svg>
  );
}

export function IconUser({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </Svg>
  );
}

export function IconPalette({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 2a10 10 0 1 0 4 19.1 2 2 0 0 1 2-3.1H16a2 2 0 0 0 2-2 9.97 9.97 0 0 0-6-9z" />
      <circle cx="8" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="11" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="10" cy="15" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconBarChart({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="4" y="10" width="4" height="10" rx="1" fill="currentColor" stroke="none" />
      <rect x="10" y="5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
      <rect x="16" y="13" width="4" height="7" rx="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconLightning({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconBackspace({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21 6H8L1 12l7 6h13a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1z" />
      <line x1="12" y1="10" x2="16" y2="14" />
      <line x1="16" y1="10" x2="12" y2="14" />
    </Svg>
  );
}

export function IconTrophy({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 2h12v8a6 6 0 0 1-12 0V2z" />
      <path d="M6 5H2v3a4 4 0 0 0 4 4" />
      <path d="M18 5h4v3a4 4 0 0 1-4 4" />
      <path d="M12 16v4" />
      <path d="M8 20h8" />
    </Svg>
  );
}

export function IconSkull({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="11" r="7" />
      <path d="M9 21h6" />
      <path d="M10 21v-3" />
      <path d="M14 21v-3" />
      <circle cx="9.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconScale({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3v18" />
      <path d="M5 9l7-6 7 6" />
      <path d="M2 15h6" />
      <path d="M16 15h6" />
      <path d="M2 15a3 3 0 0 0 6 0 3 3 0 0 0-6 0z" />
      <path d="M16 15a3 3 0 0 0 6 0 3 3 0 0 0-6 0z" />
    </Svg>
  );
}

export function IconTarget({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconArrowLeft({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </Svg>
  );
}

export function IconExpand({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </Svg>
  );
}

export function IconQuestion({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" />
      <circle cx="12" cy="17" r=".5" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconCompress({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M9 9V3M9 9H3M9 9 3 3M15 9h6M15 9V3M15 9l6-6M9 15H3M9 15v6M9 15l-6 6M15 15h6M15 15v6M15 15l6 6" />
    </Svg>
  );
}
