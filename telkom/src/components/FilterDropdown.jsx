import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function FilterDropdown({
  label,
  options = [],
  selected = [],
  onChange,
  multiColumn = false,
  isSort = false,
  className = ''
}) {
  const [open, setOpen] = useState(false);
  // Draft selections while popup is open
  const [draft, setDraft] = useState(selected);
  const ref = useRef(null);

  // Sync draft when opened or selected prop changes
  useEffect(() => {
    setDraft(selected);
  }, [selected, open]);

  // Close when clicking outside without applying
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const allSelected = options.length > 0 && draft.length === options.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setDraft([]);
    } else {
      setDraft([...options]);
    }
  };

  const toggleItem = (val) => {
    if (isSort) {
      setDraft([val]);
      return;
    }
    if (draft.includes(val)) {
      setDraft(draft.filter((item) => item !== val));
    } else {
      setDraft([...draft, val]);
    }
  };

  const handleApply = () => {
    onChange(draft);
    setOpen(false);
  };

  const handleCancel = () => {
    setDraft(selected);
    setOpen(false);
  };

  // Determine display text on trigger button
  const getDisplayText = () => {
    if (isSort) {
      return selected[0] || 'Sort by';
    }
    if (!selected || selected.length === 0 || selected.length === options.length) {
      return 'Semua';
    }
    if (selected.length === 1) {
      return selected[0];
    }
    return `${selected.length} dipilih`;
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <label className="block text-[11px] font-semibold text-slate-500 mb-1 truncate">
        {label}
      </label>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-white border border-slate-200/90 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 flex items-center justify-between gap-2 min-w-[120px] shadow-2xs transition-colors cursor-pointer h-[32px]"
      >
        <span className="truncate">{getDisplayText()}</span>
        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-slate-200/90 overflow-hidden min-w-[280px] max-w-[360px] animate-[fadeIn_0.15s_ease-out]">
          {/* Header Bar matching screenshot */}
          <div className="bg-[#2563EB] text-white px-3.5 py-2 font-semibold text-xs flex items-center justify-between">
            <span>{label}</span>
            {!isSort && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[11px] font-medium text-white/90 hover:text-white underline cursor-pointer"
              >
                {allSelected ? 'Batal Semua' : 'Pilih Semua'}
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            className={`p-3 max-h-60 overflow-y-auto ${
              multiColumn ? 'grid grid-cols-2 gap-x-3 gap-y-1.5' : 'space-y-1.5'
            }`}
          >
            {options.map((opt) => {
              const isChecked = draft.includes(opt);
              return (
                <label
                  key={opt}
                  className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-50 cursor-pointer text-xs text-slate-700 select-none group"
                >
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      toggleItem(opt);
                    }}
                    className={`size-4 rounded flex items-center justify-center transition-colors shrink-0 ${
                      isChecked
                        ? 'bg-[#2563EB] text-white'
                        : 'border border-slate-300 bg-white group-hover:border-blue-400'
                    }`}
                  >
                    {isChecked && <Check size={11} strokeWidth={3} />}
                  </div>
                  <span className="truncate font-medium">{opt}</span>
                </label>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="p-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={handleApply}
              className="bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs px-4 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              Terapkan
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-xs px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
