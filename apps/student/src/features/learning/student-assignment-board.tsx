'use client';

import { useState } from 'react';
import type {
  Assignment,
  AssignmentSubmission,
  Enrollment,
} from '@lms/api-client';
import { Pill, formatDateTime } from '@/components/data-state';
import {
  submitAssignmentAction,
  attachSubmissionFileAction,
  detachSubmissionFileAction,
} from './actions';

export function StudentAssignmentBoardClient({
  assignments,
  submissions,
  enrollments,
  now,
}: {
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  enrollments: Enrollment[];
  now: number;
}) {
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>(
    enrollments[0]?.id ?? '',
  );
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(
    assignments[0]?.id ?? null,
  );

  // Form states for submitting/updating
  const [textAnswerInput, setTextAnswerInput] = useState<string>('');
  const [storedFileIdInput, setStoredFileIdInput] = useState<string>('');
  const [fileLabelInput, setFileLabelInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formMessage, setFormMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const activeAssignment = assignments.find((a) => a.id === activeAssignmentId);

  // Filter submissions for this assignment and enrollment
  const mySubmissions = submissions.filter(
    (s) =>
      s.assignmentId === activeAssignmentId &&
      (!selectedEnrollmentId || s.enrollmentId === selectedEnrollmentId),
  );

  const attemptsUsed = mySubmissions.length;
  const attemptsAllowed = activeAssignment?.attemptsAllowed ?? 1;
  const attemptsRemaining = Math.max(0, attemptsAllowed - attemptsUsed);

  const isSubmittable =
    activeAssignment?.status === 'PUBLISHED' && attemptsRemaining > 0;

  const handleNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignmentId || !selectedEnrollmentId) return;

    setIsSubmitting(true);
    setFormMessage(null);

    const res = await submitAssignmentAction({
      assignmentId: activeAssignmentId,
      enrollmentId: selectedEnrollmentId,
      textAnswer: textAnswerInput.trim() || undefined,
    });

    setIsSubmitting(false);

    if (!res.ok) {
      setFormMessage({ type: 'error', text: res.message });
      return;
    }

    setFormMessage({ type: 'success', text: 'Tugas berhasil dikumpulkan!' });
    setTextAnswerInput('');

    // Trigger local refresh optimistic state or standard reload
    window.location.reload();
  };

  const handleAttachFile = async (submissionId: string) => {
    if (!storedFileIdInput.trim()) return;
    setIsSubmitting(true);
    setFormMessage(null);

    const res = await attachSubmissionFileAction(
      submissionId,
      storedFileIdInput.trim(),
      fileLabelInput.trim() || undefined,
    );

    setIsSubmitting(false);

    if (!res.ok) {
      setFormMessage({ type: 'error', text: res.message });
      return;
    }

    setStoredFileIdInput('');
    setFileLabelInput('');
    setFormMessage({ type: 'success', text: 'Berkas berhasil dilampirkan.' });
    window.location.reload();
  };

  const handleDetachFile = async (
    submissionId: string,
    storedFileId: string,
  ) => {
    setIsSubmitting(true);
    const res = await detachSubmissionFileAction(submissionId, storedFileId);
    setIsSubmitting(false);

    if (!res.ok) {
      setFormMessage({ type: 'error', text: res.message });
      return;
    }
    window.location.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Enrollment Filter if multiple */}
      {enrollments.length > 1 ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <label className="text-xs font-medium text-slate-300">
            Submit sebagai Pendaftaran:
          </label>
          <select
            value={selectedEnrollmentId}
            onChange={(e) => setSelectedEnrollmentId(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 outline-none"
          >
            {enrollments.map((enr) => (
              <option key={enr.id} value={enr.id}>
                {enr.enrollmentNumber ?? enr.id.slice(0, 8)} (Kelas:{' '}
                {enr.academicClassId?.slice(0, 8) ?? 'Umum'})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {/* Assignment List */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Assignment Selector */}
        <div className="flex flex-col gap-3 lg:col-span-1">
          <h3 className="text-sm font-semibold text-slate-200">
            Daftar Tugas ({assignments.length})
          </h3>

          {assignments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400">
              Belum ada tugas yang diberikan.
            </div>
          ) : (
            assignments.map((asg) => {
              const isActive = asg.id === activeAssignmentId;
              const subCount = submissions.filter(
                (s) => s.assignmentId === asg.id,
              ).length;
              const isPastDue = asg.dueAt
                ? new Date(asg.dueAt).getTime() < now
                : false;

              return (
                <button
                  key={asg.id}
                  onClick={() => {
                    setActiveAssignmentId(asg.id);
                    setFormMessage(null);
                  }}
                  className={`flex flex-col items-start rounded-2xl border p-4 text-left transition ${
                    isActive
                      ? 'border-sky-500/50 bg-sky-500/10 text-slate-100'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-sky-400">
                      Maks Score: {asg.maxScore}
                    </span>
                    <Pill
                      tone={
                        subCount > 0 ? 'green' : isPastDue ? 'red' : 'amber'
                      }
                    >
                      {subCount > 0
                        ? `${subCount} Pengiriman`
                        : isPastDue
                          ? 'Terlewat'
                          : 'Belum'}
                    </Pill>
                  </div>
                  <h4 className="mt-2 text-sm font-medium text-slate-100">
                    {asg.title}
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Tenggat: {formatDateTime(asg.dueAt)}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Right Column: Submission details & Form */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          {activeAssignment ? (
            <div className="flex flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-100 sm:text-xl">
                    {activeAssignment.title}
                  </h3>
                  <Pill
                    tone={
                      activeAssignment.status === 'PUBLISHED'
                        ? 'green'
                        : 'slate'
                    }
                  >
                    Status Tugas: {activeAssignment.status}
                  </Pill>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-950/60 p-3 text-xs text-slate-300 sm:grid-cols-4">
                  <div>
                    <span className="block text-slate-500">Tenggat Waktu</span>
                    <span className="font-medium text-slate-200">
                      {formatDateTime(activeAssignment.dueAt)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-500">
                      Batas Percobaan
                    </span>
                    <span className="font-medium text-slate-200">
                      {attemptsUsed} / {activeAssignment.attemptsAllowed}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-500">Nilai Maksimal</span>
                    <span className="font-medium text-slate-200">
                      {activeAssignment.maxScore}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-500">
                      Sisa Kesempatan
                    </span>
                    <span className="font-medium text-slate-200">
                      {attemptsRemaining} kali
                    </span>
                  </div>
                </div>

                {activeAssignment.instructions ? (
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed text-slate-300">
                    <p className="font-semibold text-slate-200 mb-1">
                      Petrujuk / Instruksi:
                    </p>
                    {activeAssignment.instructions}
                  </div>
                ) : null}
              </div>

              {/* Status Message */}
              {formMessage ? (
                <div
                  className={`rounded-xl border p-3 text-xs font-medium ${
                    formMessage.type === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                  }`}
                >
                  {formMessage.text}
                </div>
              ) : null}

              {/* Previous Submission Attempts History */}
              <div className="space-y-3 border-t border-slate-800 pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Riwayat Pengiriman Saya ({mySubmissions.length})
                </h4>

                {mySubmissions.length === 0 ? (
                  <p className="text-xs italic text-slate-500">
                    Anda belum mengirimkan jawaban untuk tugas ini.
                  </p>
                ) : (
                  mySubmissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sky-400">
                            Percobaan #{sub.attemptNo}
                          </span>
                          <Pill
                            tone={
                              sub.status === 'RETURNED' ||
                              sub.status === 'GRADED'
                                ? 'green'
                                : 'blue'
                            }
                          >
                            {sub.status}
                          </Pill>
                          {sub.isLate ? (
                            <Pill tone="red">Terlambat</Pill>
                          ) : (
                            <Pill tone="green">Tepat Waktu</Pill>
                          )}
                        </div>

                        <span className="text-slate-400">
                          Dikirim:{' '}
                          {formatDateTime(sub.submittedAt ?? sub.createdAt)}
                        </span>
                      </div>

                      {/* Text Answer */}
                      {sub.textAnswer ? (
                        <div>
                          <span className="block font-medium text-slate-400 mb-1">
                            Jawaban Teks:
                          </span>
                          <p className="rounded-lg bg-slate-900 p-2.5 text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {sub.textAnswer}
                          </p>
                        </div>
                      ) : null}

                      {/* Attached Files */}
                      {sub.files && sub.files.length > 0 ? (
                        <div>
                          <span className="block font-medium text-slate-400 mb-1">
                            Berkas Terlampir ({sub.files.length}):
                          </span>
                          <div className="space-y-1.5">
                            {sub.files.map((f) => (
                              <div
                                key={f.id}
                                className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2"
                              >
                                <span className="font-mono text-slate-300">
                                  📁{' '}
                                  {f.originalName ?? f.label ?? f.storedFileId}
                                </span>
                                {sub.status === 'DRAFT' ? (
                                  <button
                                    onClick={() =>
                                      handleDetachFile(sub.id, f.storedFileId)
                                    }
                                    className="text-rose-400 hover:underline"
                                  >
                                    Hapus
                                  </button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* Attachment Input for DRAFT attempt */}
                      {sub.status === 'DRAFT' ? (
                        <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900 p-3 space-y-2">
                          <span className="block font-semibold text-slate-300">
                            + Lampirkan Berkas Tambahan (Stored File ID)
                          </span>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              type="text"
                              placeholder="UUID Stored File ID"
                              value={storedFileIdInput}
                              onChange={(e) =>
                                setStoredFileIdInput(e.target.value)
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleAttachFile(sub.id)}
                              disabled={isSubmitting || !storedFileIdInput}
                              className="rounded-lg border border-sky-500/40 bg-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-200 transition hover:bg-sky-500/30 disabled:opacity-50"
                            >
                              Lampirkan
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {/* Grade & Feedback if RETURNED or GRADED */}
                      {sub.grade ? (
                        <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-emerald-300 uppercase tracking-wider">
                              Hasil Penilaian & Feedback
                            </span>
                            <span className="text-sm font-bold text-emerald-200">
                              Nilai: {sub.grade.score} /{' '}
                              {activeAssignment.maxScore}
                            </span>
                          </div>
                          {sub.grade.feedback ? (
                            <p className="text-xs text-emerald-100/90 leading-relaxed pt-1">
                              Catatan Pengajar: &ldquo;{sub.grade.feedback}
                              &rdquo;
                            </p>
                          ) : (
                            <p className="text-xs italic text-emerald-100/70">
                              Tidak ada catatan tertulis.
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>

              {/* Submit Form for new attempt */}
              {isSubmittable ? (
                <form
                  onSubmit={handleNewSubmit}
                  className="mt-4 flex flex-col gap-4 rounded-xl border border-sky-500/30 bg-slate-950 p-4"
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                    Kumpulkan Percobaan Baru (Sisa {attemptsRemaining}{' '}
                    Kesempatan)
                  </h4>

                  <label className="text-xs text-slate-300">
                    Jawaban Teks / Catatan Pelaksanaan:
                    <textarea
                      rows={4}
                      placeholder="Tuliskan jawaban atau uraian tugas Anda di sini..."
                      value={textAnswerInput}
                      onChange={(e) => setTextAnswerInput(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-slate-100 outline-none focus:border-sky-400"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl border border-sky-500/40 bg-sky-500/20 py-2.5 text-xs font-semibold text-sky-100 transition hover:bg-sky-500/30 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Mengirimkan…' : 'Kumpulkan Tugas Sekarang'}
                  </button>
                </form>
              ) : (
                <div className="mt-2 rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-400">
                  {attemptsRemaining === 0
                    ? 'Batas kesempatan pengiriman tugas ini telah tercapai.'
                    : 'Tugas ini tidak menerima pengiriman baru.'}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
