import type { ChangeEvent } from "react";

// Number fields show digit groups as the owner types: "120 000", "15 500,50".
// The groups are plain spaces, which toNumber() and friends already strip.

const groups = (int: string) => int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// Whole numbers: kilometres, miles.
export function groupInt(raw: string): string {
  return groups(raw.replace(/\D/g, ""));
}

// Money: one decimal comma (a typed dot becomes one), at most two decimals.
export function groupMoney(raw: string): string {
  const clean = raw.replace(/[^\d,.]/g, "");
  const sep = clean.search(/[,.]/);
  if (sep < 0) return groups(clean);
  const frac = clean.slice(sep + 1).replace(/[,.]/g, "").slice(0, 2);
  return `${groups(clean.slice(0, sep))},${frac}`;
}

// A stored number as the field shows it.
export const intText = (n?: number) => (n !== undefined ? groupInt(String(n)) : "");

// 845000 minor units → "8 450", 150050 → "1 500,5".
export const moneyText = (minor?: number) =>
  minor !== undefined ? groupMoney(String(minor / 100)) : "";

// onChange for a grouped field. Inserting a space moves the text under the
// caret, so the caret is put back after the same digit it followed.
export function groupedChange(format: (raw: string) => string, set: (v: string) => void) {
  return (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const raw = el.value;
    const next = format(raw);
    const caret = el.selectionStart ?? raw.length;
    const kept = raw.slice(0, caret).replace(/[^\d,.]/g, "").length;
    let pos = 0;
    for (let seen = 0; pos < next.length && seen < kept; pos++) {
      if (/[\d,]/.test(next[pos])) seen++;
    }
    set(next);
    requestAnimationFrame(() => {
      if (document.activeElement === el) el.setSelectionRange(pos, pos);
    });
  };
}
