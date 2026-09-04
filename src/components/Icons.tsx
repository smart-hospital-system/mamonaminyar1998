interface IconProps {
  className?: string;
}

function base(className?: string) {
  return {
    viewBox: '0 0 24 24',
    className: className ?? 'h-5 w-5',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
}

export function IconPlay({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-5 w-5'} aria-hidden>
      <path d="M7.5 4.9v14.2a.6.6 0 0 0 .92.51l11.06-7.1a.6.6 0 0 0 0-1.02L8.42 4.39a.6.6 0 0 0-.92.51z" fill="currentColor" />
    </svg>
  );
}

export function IconPause({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-5 w-5'} aria-hidden>
      <rect x="6.5" y="4.5" width="3.6" height="15" rx="1" fill="currentColor" />
      <rect x="13.9" y="4.5" width="3.6" height="15" rx="1" fill="currentColor" />
    </svg>
  );
}

export function IconReset({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M3 3.5v5h5" />
      <path d="M3.3 8.5A9 9 0 1 1 3 12" />
    </svg>
  );
}

export function IconSkip({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-5 w-5'} aria-hidden>
      <path d="M5.5 4.9v14.2a.6.6 0 0 0 .92.51l10.4-6.68a.6.6 0 0 0 0-1.02L6.42 4.39a.6.6 0 0 0-.92.51z" fill="currentColor" />
      <rect x="17.4" y="4.5" width="2.6" height="15" rx="1" fill="currentColor" />
    </svg>
  );
}

export function IconSliders({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M4 7h16M4 12h16M4 17h16" strokeOpacity="0.55" />
      <circle cx="15" cy="7" r="2.3" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="12" r="2.3" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="17" r="2.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconVolume({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-5 w-5'} aria-hidden>
      <path d="M11.5 4.8 7 8.8H3.5v6.4H7l4.5 4z" fill="currentColor" />
      <path d="M15.5 9.3a4.2 4.2 0 0 1 0 5.4M18.2 6.8a8 8 0 0 1 0 10.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconVolumeOff({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-5 w-5'} aria-hidden>
      <path d="M11.5 4.8 7 8.8H3.5v6.4H7l4.5 4z" fill="currentColor" />
      <path d="m16 9.5 5 5M21 9.5l-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconClose({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconFlame({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-4 w-4'} aria-hidden>
      <path
        d="M12 2.4c.9 2.7 2.3 4.5 3.7 6.1a7.7 7.7 0 0 1 2.8 5.6 6.5 6.5 0 0 1-13 0c0-2.2.95-4.1 2.3-5.7.5 1 1.2 1.75 2.2 2.25C10 7.6 10.8 4.9 12 2.4z"
        fill="currentColor"
      />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function IconMinus({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M6 12h12" />
    </svg>
  );
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 6v12M6 12h12" />
    </svg>
  );
}

export function TomatoIcon({ className = 'h-8 w-8' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 6.6c5 0 8.2 2.9 8.2 7 0 4.6-3.7 7.8-8.2 7.8S3.8 18.2 3.8 13.6c0-4.1 3.2-7 8.2-7z"
        fill="#ff5d47"
      />
      <path
        d="M12 2.2c1.4 1 2 2.3 1.8 3.8 1.9-.8 3.3-.6 4.6.5-1.6 1-3.1 1.1-4.7.6-.4.9-1.1 1.4-1.7 1.4s-1.3-.5-1.7-1.4c-1.6.5-3.1.4-4.7-.6 1.3-1.1 2.7-1.3 4.6-.5-.2-1.5.4-2.8 1.8-3.8z"
        fill="#5ec97a"
      />
      <ellipse cx="9" cy="12.6" rx="1.5" ry="2.5" fill="#ffffff" opacity="0.16" transform="rotate(-18 9 12.6)" />
    </svg>
  );
}
