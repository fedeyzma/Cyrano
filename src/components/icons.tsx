import type { SVGProps } from "react";

/**
 * Cyrano icon set — hairline engraving weight (1.7) to sit with the
 * letterpress chrome. All icons are 24-grid, stroke-only, currentColor,
 * aria-hidden (buttons carry the labels).
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Four-point compositor's star with a small companion — Cyrano's voice. */
export const IconSparkles = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11 4c.7 3.2 2.8 5.3 6 6-3.2.7-5.3 2.8-6 6-.7-3.2-2.8-5.3-6-6 3.2-.7 5.3-2.8 6-6Z" />
    <path d="M18.5 15.5c.35 1.6 1.4 2.65 3 3-1.6.35-2.65 1.4-3 3-.35-1.6-1.4-2.65-3-3 1.6-.35 2.65-1.4 3-3Z" opacity={0.6} />
  </Icon>
);

export const IconCopy = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" opacity={0.6} />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" opacity={0.55} />
  </Icon>
);

export const IconPin = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 17v5M9 3h6l-1 6 3 3H7l3-3-1-6Z" />
  </Icon>
);

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const IconSend = (p: IconProps) => (
  <Icon {...p}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" opacity={0.6} />
  </Icon>
);

export const IconMenu = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
);

export const IconClose = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);

export const IconScan = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <path d="M3 12h18" opacity={0.55} />
  </Icon>
);

export const IconCards = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="8" width="13" height="13" rx="2" />
    <path d="M8 8V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" opacity={0.55} />
  </Icon>
);

export const IconChat = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
  </Icon>
);

export const IconBrain = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 4a2.5 2.5 0 0 0-2.5 2.5A2.5 2.5 0 0 0 4 9c0 1 .5 1.8 1.2 2.3A2.6 2.6 0 0 0 5 13a2.5 2.5 0 0 0 2 2.45V18a2 2 0 0 0 4 0V4.5A1.5 1.5 0 0 0 9.5 4H9Z" />
    <path d="M15 4a2.5 2.5 0 0 1 2.5 2.5A2.5 2.5 0 0 1 20 9c0 1-.5 1.8-1.2 2.3.1.4.2.8.2 1.2a2.5 2.5 0 0 1-2 2.45V18a2 2 0 0 1-4 0" opacity={0.5} />
  </Icon>
);

export const IconRefresh = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" opacity={0.6} />
  </Icon>
);

export const IconUser = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icon>
);

export const IconCompass = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2.2 5.3-5.3 2.2 2.2-5.3 5.3-2.2Z" />
  </Icon>
);

export const IconEdit = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 20h9" opacity={0.55} />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icon>
);

export const IconReply = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 17 4 12l5-5" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </Icon>
);

/** Editorial double quotation — opening marks, engraved. */
export const IconQuote = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.5 7.5C7.6 8.4 6 10.5 6 13.5V17h4.5v-4.5H8.1c.1-1.9.9-3.1 2.4-3.8Z" />
    <path d="M19.5 7.5c-2.9.9-4.5 3-4.5 6V17h4.5v-4.5h-2.4c.1-1.9.9-3.1 2.4-3.8Z" />
  </Icon>
);

/** Swap sides — two counterposed arrows on their own baselines. */
export const IconSwap = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7.5h13.5m0 0L14 4m3.5 3.5L14 11" />
    <path d="M20 16.5H6.5m0 0L10 13m-3.5 3.5L10 20" opacity={0.7} />
  </Icon>
);

export const IconChevronUp = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 15 6-6 6 6" />
  </Icon>
);

export const IconChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);

export const IconImport = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
    <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" opacity={0.6} />
  </Icon>
);

export const IconHeart = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 20s-7-4.3-9.5-8.6C1 8.5 2.4 5.5 5.5 5.5c1.9 0 3.2 1 4.5 2.6C11.3 6.5 12.6 5.5 14.5 5.5c3.1 0 4.5 3 3 5.9C19 15.7 12 20 12 20Z" />
  </Icon>
);

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Icon>
);

export const IconSort = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h10M4 12h7M4 18h4" />
    <path d="M17 5v14m0 0 3-3m-3 3-3-3" opacity={0.6} />
  </Icon>
);

export const IconDownload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" opacity={0.6} />
  </Icon>
);

export const IconUpload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21V9" />
    <path d="m7 14 5-5 5 5" />
    <path d="M5 3h14" opacity={0.6} />
  </Icon>
);

/** Quill — the letterpress studio's pen (empty states, voice moments). */
export const IconQuill = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 4c-6.5.5-11 3-13.5 8.5C5.4 15 5 17.5 5 20c2.5 0 5-.4 7.5-1.5C18 16 19.5 10.5 20 4Z" />
    <path d="M5 20C8 14 11 10.5 15.5 8" opacity={0.55} />
  </Icon>
);

/** Grip / drag handle — the action-sheet pull bar, reorder affordances. */
export const IconGrip = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 9h8M8 15h8" />
  </Icon>
);
