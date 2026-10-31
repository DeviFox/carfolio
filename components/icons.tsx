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

export function CheckIcon(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M4 12.5 10 18 20 7" />
    </svg>
  );
}
