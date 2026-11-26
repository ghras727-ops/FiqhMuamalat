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
type PExam = {
  id: string; title: string; description: string | null; max_score: number; is_published: boolean;
  practice_exam_questions: { count: number }[];
};
type PItem = {
  id: string; text: string; type: 'mcq' | 'tf' | 'essay'; options: { id: string; text: string }[];
  correct_option_id: string | null; correct_tf: boolean | null; model_answer: string | null;
};
const TYPE_LABEL: Record<string, string> = { mcq: 'اختيار', tf: 'صح/خطأ', essay: 'مقالي' };

export default function AdminPracticeExamsTab() {
  const [view, setView] = useState<'exams' | 'report' | 'new'>('exams');
  const [exams, setExams] = useState<PExam[]>([]);
  const [preview, setPreview] = useState<{ title: string; items: PItem[] } | null>(null);
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
  async function loadExams() {
    const { data } = await sb.from('practice_exams').select('*, practice_exam_questions(count)')
      .order('created_at', { ascending: false });
    setExams((data as PExam[]) ?? []);
  }
  async function setPublished(e: PExam, v: boolean) {
    const { error } = await sb.from('practice_exams').update({ is_published: v }).eq('id', e.id);
    if (error) return setMsg(error.message);
    setMsg(v ? 'تم نشر الاختبار للطلاب ✓' : 'تم إغلاق الاختبار عن الطلاب'); loadExams();
  }
  async function removeExam(e: PExam) {
    if (!window.confirm('حذف الاختبار «' + e.title + '» مع كل محاولات الطلاب فيه؟ لا يمكن التراجع.')) return;
    const { error } = await sb.from('practice_exams').delete().eq('id', e.id);
    if (error) return setMsg(error.message);
    loadExams(); loadReport();
  }
  async function openPreview(e: PExam) {
    const { data, error } = await sb.rpc('admin_preview_practice_exam', { p_exam_id: e.id });
    if (error) return setMsg(error.message);
    setPreview({ title: e.title, items: (data as PItem[]) ?? [] });
  }
  useEffect(() => { loadReport(); loadExams(); }, []);
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
      .insert({ title: title.trim(), description: desc.trim() || null, max_score: maxScore, is_published: false })
      .select('id').single();
    if (error || !exam) { setSaving(false); return setMsg(error?.message ?? 'تعذر الحفظ'); }
    const links = picked.map((question_id, i) => ({ exam_id: exam.id, question_id, sort_order: i }));
    const { error: e2 } = await sb.from('practice_exam_questions').insert(links);
    setSaving(false);
    if (e2) return setMsg(e2.message);
    setTitle(''); setDesc(''); setPicked([]);
    setMsg('تم إنشاء الاختبار كمسودة. استعرضه ثم انشره للطلاب ✓'); setView('exams'); loadExams();
  }

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl p-4 text-white" style={{ background: BLUE }}>
        <h2 className="text-xl font-bold">الاختبارات التدريبية</h2>
        <div className="flex gap-2">
          <button onClick={() => setView('exams')} className="rounded-lg px-3 py-1"
            style={{ background: view === 'exams' ? '#fff' : 'transparent', color: view === 'exams' ? BLUE : '#fff', border: '1px solid #fff' }}>
            الاختبارات
          </button>
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

      {view === 'exams' && (
        <div className="space-y-3">
          {exams.length === 0 && <p className="text-gray-500">لا توجد اختبارات تدريبية بعد.</p>}
          {exams.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
              <div>
                <h3 className="font-bold" style={{ color: BLUE }}>{e.title}</h3>
                <p className="text-sm text-gray-600">
                  {e.practice_exam_questions?.[0]?.count ?? 0} سؤال — الدرجة العظمى {e.max_score}
                </p>
                <span className="text-xs font-bold" style={{ color: e.is_published ? GREEN : '#b45309' }}>
                  {e.is_published ? '● متاح للطلاب' : '● مغلق (مسودة) — لا يراه الطلاب'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => openPreview(e)} className="rounded-lg border px-3 py-1"
                  style={{ borderColor: BLUE, color: BLUE }}>استعراض</button>
                <button onClick={() => setPublished(e, !e.is_published)} className="rounded-lg px-3 py-1 text-white"
                  style={{ background: e.is_published ? '#b45309' : GREEN }}>
                  {e.is_published ? 'إغلاق عن الطلاب' : 'نشر للطلاب'}
                </button>
                <button onClick={() => removeExam(e)} className="rounded-lg border border-red-600 px-3 py-1 text-red-600">حذف</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-3">
          <div dir="rtl" className="mx-auto max-w-3xl space-y-3 rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold" style={{ color: BLUE }}>استعراض: {preview.title}</h3>
              <button onClick={() => setPreview(null)} className="rounded-lg px-3 py-1 text-white" style={{ background: BLUE }}>إغلاق</button>
            </div>
            {preview.items.map((it, i) => (
              <div key={it.id} className="rounded-xl border p-3">
                <p className="mb-2 font-semibold whitespace-pre-wrap">{i + 1}. {it.text}</p>
                {it.type === 'mcq' && it.options.map((o) => (
                  <div key={o.id} className="my-1 rounded border px-2 py-1 text-sm"
                    style={o.id === it.correct_option_id ? { borderColor: GREEN, background: '#198B4815' } : {}}>
                    {o.id === it.correct_option_id ? '✓ ' : ''}{o.text}
                  </div>
                ))}
                {it.type === 'tf' && <p className="text-sm" style={{ color: GREEN }}>الصحيح: {it.correct_tf ? 'صح' : 'خطأ'}</p>}
                {it.model_answer && (
                  <p className="mt-2 whitespace-pre-wrap rounded bg-gray-50 p-2 text-sm">
                    <b style={{ color: BLUE }}>{it.type === 'essay' ? 'الإجابة النموذجية: ' : 'التوضيح: '}</b>{it.model_answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
