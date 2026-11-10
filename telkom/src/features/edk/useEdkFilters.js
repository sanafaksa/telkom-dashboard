import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const FILTER_KEYS = ['upload_id', 'periode', 'segmen', 'am', 'flag', 'q'];
export const TABS = ['segmen', 'periode', 'am', 'cc'];

export function useEdkFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(
    () =>
      Object.fromEntries(
        FILTER_KEYS.map((k) => [k, params.get(k) ?? '']).filter(([, v]) => v !== ''),
      ),
    [params],
  );

  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'segmen';

  const setParam = useCallback(
    (key, value) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setTab = useCallback((t) => setParam('tab', t), [setParam]);

  const resetFilters = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams();
        if (prev.get('tab')) next.set('tab', prev.get('tab'));
        if (prev.get('upload_id')) next.set('upload_id', prev.get('upload_id'));
        return next;
      },
      { replace: true },
    );
  }, [setParams]);

  return { filters, tab, setFilter: setParam, setTab, resetFilters };
}
