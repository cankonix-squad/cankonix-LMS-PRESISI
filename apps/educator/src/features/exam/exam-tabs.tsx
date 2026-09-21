'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

const TABS = [
  { id: 'authoring', label: 'Exam' },
  { id: 'banks', label: 'Bank soal' },
  { id: 'blueprint', label: 'Blueprint' },
  { id: 'session', label: 'Sesi & peserta' },
  { id: 'grading', label: 'Penilaian' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/**
 * Tab shell for the exam workspace.
 *
 * Only the selected panel is rendered, so a slow or failing read in one section
 * cannot hold up the others — each panel owns its own request state and its own
 * error surface.
 */
export function ExamTabs({
  panels,
}: {
  panels: Partial<Record<TabId, ReactNode>>;
}) {
  const available = TABS.filter((tab) => panels[tab.id]);
  const [active, setActive] = useState<TabId>(available[0]?.id ?? 'authoring');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist">
        {available.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={
              active === tab.id
                ? 'rounded-full border border-sky-400 bg-sky-500/20 px-4 py-2 text-sm text-white'
                : 'rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-sky-400'
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{panels[active] ?? null}</div>
    </div>
  );
}
