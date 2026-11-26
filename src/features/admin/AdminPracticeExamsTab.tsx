import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase'

const sb = supabase!

const BLUE = '#0B6CB3';
const GREEN = '#198B48';

type Row = {
  attempt_id: string; exam_title: string; student_name: string | null; student_number: string | null;
  attempt_no: number; attempts_total: number; score: number; max_score: number; created_at: string;
};
type BankQ = { id: string; q_text: string; q_type: string; q_score: number };
const TYPE_LABEL: Record<string, string> = { mcq: 'اختيار', tf: 'صح/خطأ', essay: 'مقالي' };

export default function AdminPracticeExamsTab() {
  const [view, setView] = useState<'report' | 'new'>('report');
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState('');
  const [bank, setBank] = useState<BankQ[]>([]);
  const [picked, setPicked] = useState<string[]>([]); // الترتيب = ترتيب الاختيار
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadReport() {
    const { data } = await sb.rpc('practice_attempts_report');
    setRows((data as Row[]) ?? []);
  }
  useEffect(() => { loadReport(); }, []);
  useEffect(() => {
    if (view === 'new' && bank.length === 0)
      sb.rpc('list_question_bank').then(({ data }) => setBank((data as BankQ[]) ?? []));
  }, [view]);

  const shownRows = useMemo(() => rows.filter((r) =>
    `${r.student_name ?? ''} ${r.student_number ?? ''} ${r.exam_title}`.includes(filter)), [rows, filter]);
  const shownBank = useMemo(() => bank.filter((q) => q.q_text.includes(search)), [bank, search]);
  const maxScore = useMemo(() => picked.reduce((s, id) => s + Number(bank.find((q) => q.id === id)?.q_score ?? 1), 0), [picked, bank]);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function save() {
    if (!title.trim() || picked.length === 0) return setMsg('أدخل العنوان واختر سؤالاً واحداً على الأقل.');
    setSaving(true); setMsg('');
    const { data: exam, error } = await sb.from('practice_exams')
      .insert({ title: title.trim(), description: desc.trim() || null, max_score: maxScore })
      .select('id').single();
    if (error || !exam) { setSaving(false); return setMsg(error?.message ?? 'تعذر الحفظ'); }
    const links = picked.map((question_id, i) => ({ exam_id: exam.id, question_id, sort_order: i }));
    const { error: e2 } = await sb.from('practice_exam_questions').insert(links);
    setSaving(false);
    if (e2) return setMsg(e2.message);
    setTitle(''); setDesc(''); setPicked([]);
    setMsg('تم إنشاء الاختبار التدريبي ✓'); setView('report'); loadReport();
  }

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl p-4 text-white" style={{ background: BLUE }}>
        <h2 className="text-xl font-bold">الاختبارات التدريبية</h2>
        <div className="flex gap-2">
          <button onClick={() => setView('report')} className="rounded-lg px-3 py-1"
            style={{ background: view === 'report' ? '#fff' : 'transparent', color: view === 'report' ? BLUE : '#fff', border: '1px solid #fff' }}>
            تقرير المحاولات
          </button>
          <button onClick={() => setView('new')} className="rounded-lg px-3 py-1"
            style={{ background: view === 'new' ? '#fff' : GREEN, color: view === 'new' ? BLUE : '#fff' }}>
            + اختبار جديد
          </button>
        </div>
      </div>
      {msg && <p className="rounded bg-gray-100 p-2 text-sm">{msg}</p>}

      {view === 'report' && (
        <>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="بحث بالاسم أو الرقم أو الاختبار"
            className="w-full rounded-lg border p-2" />
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-right text-sm">
              <thead style={{ background: BLUE, color: '#fff' }}>
                <tr>
                  {['اسم الطالب', 'رقمه', 'الاختبار', 'المحاولة', 'الدرجة', 'التاريخ'].map((h) => (
                    <th key={h} className="p-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shownRows.map((r) => (
                  <tr key={r.attempt_id} className="border-t">
                    <td className="p-2">{r.student_name ?? '—'}</td>
                    <td className="p-2">{r.student_number ?? '—'}</td>
                    <td className="p-2">{r.exam_title}</td>
                    <td className="p-2">{r.attempt_no} من {r.attempts_total}</td>
                    <td className="p-2 font-bold" style={{ color: GREEN }}>{r.score} / {r.max_score}</td>
                    <td className="p-2">{new Date(r.created_at).toLocaleString('ar-EG')}</td>
                  </tr>
                ))}
                {shownRows.length === 0 && (
                  <tr><td colSpan={6} className="p-4 text-center text-gray-500">لا توجد محاولات.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === 'new' && (
        <div className="space-y-3 rounded-xl border bg-white p-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الاختبار"
            className="w-full rounded-lg border p-2" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="وصف (اختياري)"
            className="w-full rounded-lg border p-2" rows={2} />
          <p className="text-sm">الدرجة العظمى (مجموع درجات الأسئلة المختارة): <b>{maxScore}</b></p>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث في بنك الأسئلة"
            className="w-full rounded-lg border p-2" />
          <p className="text-sm" style={{ color: GREEN }}>المختار: {picked.length} سؤال</p>
          <div className="max-h-96 overflow-y-auto rounded-lg border">
            {shownBank.map((q) => (
              <label key={q.id} className="flex cursor-pointer items-start gap-2 border-b p-2 hover:bg-gray-50">
                <input type="checkbox" checked={picked.includes(q.id)} onChange={() => toggle(q.id)}
                  style={{ accentColor: BLUE }} className="mt-1" />
                <span className="flex-1 text-sm">{q.q_text}</span>
                <span className="rounded px-2 text-xs text-white" style={{ background: BLUE }}>
                  {TYPE_LABEL[q.q_type] ?? q.q_type}
                </span>
              </label>
            ))}
          </div>
          <button disabled={saving} onClick={save} className="rounded-lg px-6 py-2 text-white" style={{ background: GREEN }}>
            {saving ? 'جارٍ الحفظ...' : 'حفظ الاختبار'}
          </button>
        </div>
      )}
    </div>
  );
}
