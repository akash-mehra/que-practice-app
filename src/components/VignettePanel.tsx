"use client";

import { useRef, useState } from "react";
import { ZoomIn, Flag } from "lucide-react";
import ImageZoomModal from "./ImageZoomModal";

interface VignettePanelProps {
  vignette: string;
  vignetteImage?: string;
  flagged: boolean;
  onToggleFlag: () => void;
}

export default function VignettePanel({
  vignette,
  vignetteImage,
  flagged,
  onToggleFlag,
}: VignettePanelProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [zoomOpen, setZoomOpen] = useState(false);

  // Native mouse-selection highlighting: wraps the current selection range
  // in a <mark> element with an accent-tinted background.
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!textRef.current || !textRef.current.contains(range.commonAncestorContainer)) {
      return;
    }
    const parent = range.commonAncestorContainer.parentElement;
    if (parent && parent.tagName === "MARK") {
      selection.removeAllRanges();
      return;
    }

    try {
      const mark = document.createElement("mark");
      mark.className = "rounded-sm";
      range.surroundContents(mark);
    } catch {
      // Selection spans multiple elements (e.g. crosses a <br>); ignore gracefully.
    }
    selection.removeAllRanges();
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[var(--bg-0)] px-6 py-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
          Vignette
        </span>
        <button
          onClick={onToggleFlag}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
            flagged
              ? "bg-[rgba(255,180,84,0.16)] text-[var(--amber)]"
              : "text-[var(--ink-muted)] hover:bg-black/[0.045] hover:text-[var(--ink-1)]"
          }`}
        >
          <Flag size={13} fill={flagged ? "currentColor" : "none"} />
          {flagged ? "Flagged" : "Flag for Review"}
        </button>
      </div>

      <p
        ref={textRef}
        onMouseUp={handleMouseUp}
        className="select-text text-[15px] leading-relaxed text-[var(--ink-0)]"
      >
        {vignette}
      </p>

      {vignetteImage && (
        <div className="mt-5">
          <button
            onClick={() => setZoomOpen(true)}
            className="group relative block w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--bg-1)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={vignetteImage}
              alt="Clinical imaging study"
              className="max-h-72 w-full object-cover transition group-hover:opacity-90"
            />
            <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
              <ZoomIn size={13} />
              Click to enlarge
            </span>
          </button>
          <p className="mt-1.5 text-center text-[11px] italic text-[var(--ink-muted)]">
            Figure 1. Imaging study obtained on admission.
          </p>
        </div>
      )}

      {zoomOpen && vignetteImage && (
        <ImageZoomModal
          src={vignetteImage}
          alt="Clinical imaging study enlarged"
          onClose={() => setZoomOpen(false)}
        />
      )}
    </div>
  );
}

