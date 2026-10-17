"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="border border-current px-4 py-2 text-sm transition-colors hover:bg-clay hover:text-paper hover:border-clay"
    >
      Print report
    </button>
  );
}
