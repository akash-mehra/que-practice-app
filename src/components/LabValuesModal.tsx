"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";

interface LabValuesModalProps {
  onClose: () => void;
}

const SAMPLE_LAB_VALUES = [
  { name: "Sodium (Na+)", value: "136–145 mEq/L" },
  { name: "Potassium (K+)", value: "3.5–5.0 mEq/L" },
  { name: "Creatinine", value: "0.6–1.2 mg/dL" },
  { name: "Hemoglobin (Male)", value: "13.5–17.5 g/dL" },
  { name: "Hemoglobin (Female)", value: "12.0–16.0 g/dL" },
  { name: "Platelets", value: "150,000–400,000/mm³" },
  { name: "White Blood Cells", value: "4,500–11,000/mm³" },
  { name: "Troponin I", value: "< 0.04 ng/mL" },
  { name: "BNP", value: "< 100 pg/mL" },
  { name: "Glucose, Fasting", value: "70–100 mg/dL" },
];

export default function LabValuesModal({ onClose }: LabValuesModalProps) {
  const [query, setQuery] = useState("");

  const filtered = SAMPLE_LAB_VALUES.filter((lv) =>
    lv.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,4,12,0.72)] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--bg-1)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-[var(--ink-0)]">
            Normal Lab Values
          </h3>
          <button onClick={onClose} className="text-[var(--ink-muted)] hover:text-[var(--ink-0)]">
            <X size={18} />
          </button>
        </div>
        <div className="border-b border-[var(--line)] px-4 py-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white/[0.04] px-2.5 py-1.5">
            <Search size={15} className="text-[var(--ink-muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search lab values (e.g. sodium, troponin)..."
              className="w-full bg-transparent text-[13px] text-[var(--ink-0)] outline-none placeholder:text-[var(--ink-muted)]"
            />
          </div>
        </div>
        <div className="overflow-y-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-[var(--bg-1)] text-[11px] uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-2 font-semibold">Test</th>
                <th className="px-4 py-2 font-semibold">Reference Range</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lv) => (
                <tr key={lv.name} className="border-t border-[var(--line)]">
                  <td className="px-4 py-2.5 text-[var(--ink-0)]">{lv.name}</td>
                  <td className="px-4 py-2.5 font-mono text-[var(--ink-1)]">{lv.value}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-[var(--ink-muted)]">
                    No matching lab values.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
