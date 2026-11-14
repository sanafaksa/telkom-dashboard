import { forwardRef, useRef } from 'react';
import {
  Bold,
  Code,
  Heading2,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  RemoveFormatting,
  Strikethrough,
  Underline
} from 'lucide-react';

/*
 * Format teks disimpan sebagai penanda biasa supaya tetap muat di database:
 *   **tebal**  *miring*  __garis bawah__  ~~coret~~  ==sorot==  `kode`
 *   ## judul   > kutipan   • poin   1. poin   ☐ centang   ---  garis pemisah
 *   Indentasi: 2 spasi di awal baris per level.
 * RichText merender penanda itu sebagai React element (tanpa HTML mentah, jadi aman).
 */

const BULLET = '• ';
const CHECK_OFF = '☐ ';
const CHECK_ON = '☑ ';
const HEADING = '## ';
const QUOTE = '> ';
const DIVIDER = '---';
const NUMBER_RE = /^\d+\. /;
const LINE_RE = /^( *)((?:## |> |• |☐ |☑ |\d+\. )?)(.*)$/;

const INLINE = {
  bold: '**',
  italic: '*',
  underline: '__',
  strike: '~~',
  highlight: '==',
  code: '`'
};

const parseLine = (line) => {
  const m = line.match(LINE_RE);
  return { indent: m[1], block: m[2], rest: m[3] };
};

/* ---------- Transformasi teks (murni, tanpa DOM) ---------- */

function toggleInline(value, s, e, m) {
  // Sudah dibungkus persis di luar seleksi -> lepas
  const before = value.slice(Math.max(0, s - m.length), s);
  const after = value.slice(e, e + m.length);
  if (s >= m.length && before === m && after === m) {
    return {
      value: value.slice(0, s - m.length) + value.slice(s, e) + value.slice(e + m.length),
      start: s - m.length,
      end: e - m.length
    };
  }
  // Seleksi itu sendiri sudah dibungkus -> lepas
  const sel = value.slice(s, e);
  if (sel.length >= 2 * m.length && sel.startsWith(m) && sel.endsWith(m)) {
    const inner = sel.slice(m.length, -m.length);
    return { value: value.slice(0, s) + inner + value.slice(e), start: s, end: s + inner.length };
  }
  if (s === e) {
    return { value: value.slice(0, s) + m + m + value.slice(e), start: s + m.length, end: s + m.length };
  }
  return {
    value: value.slice(0, s) + m + sel + m + value.slice(e),
    start: s + m.length,
    end: e + m.length
  };
}

function lineRange(value, s, e) {
  const start = value.lastIndexOf('\n', s - 1) + 1;
  let end = value.indexOf('\n', e);
  if (end === -1) end = value.length;
  return { start, end };
}

function mapLines(value, s, e, fn) {
  const { start, end } = lineRange(value, s, e);
  const block = fn(value.slice(start, end).split('\n')).join('\n');
  return { value: value.slice(0, start) + block + value.slice(end), start, end: start + block.length };
}

const BLOCK_KINDS = {
  heading: { on: (b) => b === HEADING, make: () => HEADING },
  quote: { on: (b) => b === QUOTE, make: () => QUOTE },
  bullet: { on: (b) => b === BULLET, make: () => BULLET },
  number: { on: (b) => NUMBER_RE.test(b), make: (i) => `${i + 1}. ` },
  check: { on: (b) => b === CHECK_OFF || b === CHECK_ON, make: () => CHECK_OFF }
};

/** Terapkan / lepas jenis blok (judul, kutipan, daftar) pada baris yang dipilih. */
function toggleBlock(value, s, e, kind) {
  const spec = BLOCK_KINDS[kind];
  return mapLines(value, s, e, (lines) => {
    const parsed = lines.map(parseLine);
    const allOn = parsed.every((p) => spec.on(p.block));
    return parsed.map((p, i) => p.indent + (allOn ? '' : spec.make(i)) + p.rest);
  });
}

function changeIndent(value, s, e, delta) {
  return mapLines(value, s, e, (lines) =>
    lines.map((l) => (delta > 0 ? '  ' + l : l.replace(/^ {1,2}/, '')))
  );
}

const stripInline = (t) => t.replace(/\*\*|__|~~|==|`|\*/g, '');

function clearFormat(value, s, e) {
  return mapLines(value, s, e, (lines) =>
    lines.map((l) => {
      const p = parseLine(l);
      return p.indent + stripInline(p.rest);
    })
  );
}

function insertDivider(value, s, e) {
  const text = '\n' + DIVIDER + '\n';
  return { value: value.slice(0, s) + text + value.slice(e), start: s + text.length, end: s + text.length };
}

/** Shift+Enter di baris daftar/kutipan: sambung prefix otomatis. Null jika bukan baris bertanda. */
function continueList(value, caret) {
  const ls = value.lastIndexOf('\n', caret - 1) + 1;
  const p = parseLine(value.slice(ls, caret));

  let next = null;
  if (p.block === BULLET || p.block === CHECK_OFF || p.block === CHECK_ON || p.block === QUOTE) {
    next = p.block === CHECK_ON ? CHECK_OFF : p.block;
  } else if (NUMBER_RE.test(p.block)) {
    next = `${Number(p.block.match(/^\d+/)[0]) + 1}. `;
  }
  if (!next) return null;

  // Baris prefix tanpa isi: keluar dari daftar (prefix dihapus)
  if (p.rest.trim() === '') {
    return { value: value.slice(0, ls) + p.indent + value.slice(caret), caret: ls + p.indent.length };
  }
  const insert = '\n' + p.indent + next;
  return { value: value.slice(0, caret) + insert + value.slice(caret), caret: caret + insert.length };
}

/* ---------- Ribbon ---------- */

const GROUPS = [
  [
    { k: 'bold', t: 'Tebal (Ctrl+B)', I: Bold },
    { k: 'italic', t: 'Miring (Ctrl+I)', I: Italic },
    { k: 'underline', t: 'Garis bawah (Ctrl+U)', I: Underline },
    { k: 'strike', t: 'Coret', I: Strikethrough },
    { k: 'highlight', t: 'Sorot kuning', I: Highlighter },
    { k: 'code', t: 'Kode', I: Code }
  ],
  [
    { k: 'heading', t: 'Judul', I: Heading2 },
    { k: 'quote', t: 'Kutipan', I: Quote }
  ],
  [
    { k: 'bullet', t: 'Daftar poin', I: List },
    { k: 'number', t: 'Daftar bernomor', I: ListOrdered },
    { k: 'check', t: 'Daftar centang', I: ListChecks }
  ],
  [
    { k: 'outdent', t: 'Kurangi indentasi', I: IndentDecrease },
    { k: 'indent', t: 'Tambah indentasi', I: IndentIncrease }
  ],
  [
    { k: 'divider', t: 'Garis pemisah', I: Minus },
    { k: 'clear', t: 'Hapus format', I: RemoveFormatting }
  ]
];

/** Ribbon di atas textarea. Tombol tidak mengambil fokus dari textarea. */
export function RichToolbar({ onFormat }) {
  const btn =
    'size-7 shrink-0 grid place-items-center rounded-md text-slate-600 hover:bg-white hover:text-[#1447B8] cursor-pointer transition-colors';
  return (
    <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 rounded-t-xl bg-slate-100 border border-b-0 border-slate-300">
      {GROUPS.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <span className="w-px h-5 mx-1 bg-slate-300" aria-hidden />}
          {group.map(({ k, t, I }) => (
            <button
              key={k}
              type="button"
              title={t}
              aria-label={t}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onFormat(k)}
              className={btn}
            >
              <I size={14} />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Textarea dengan ribbon format. Props lain diteruskan ke <textarea>.
 * onChange tetap menerima event ({ target: { value } }) seperti textarea biasa.
 */
export const RichTextarea = forwardRef(function RichTextarea(
  { value, onChange, onKeyDown, className = '', ...rest },
  forwardedRef
) {
  const innerRef = useRef(null);

  const setRef = (el) => {
    innerRef.current = el;
    if (typeof forwardedRef === 'function') forwardedRef(el);
    else if (forwardedRef) forwardedRef.current = el;
  };

  const emit = (nextValue, selStart, selEnd) => {
    onChange({ target: { value: nextValue } });
    // Pulihkan seleksi setelah React merender ulang
    requestAnimationFrame(() => {
      const el = innerRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(selStart, selEnd);
      }
    });
  };

  const format = (kind) => {
    const el = innerRef.current;
    if (!el) return;
    const v = String(value ?? '');
    const s = el.selectionStart;
    const e = el.selectionEnd;

    let r;
    if (INLINE[kind]) r = toggleInline(v, s, e, INLINE[kind]);
    else if (BLOCK_KINDS[kind]) r = toggleBlock(v, s, e, kind);
    else if (kind === 'indent') r = changeIndent(v, s, e, +2);
    else if (kind === 'outdent') r = changeIndent(v, s, e, -2);
    else if (kind === 'divider') r = insertDivider(v, s, e);
    else if (kind === 'clear') r = { ...clearFormat(v, s, e), start: s, end: e };
    else return;

    emit(r.value, r.start, r.end);
  };

  const handleKeyDown = (e) => {
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && (key === 'b' || key === 'i' || key === 'u')) {
      e.preventDefault();
      format(key === 'b' ? 'bold' : key === 'i' ? 'italic' : 'underline');
      return;
    }
    if (e.key === 'Enter' && e.shiftKey && !e.nativeEvent.isComposing) {
      const el = innerRef.current;
      const v = String(value ?? '');
      const cont = el && el.selectionStart === el.selectionEnd ? continueList(v, el.selectionStart) : null;
      if (cont) {
        e.preventDefault();
        emit(cont.value, cont.caret, cont.caret);
        return;
      }
    }
    onKeyDown?.(e);
  };

  return (
    <div>
      <RichToolbar onFormat={format} />
      <textarea
        {...rest}
        ref={setRef}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        className={`${className} rounded-t-none`}
      />
    </div>
  );
});

/* ---------- Render ---------- */

const INLINE_SPLIT = /(\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|==[^=\n]+==|`[^`\n]+`|\*[^*\s][^*\n]*\*)/;

function renderToken(p, key) {
  if (p.startsWith('**')) return <strong key={key}>{p.slice(2, -2)}</strong>;
  if (p.startsWith('__')) return <u key={key}>{p.slice(2, -2)}</u>;
  if (p.startsWith('~~')) return <s key={key}>{p.slice(2, -2)}</s>;
  if (p.startsWith('==')) return <mark key={key} className="bg-yellow-200 rounded px-0.5">{p.slice(2, -2)}</mark>;
  if (p.startsWith('`')) return <code key={key} className="px-1 rounded bg-slate-100 font-mono text-[0.92em]">{p.slice(1, -1)}</code>;
  return <em key={key}>{p.slice(1, -1)}</em>;
}

function renderInline(text) {
  // Indeks genap = teks biasa, indeks ganjil = penanda yang cocok (aman, tidak bergantung isi)
  return String(text)
    .split(INLINE_SPLIT)
    .map((p, i) => (i % 2 === 0 ? <span key={i}>{p}</span> : renderToken(p, i)));
}

function renderLine(line, i) {
  const m = line.match(/^( *)(.*)$/);
  const level = Math.floor(m[1].length / 2);
  const pad = { paddingLeft: level * 16 };
  const content = m[2];

  if (content === DIVIDER) return <hr key={i} className="my-2 border-slate-300" />;
  if (content.startsWith(HEADING)) {
    return (
      <div key={i} style={pad} className="font-extrabold text-sm text-slate-900 mt-1">
        {renderInline(content.slice(HEADING.length))}
      </div>
    );
  }
  if (content.startsWith(QUOTE)) {
    return (
      <div key={i} style={pad} className="border-l-4 border-slate-300 pl-3 italic text-slate-600">
        {renderInline(content.slice(QUOTE.length))}
      </div>
    );
  }

  let lead = null;
  let body = content;
  if (content.startsWith(BULLET)) {
    lead = '•';
    body = content.slice(BULLET.length);
  } else if (content.startsWith(CHECK_OFF) || content.startsWith(CHECK_ON)) {
    lead = content.startsWith(CHECK_ON) ? '☑' : '☐';
    body = content.slice(2);
  } else {
    const num = content.match(/^(\d+)\. (.*)$/);
    if (num) {
      lead = `${num[1]}.`;
      body = num[2];
    }
  }

  if (lead === null) return <div key={i} style={pad}>{renderInline(content) || ' '}</div>;
  return (
    <div key={i} style={pad} className="flex gap-1.5">
      <span className="shrink-0">{lead}</span>
      <span>{renderInline(body)}</span>
    </div>
  );
}

/** Menampilkan teks yang berisi penanda format. */
export function RichText({ text, className = '' }) {
  if (!text) return null;
  return <div className={className}>{String(text).split('\n').map(renderLine)}</div>;
}
