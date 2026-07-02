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

export function IconGitHub({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function IconCompress({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M9 9V3M9 9H3M9 9 3 3M15 9h6M15 9V3M15 9l6-6M9 15H3M9 15v6M9 15l-6 6M15 15h6M15 15v6M15 15l6 6" />
    </Svg>
  );
}
