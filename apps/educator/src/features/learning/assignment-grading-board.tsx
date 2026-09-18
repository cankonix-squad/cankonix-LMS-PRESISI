'use client';

import { useMemo, useState, useTransition } from 'react';
import type {
  Assignment,
  AssignmentSubmission,
  GradeSubmissionInput,
} from '@lms/api-client';
import { SectionCard } from '@/components/educator-shell';
import { AssignmentList } from './assignment-grading';

/**
 * Client-side controller for the assignment grading surface.
 *
 * It receives already-fetched data from the server component and owns only the
 * mutation wiring. Every mutation goes straight to the API — nothing here
 * recomputes a deadline, an attempt allowance, or a score ceiling.
 */
export function AssignmentGradingBoard({
  assignments,
  submissions,
  now,
}: {
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  /** Server timestamp (ms) so the overdue badge renders purely. */
  now: number;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const submissionsByAssignment = useMemo(() => {
    const grouped: Record<string, AssignmentSubmission[]> = {};
    for (const submission of submissions) {
      const bucket = grouped[submission.assignmentId] ?? [];
      bucket.push(submission);
      grouped[submission.assignmentId] = bucket;
    }
    for (const bucket of Object.values(grouped)) {
      bucket.sort((a, b) => b.attemptNo - a.attemptNo);
    }
    return grouped;
  }, [submissions]);

  async function grade(submissionId: string, input: GradeSubmissionInput) {
    const response = await fetch(
      `/api/educator/submissions/${submissionId}/grade`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      },
    );
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(readMessage(body, 'Gagal menyimpan nilai.'));
    }
    setMessage(
      'Nilai tersimpan. Muat ulang halaman untuk melihat hasil terbaru.',
    );
  }

  async function release(submissionId: string) {
    const response = await fetch(
      `/api/educator/submissions/${submissionId}/return`,
      { method: 'POST' },
    );
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(readMessage(body, 'Gagal merilis nilai.'));
    }
    setMessage(
      'Nilai dirilis. Muat ulang halaman untuk melihat hasil terbaru.',
    );
  }

  function onGrade(submissionId: string, input: GradeSubmissionInput) {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          await grade(submissionId, input);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  function onReturn(submissionId: string) {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          await release(submissionId);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  return (
    <SectionCard
      id="tugas"
      title="Tugas & Penilaian"
      description="Nilai per attempt. Batas skor, lifecycle, dan otorisasi educator ditegakkan API; UI hanya mengirimkan niat."
    >
      {message ? (
        <p className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
          {message}
        </p>
      ) : null}
      <AssignmentList
        assignments={assignments}
        submissionsByAssignment={submissionsByAssignment}
        now={now}
        onGrade={onGrade}
        onReturn={onReturn}
      />
    </SectionCard>
  );
}

function readMessage(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}
