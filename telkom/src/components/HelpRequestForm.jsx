import { useState } from 'react';
import { Send } from 'lucide-react';
import { apiPost } from '../lib/api';

const EMPTY = { name: '', nip: '', contact: '', message: '' };

/** Form aduan lupa kata sandi untuk halaman login. Masuk ke kotak masuk Admin & Support. */
export default function HelpRequestForm() {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const valid = form.name.trim() && form.contact.trim() && form.message.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await apiPost('/auth/help-request', {
        name: form.name.trim(),
        nip: form.nip.trim() || null,
        contact: form.contact.trim(),
        message: form.message.trim(),
      });
      setResult({ tone: 'ok', text: res.message });
      setForm(EMPTY);
    } catch (err) {
      setResult({ tone: 'bad', text: err?.message || 'Aduan gagal dikirim. Coba lagi.' });
    } finally {
      setBusy(false);
    }
  };

  const input =
    'w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200';

  return (
    <form onSubmit={submit} className="space-y-3 mb-5">
      <p className="text-xs font-semibold text-slate-700">Ajukan aduan ke IT Support</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-[11px] font-semibold text-slate-600">
          Nama
          <input className={input} maxLength={100} value={form.name} onChange={set('name')} required />
        </label>
        <label className="text-[11px] font-semibold text-slate-600">
          NIP (opsional)
          <input className={input} maxLength={30} value={form.nip} onChange={set('nip')} />
        </label>
      </div>
      <label className="block text-[11px] font-semibold text-slate-600">
        Kontak (email / no. HP)
        <input className={input} maxLength={150} value={form.contact} onChange={set('contact')} required />
      </label>
      <label className="block text-[11px] font-semibold text-slate-600">
        Pesan
        <textarea className={`${input} min-h-20`} maxLength={1000} value={form.message} onChange={set('message')} required />
      </label>
      {result && (
        <p className={`text-xs font-medium ${result.tone === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>{result.text}</p>
      )}
      <button
        type="submit"
        disabled={!valid || busy}
        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1447B8] hover:bg-[#103a9a] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
      >
        <Send size={14} /> {busy ? 'Mengirim…' : 'Kirim aduan'}
      </button>
    </form>
  );
}
