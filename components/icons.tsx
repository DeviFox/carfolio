import { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

const base: Props = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
};

export function GarageIcon(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5 10v9h14v-9" />
      {/* Sectional garage door: a square opening with horizontal panels. */}
      <path d="M8 19v-8h8v8" />
      {/* Thinner panel lines, so they stay apart at 20px instead of filling the door. */}
      <path d="M8 13.7h8M8 16.3h8" strokeWidth={1.2} />
    </svg>
  );
}

export function CarIcon(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M4 13.5 6.3 8.2A2 2 0 0 1 8.1 7h7.8a2 2 0 0 1 1.8 1.2L20 13.5" />
      <rect x="3" y="13.5" width="18" height="5.5" rx="1.2" />
      <circle cx="7.5" cy="18.5" r="1.4" />
      <circle cx="16.5" cy="18.5" r="1.4" />
    </svg>
  );
}

export function HistoryIcon(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M3 12a9 9 0 1 0 2.3-6" />
      <path d="M3 4v4h4" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function SettingsIcon(p: Props) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="2.6" />
      <path d="M19.4 14.5a1.5 1.5 0 0 0 .3 1.6l.1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1.5 1.5 0 0 0-1.6-.3 1.5 1.5 0 0 0-.9 1.4V20a1.8 1.8 0 1 1-3.6 0v-.1a1.5 1.5 0 0 0-.9-1.4 1.5 1.5 0 0 0-1.6.3l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.5 1.5 0 0 0 .3-1.6 1.5 1.5 0 0 0-1.4-.9H4a1.8 1.8 0 1 1 0-3.6h.1a1.5 1.5 0 0 0 1.4-.9 1.5 1.5 0 0 0-.3-1.6l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.5 1.5 0 0 0 1.6.3h.1a1.5 1.5 0 0 0 .9-1.4V4a1.8 1.8 0 1 1 3.6 0v.1a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.6-.3l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.5 1.5 0 0 0-.3 1.6v.1a1.5 1.5 0 0 0 1.4.9H20a1.8 1.8 0 1 1 0 3.6h-.1a1.5 1.5 0 0 0-1.4.9z" />
    </svg>
  );
}

export function PlusIcon(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function ArrowLeftIcon(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}

export function ArrowRightIcon(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function ChevronDownIcon(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function CloseIcon(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M6 6l12 12" />
      <path d="M18 6l-12 12" />
    </svg>
  );
}

export function TrashIcon(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M4 7h16" />
      <path d="M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" />
      <path d="M6 7l.9 12.1A1 1 0 0 0 7.9 20h8.2a1 1 0 0 0 1-.9L18 7" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}

export function PencilIcon(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M15.5 5.5l3 3" />
      <path d="M4 20l1-4L16.2 4.8a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L8 19z" />
    </svg>
  );
}

export function HelpIcon(p: Props) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7" />
      <path d="M12 17.2v.1" />
    </svg>
  );
}

export function UserIcon(p: Props) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5c1.2-3.2 3.9-5 7-5s5.8 1.8 7 5" />
    </svg>
  );
}

export function EyeIcon(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

export function EyeOffIcon(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M9.9 5.8A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.4" />
      <path d="M6.5 7.6C3.9 9.3 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1" />
      <path d="M10 10.2a2.75 2.75 0 0 0 3.8 3.8" />
      <path d="M3.5 3.5l17 17" />
    </svg>
  );
}

export function CheckIcon(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M4 12.5 10 18 20 7" />
    </svg>
  );
}
