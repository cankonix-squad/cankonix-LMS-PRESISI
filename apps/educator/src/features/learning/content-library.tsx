import type { LearningActivityContentType } from '@lms/api-client';
import { SectionCard } from '@/components/educator-shell';
import { DataBlock, Pill } from '@/components/data-state';
import { createEducatorApiClient, getOrEmpty } from '@/lib/api';

const contentTones: Record<
  LearningActivityContentType,
  'slate' | 'green' | 'red' | 'blue' | 'amber'
> = {
  TEXT: 'slate',
  LINK: 'blue',
  FILE: 'green',
  VIDEO: 'amber',
};

/**
 * Activity content library.
 *
 * The create form is presentational: it documents the fields the API accepts
 * without duplicating the validation the API performs (content-type-specific
 * requirements such as "FILE needs a storedFileId" live server-side).
 */
export async function ContentLibrary() {
  const api = createEducatorApiClient();
  const contents = await getOrEmpty(() =>
    api.learningActivityContents.list({ limit: 20 }),
  );

  return (
    <SectionCard
      id="aktivitas"
      title="Materi Aktivitas"
      description="Materi per aktivitas. Aturan tiap jenis materi divalidasi backend agar UI tidak menggandakan logika bisnis."
    >
      <DataBlock result={contents} empty="Belum ada materi pada cakupan ini.">
        {({ data }) => (
          <ul className="flex flex-col gap-3">
            {data.map((content) => (
              <li
                key={content.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    {content.sequenceNo}. {content.title}
                  </p>
                  {content.body ? (
                    <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
                      {content.body}
                    </p>
                  ) : null}
                  {content.externalUrl ? (
                    <p className="mt-1 text-xs text-sky-300">
                      {content.externalUrl}
                    </p>
                  ) : null}
                </div>
                <Pill tone={contentTones[content.contentType]}>
                  {content.contentType}
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </DataBlock>
    </SectionCard>
  );
}
