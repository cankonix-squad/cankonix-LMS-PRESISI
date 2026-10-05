'use client';

import {
  createContext,
  useActionState,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { unstable_rethrow } from 'next/navigation';
import { ActionMessage } from './feedback';

type ActionResult = { ok: boolean; message: string | null };
type DrawerWorkflow = {
  active: boolean;
  pending: boolean;
  close: () => void;
  begin: () => boolean;
  finish: () => void;
  saved: (result: ActionResult) => void;
};

export const DrawerWorkflowContext = createContext<DrawerWorkflow | null>(null);

/** Retain the live form and its selections, not a lossy snapshot of inputs. */
export function DrawerHost({
  activeKey,
  onClose,
  children,
}: {
  activeKey: string | null;
  onClose: () => void;
  children: ReactNode;
}) {
  const [cache, setCache] = useState<{
    input: ReactNode;
    key: string | null;
    panels: Record<string, ReactNode>;
  }>({ input: null, key: null, panels: {} });
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [notice, setNotice] = useState<ActionResult | null>(null);

  // Like adjusting selection when a prop changes: render the new panel in the
  // same pass, and keep each old panel mounted under its original record key.
  // Comparing the actual prop prevents a loop on the host's own state updates.
  let panels = cache.panels;
  if (cache.input !== children || cache.key !== activeKey) {
    panels =
      activeKey && children ? { ...panels, [activeKey]: children } : panels;
    setCache({ input: children, key: activeKey, panels });
  }

  const close = () => {
    if (!busy.current) onClose();
  };
  const begin = () => {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    return true;
  };
  const finish = () => {
    busy.current = false;
    setPending(false);
  };

  return (
    <>
      {notice ? (
        <div role="status" className="px-5">
          <ActionMessage state={notice} />
        </div>
      ) : null}
      {Object.entries(panels).map(([key, panel]) => (
        <DrawerWorkflowContext.Provider
          key={key}
          value={{
            active: key === activeKey,
            pending,
            close,
            begin,
            finish,
            saved: (result) => {
              setNotice(result);
              setCache((current) => {
                const next = { ...current.panels };
                delete next[key];
                return { ...current, panels: next };
              });
              onClose();
            },
          }}
        >
          <div hidden={key !== activeKey} inert={key !== activeKey}>
            {panel}
          </div>
        </DrawerWorkflowContext.Provider>
      ))}
    </>
  );
}

/** Works outside a drawer too; only an actual successful action dismisses it. */
export function useDrawerActionState<State extends ActionResult, Payload>(
  action: (state: State, payload: Payload) => State | Promise<State>,
  initialState: State,
  options: { closeOnSuccess?: boolean } = {},
): [State, (payload: Payload) => void, boolean] {
  const workflow = useContext(DrawerWorkflowContext);
  return useActionState<State, Payload>(async (previous, payload) => {
    if (workflow && !workflow.begin()) return previous;
    try {
      const result = await action(previous, payload);
      if (result.ok && options.closeOnSuccess !== false)
        workflow?.saved(result);
      return result;
    } catch (error) {
      unstable_rethrow(error);
      return {
        ...initialState,
        ok: false,
        message:
          'Hasil penyimpanan belum dapat dipastikan. Periksa daftar sebelum mencoba lagi.',
      };
    } finally {
      workflow?.finish();
    }
  }, initialState as Awaited<State>);
}
