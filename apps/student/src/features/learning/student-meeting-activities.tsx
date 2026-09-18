'use client';

import { useState } from 'react';
import type {
  LearningMeeting,
  LearningActivity,
  LearningActivityContent,
  LearningProgress,
  Enrollment,
} from '@lms/api-client';
import { Pill } from '@/components/data-state';
import { recordLearningProgressAction } from './actions';

export function StudentMeetingActivitiesClient({
  meetings,
  activities,
  contents,
  progressList,
  enrollments,
}: {
  meetings: LearningMeeting[];
  activities: LearningActivity[];
  contents: LearningActivityContent[];
  progressList: LearningProgress[];
  enrollments: Enrollment[];
}) {
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(
    meetings[0]?.id ?? null,
  );
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>(
    enrollments[0]?.id ?? '',
  );
  const [progressState, setProgressState] = useState<
    Record<string, { status: string; progressPercent: number }>
  >(() => {
    const map: Record<string, { status: string; progressPercent: number }> = {};
    for (const p of progressList) {
      map[p.activityId] = {
        status: p.status,
        progressPercent: p.progressPercent,
      };
    }
    return map;
  });
  const [loadingActivityId, setLoadingActivityId] = useState<string | null>(
    null,
  );

  const activeMeeting = meetings.find((m) => m.id === activeMeetingId);
  const meetingActivities = activities
    .filter((a) => a.meetingId === activeMeetingId)
    .sort((a, b) => a.sequenceNo - b.sequenceNo);

  const handleToggleProgress = async (activityId: string) => {
    if (!selectedEnrollmentId) return;
    const current = progressState[activityId];
    const isCompleted = current?.status === 'COMPLETED';
    const nextStatus = isCompleted ? 'IN_PROGRESS' : 'COMPLETED';
    const nextPercent = isCompleted ? 50 : 100;

    setLoadingActivityId(activityId);
    const result = await recordLearningProgressAction({
      enrollmentId: selectedEnrollmentId,
      activityId,
      status: nextStatus,
      progressPercent: nextPercent,
    });
    setLoadingActivityId(null);

    if (result.ok) {
      setProgressState((prev) => ({
        ...prev,
        [activityId]: { status: nextStatus, progressPercent: nextPercent },
      }));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Enrollment Selector if student has multiple */}
      {enrollments.length > 1 ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <label className="text-xs font-medium text-slate-300">
            Pilih Pendaftaran:
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

      {/* Meeting Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {meetings.length === 0 ? (
          <p className="text-xs text-slate-400">
            Belum ada pertemuan yang dipublikasikan.
          </p>
        ) : (
          meetings.map((m) => {
            const isActive = m.id === activeMeetingId;
            return (
              <button
                key={m.id}
                onClick={() => setActiveMeetingId(m.id)}
                className={`whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'border-sky-500/50 bg-sky-500/20 text-sky-100'
                    : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                Pertemuan {m.meetingNo}: {m.title}
              </button>
            );
          })
        )}
      </div>

      {/* Selected Meeting Details */}
      {activeMeeting ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-100 sm:text-lg">
                Pertemuan {activeMeeting.meetingNo}: {activeMeeting.title}
              </h3>
              <Pill
                tone={activeMeeting.status === 'PUBLISHED' ? 'green' : 'slate'}
              >
                {activeMeeting.status}
              </Pill>
            </div>
            {activeMeeting.topic ? (
              <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                Topik: {activeMeeting.topic}
              </p>
            ) : null}
          </div>

          {/* Activities */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-200">
              Aktivitas Pembelajaran ({meetingActivities.length})
            </h4>

            {meetingActivities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400">
                Belum ada aktivitas pada pertemuan ini.
              </div>
            ) : (
              meetingActivities.map((act) => {
                const actContents = contents.filter(
                  (c) => c.activityId === act.id,
                );
                const prog = progressState[act.id];
                const isDone = prog?.status === 'COMPLETED';

                return (
                  <div
                    key={act.id}
                    className={`rounded-2xl border p-4 transition ${
                      isDone
                        ? 'border-emerald-500/30 bg-emerald-950/10'
                        : 'border-slate-800 bg-slate-900/60'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-sky-400">
                            #{act.sequenceNo}
                          </span>
                          <h5 className="text-sm font-medium text-slate-100">
                            {act.title}
                          </h5>
                          {act.isRequired ? (
                            <Pill tone="amber">Wajib</Pill>
                          ) : (
                            <Pill tone="slate">Opsional</Pill>
                          )}
                        </div>
                        {act.description ? (
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            {act.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <Pill
                          tone={
                            isDone
                              ? 'green'
                              : prog?.status === 'IN_PROGRESS'
                                ? 'blue'
                                : 'slate'
                          }
                        >
                          {prog?.status ?? 'NOT_STARTED'} (
                          {prog?.progressPercent ?? 0}%)
                        </Pill>

                        {selectedEnrollmentId ? (
                          <button
                            disabled={loadingActivityId === act.id}
                            onClick={() => handleToggleProgress(act.id)}
                            className={`rounded-lg border px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
                              isDone
                                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-amber-500 hover:text-amber-200'
                                : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/30'
                            }`}
                          >
                            {loadingActivityId === act.id
                              ? 'Memproses…'
                              : isDone
                                ? 'Batasi / Ulangi'
                                : 'Tandai Selesai'}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Content / Materials Attached */}
                    {actContents.length > 0 ? (
                      <div className="mt-4 border-t border-slate-800/80 pt-3 space-y-2">
                        <span className="text-xs font-medium text-slate-400">
                          Materi / Bahan Ajar:
                        </span>
                        {actContents.map((cnt) => (
                          <div
                            key={cnt.id}
                            className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-200">
                                [{cnt.contentType}] {cnt.title}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                v{cnt.sequenceNo}
                              </span>
                            </div>

                            {cnt.body ? (
                              <p className="mt-2 rounded-lg bg-slate-900 p-2.5 text-xs text-slate-300 leading-relaxed font-mono">
                                {cnt.body}
                              </p>
                            ) : null}

                            {cnt.externalUrl ? (
                              <div className="mt-2">
                                <a
                                  href={cnt.externalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-medium text-sky-400 hover:underline"
                                >
                                  🔗 Buka Tautan Eksternal ({cnt.externalUrl})
                                </a>
                              </div>
                            ) : null}

                            {cnt.storedFileId ? (
                              <div className="mt-2">
                                <span className="text-slate-400">
                                  📁 Berkas terlampir (ID:{' '}
                                  {cnt.storedFileId.slice(0, 8)}…)
                                </span>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
