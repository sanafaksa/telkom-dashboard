import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { UIC_TREE } from '../data/uicTree';

/** Semua nilai pilihan (leaf) di bawah sebuah node. Node bertanda * (custom) tidak ikut. */
const leavesOf = (node) => {
  if (node.custom) return [];
  if (!node.children?.length) return node.value ? [node.value] : [];
  return node.children.flatMap(leavesOf);
};

/**
 * Catatan "Semua <induk>" untuk setiap grup di bawah node (termasuk node itu sendiri).
 * Disimpan sebagai nilai biasa supaya pilihan "pilih semua" tetap tercatat walau
 * submenu tidak ada di data Excel/database.
 */
const groupNotesOf = (node) => {
  if (node.custom || !node.children?.length) return [];
  return [`Semua ${node.label}`, ...node.children.flatMap(groupNotesOf)];
};

/**
 * Tampilan pohon UIC ala Registry Editor: panah buka-tutup, indentasi per level.
 * mode="multi"  : centang banyak. Pakai selected + onToggle + onBulk + onAddCustom.
 * mode="single" : pilih satu. Pakai onPick.
 */
export function UicTreeMenu({
  tree = UIC_TREE,
  mode = 'multi',
  selected = [],
  onToggle,
  onBulk,
  onPick,
  onAddCustom,
  maxH = 'max-h-80',
  groupNotes = false,
}) {
  const [open, setOpen] = useState({});
  const [drafts, setDrafts] = useState({});

  const toggleOpen = (key) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  const renderNode = (node, level, parentValue, key) => {
    const indent = { paddingLeft: 8 + level * 16 };

    if (node.custom) {
      const draft = drafts[key] || '';
      const commit = () => {
        const typed = draft.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
        if (!typed) return;
        const value = [parentValue, `${node.prefix} ${typed}`].filter(Boolean).join(' - ');
        onAddCustom?.(value);
        setDrafts((d) => ({ ...d, [key]: '' }));
      };
      return (
        <div key={key} style={indent} className="flex items-center gap-1.5 py-1 pr-2">
          <span className="w-3.5 shrink-0" />
          <span className="text-xs font-bold text-amber-700 shrink-0">{node.label}</span>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              }
            }}
            placeholder="ketik isian..."
            className="min-w-0 flex-1 px-2 py-1 text-xs font-semibold text-slate-800 border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={commit}
            disabled={!draft.trim()}
            className="px-2 py-1 text-[11px] font-bold rounded-md bg-[#1447B8] text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            Tambah
          </button>
        </div>
      );
    }

    const hasKids = !!node.children?.length;
    const isOpen = !!open[key];
    const isSel = !!node.value && selected.includes(node.value);

    // Induk (punya anak) di mode centang banyak hanya membuka-tutup; pilihannya lewat kotak "pilih semua".
    const onRow = () => {
      if (mode === 'multi' && hasKids) toggleOpen(key);
      else if (node.value) {
        if (mode === 'single') onPick?.(node.value);
        else onToggle?.(node.value);
      } else if (hasKids) {
        toggleOpen(key);
      }
    };

    return (
      <div key={key}>
        <div
          style={indent}
          onClick={onRow}
          className={`flex items-center gap-1.5 py-1.5 pr-2 rounded-md cursor-pointer transition-colors ${
            isSel && mode === 'single' ? 'bg-blue-50' : 'hover:bg-blue-50/60'
          }`}
        >
          {hasKids ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleOpen(key);
              }}
              aria-label={isOpen ? 'Tutup' : 'Buka'}
              className="size-3.5 shrink-0 grid place-items-center text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <ChevronRight size={13} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
          ) : (
            <span className="w-3.5 shrink-0" />
          )}

          {mode === 'multi' &&
            hasKids &&
            (() => {
              const all = leavesOf(node);
              const picked = all.filter((v) => selected.includes(v)).length;
              const noteOn = groupNotes && selected.includes(`Semua ${node.label}`);
              // Mode catatan: status penuh mengikuti catatan "Semua <induk>" (tidak bergantung submenu)
              const full = groupNotes ? noteOn : all.length > 0 && picked === all.length;
              const part = !full && (picked > 0 || (groupNotes && groupNotesOf(node).some((v) => selected.includes(v))));
              return (
                <button
                  type="button"
                  title="Pilih semua"
                  aria-label={`Pilih semua ${node.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (groupNotes) {
                      // Centang/lepas induk beserta catatan semua grup turunannya
                      onBulk?.([...groupNotesOf(node), ...all], !noteOn);
                      return;
                    }
                    // Sudah ada yang terpilih (penuh/sebagian) -> klik menghapus semuanya; belum ada -> pilih semua
                    onBulk?.(all, picked === 0);
                  }}
                  className={`size-4 shrink-0 rounded border grid place-items-center cursor-pointer ${
                    full
                      ? 'bg-[#1447B8] border-[#1447B8] text-white'
                      : part
                        ? 'bg-blue-100 border-[#1447B8]'
                        : 'border-slate-400 bg-white'
                  }`}
                >
                  {full && <Check size={11} strokeWidth={3} />}
                  {part && <span className="block w-2 h-0.5 bg-[#1447B8]" />}
                </button>
              );
            })()}

          {mode === 'multi' && node.value && !hasKids && (
            <span
              className={`size-4 shrink-0 rounded border grid place-items-center ${
                isSel ? 'bg-[#1447B8] border-[#1447B8] text-white' : 'border-slate-300 bg-white'
              }`}
            >
              {isSel && <Check size={11} strokeWidth={3} />}
            </span>
          )}

          <span
            className={`text-xs leading-snug ${
              hasKids ? 'font-bold text-slate-700' : 'font-semibold text-slate-800'
            } ${isSel && mode === 'single' ? 'text-[#1447B8]' : ''}`}
          >
            {node.label}
          </span>

          {mode === 'single' && isSel && <Check size={12} className="ml-auto shrink-0 text-[#1447B8]" />}
        </div>

        {hasKids &&
          isOpen &&
          node.children.map((child, i) => renderNode(child, level + 1, node.value ?? parentValue, `${key}/${i}`))}
      </div>
    );
  };

  return <div className={`${maxH} overflow-y-auto py-1`}>{tree.map((n, i) => renderNode(n, 0, null, String(i)))}</div>;
}

/**
 * Dropdown filter UIC: pilih banyak (kotak centang). value = array nilai, kosong = semua.
 * Panel tetap terbuka saat memilih; ditutup dengan klik di luar.
 */
export function UicFilterDropdown({ value = [], onChange, allLabel = 'All UIC', witelLabel = 'All Witel', className = '' }) {
  const [open, setOpen] = useState(false);

  const label =
    value.length === 0
      ? allLabel
      : value.length === 1
        ? value[0] === 'WITEL'
          ? witelLabel
          : value[0]
        : `${value.length} UIC dipilih`;

  const toggle = (v) => {
    const next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
    onChange(next);
  };
  const setMany = (vals, on) => {
    const next = on ? [...value, ...vals.filter((v) => !value.includes(v))] : value.filter((x) => !vals.includes(x));
    onChange(next);
  };
  const addCustom = (v) => {
    if (!value.includes(v)) onChange([...value, v]);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="min-w-[180px] flex items-center justify-between gap-2 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium cursor-pointer focus:outline-none focus:border-blue-500"
      >
        <span className="truncate">{label}</span>
        <ChevronRight size={13} className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-[340px] max-w-[92vw] overflow-hidden bg-white border border-slate-200 rounded-xl shadow-xl p-1">
            <div className="flex gap-1 p-1 border-b border-slate-100 mb-1">
              <button
                type="button"
                onClick={() => onChange([])}
                className={`flex-1 px-2 py-1.5 text-xs font-bold rounded-md cursor-pointer ${
                  value.length === 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {allLabel}
              </button>
              <button
                type="button"
                onClick={() => toggle('WITEL')}
                className={`flex-1 px-2 py-1.5 text-xs font-bold rounded-md cursor-pointer ${
                  value.includes('WITEL') ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {witelLabel}
              </button>
            </div>
            <UicTreeMenu
              mode="multi"
              selected={value}
              onToggle={toggle}
              onBulk={setMany}
              onAddCustom={addCustom}
              maxH="max-h-96"
            />
          </div>
        </>
      )}
    </div>
  );
}
