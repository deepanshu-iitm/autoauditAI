"use client";

import { useState } from "react";

export function Shot({ src, alt, fallback }: { src: string; alt: string; fallback?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="grid aspect-[16/9] place-items-center bg-ink/[0.04] px-6 text-center text-xs text-stone">
        {fallback ?? "No screenshot was recorded for this step."}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="block aspect-[16/9] w-full bg-ink/[0.04] object-cover object-top"
    />
  );
}
