import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase'

const sb = supabase!

const BLUE = '#0B6CB3';
const GREEN = '#198B48';

type Opt = { id: string; text: string };
type Q = { id: string; text: string; type: 'mcq' | 'tf' | 'essay'; options: Opt[] };
type Item = Q & {
  chosen_option_id: string | null; text_answer: string | null; is_correct: boolean | null;
  awarded_score: number; correct_option_id: string | null; model_answer: string | null;
  correct_tf: boolean | null;
};
type Review = { score: number; max_score: number; items: Item[] };
type Exam = { id: string; title: string; description: string | null; max_score: number };
type Answers = Record<string, { option_id?: string; text_answer?: string }>;

export default function PracticeExamsTab() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [current, setCurrent] = useState<Record<string, string>>({}); // exam_id -> attempt_id
  const [active, setActive] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadList() {
    const { data: ex } = await sb.from('practice_exams').select('*')
      .eq('is_published', true).order('created_at', { ascending: false });
    setExams((ex as Exam[]) ?? []);
    const { data: at } = await sb.from('practice_attempts').select('id, exam_id')
      .eq('is_current', true);
    const map: Record<string, string> = {};
    (at ?? []).forEach((a: any) => { map[a.exam_id] = a.id; });
    setCurrent(map);
  }
  useEffect(() => { loadList(); }, []);

  async function loadQuestions(exam: Exam) {
    const { data, error } = await sb.rpc('get_practice_exam_questions', { p_exam_id: exam.id });
    if (error) return setError(error.message);
    setQuestions(data as Q[]); setAnswers({}); setReview(null);
  }
  async function loadReview(attemptId: string) {
    const { data, error } = await sb.rpc('get_practice_review', { p_attempt_id: attemptId });
    if (error) return setError(error.message);
    setReview(data as Review); setQuestions(null);
  }

  async function open(exam: Exam) {
    setError(''); setActive(exam); setBusy(true);
    if (current[exam.id]) await loadReview(current[exam.id]); else await loadQuestions(exam);
    setBusy(false);
  }
  async function submit() {
    if (!active) return;
    setBusy(true); setError('');
    const payload = Object.entries(answers).map(([question_id, v]) => ({ question_id, ...v }));
    const { data, error } = await sb.rpc('submit_practice_attempt', { p_exam_id: active.id, p_answers: payload });
    if (error) { setError(error.message); setBusy(false); return; }
    setCurrent((c) => ({ ...c, [active.id]: data as string }));
    await loadReview(data as string);
    setBusy(false);
  }
  async function retake() {
    if (!active) return;
    if (!confirm('سيتم مسح محاولتك السابقة والبدء من جديد. هل أنت متأكد؟')) return;
    setBusy(true);
    await sb.rpc('retake_practice_exam', { p_exam_id: active.id });
    setCurrent((c) => { const n = { ...c }; delete n[active.id]; return n; });
    await loadQuestions(active);
    setBusy(false);
  }
  function back() { setActive(null); setQuestions(null); setReview(null); loadList(); }

  const setOpt = (qid: string, oid: string) => setAnswers((a) => ({ ...a, [qid]: { option_id: oid } }));
  const setTxt = (qid: string, t: string) => setAnswers((a) => ({ ...a, [qid]: { text_answer: t } }));

  // ---------- القائمة ----------
  if (!active) {
    return (
      <div dir="rtl" className="space-y-4">
        <div className="rounded-xl p-4 text-white" style={{ background: BLUE }}>
          <h2 className="text-xl font-bold">الاختبارات التدريبية</h2>
          <p className="text-sm opacity-90">للمراجعة الشخصية فقط — لا تدخل في تقييمك الرسمي ولا في «درجاتي».</p>
        </div>
        {exams.length === 0 && <p className="text-gray-500">لا توجد اختبارات تدريبية متاحة حالياً.</p>}
        {exams.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
            <div>
              <h3 className="font-bold" style={{ color: BLUE }}>{e.title}</h3>
              {e.description && <p className="text-sm text-gray-600">{e.description}</p>}
              {current[e.id] && <span className="text-xs font-medium" style={{ color: GREEN }}>✓ لديك محاولة سابقة</span>}
            </div>
            <button onClick={() => open(e)} className="rounded-lg px-4 py-2 text-white"
              style={{ background: current[e.id] ? GREEN : BLUE }}>
              {current[e.id] ? 'استعراض النتيجة' : 'ابدأ'}
            </button>
          </div>
        ))}
      </div>
    );
  }

  // ---------- الشاشة المشتركة ----------
  return (
    <div dir="rtl" className="space-y-4">
      <button onClick={back} className="text-sm underline" style={{ color: BLUE }}>← رجوع للقائمة</button>
      <h2 className="text-xl font-bold" style={{ color: BLUE }}>{active.title}</h2>
      {error && <p className="rounded bg-red-50 p-2 text-red-700">{error}</p>}
      {busy && <p className="text-gray-500">جارٍ التحميل...</p>}

      {/* ---------- الأسئلة ---------- */}
      {questions && (
        <>
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border bg-white p-4">
              <p className="mb-3 font-semibold whitespace-pre-wrap">{i + 1}. {q.text}</p>
              {q.type === 'essay' ? (
                <textarea rows={5} className="w-full rounded-lg border p-2" placeholder="اكتب إجابتك للتدرب (لا تُحتسب درجتها)"
                  value={answers[q.id]?.text_answer ?? ''} onChange={(e) => setTxt(q.id, e.target.value)} />
              ) : q.type === 'tf' ? (
                ([['true', 'صح'], ['false', 'خطأ']] as const).map(([v, l]) => (
                  <label key={v} className="flex cursor-pointer items-center gap-2 py-1">
                    <input type="radio" name={q.id} checked={answers[q.id]?.text_answer === v}
                      onChange={() => setTxt(q.id, v)} style={{ accentColor: BLUE }} />
                    <span>{l}</span>
                  </label>
                ))
              ) : (
                q.options.map((o) => (
                  <label key={o.id} className="flex cursor-pointer items-center gap-2 py-1">
                    <input type="radio" name={q.id} checked={answers[q.id]?.option_id === o.id}
                      onChange={() => setOpt(q.id, o.id)} style={{ accentColor: BLUE }} />
                    <span>{o.text}</span>
                  </label>
                ))
              )}
            </div>
          ))}
          <button disabled={busy} onClick={submit} className="rounded-lg px-6 py-2 text-white" style={{ background: GREEN }}>
            تسليم الإجابات
          </button>
        </>
      )}

      {/* ---------- النتيجة والمراجعة ---------- */}
      {review && (
        <>
          <div className="rounded-xl p-4 text-white" style={{ background: GREEN }}>
            <p className="text-lg font-bold">نتيجتك التدريبية: {review.score} من {review.max_score}</p>
            <p className="text-sm opacity-90">الأسئلة المقالية للمراجعة فقط ولا تُحتسب درجتها.</p>
          </div>
          {review.items.map((it, i) => (
            <div key={it.id} className="rounded-xl border bg-white p-4">
              <p className="mb-3 font-semibold whitespace-pre-wrap">{i + 1}. {it.text}</p>
              {it.type === 'essay' ? (
                <>
                  <p className="text-sm text-gray-500">إجابتك:</p>
                  <p className="mb-2 whitespace-pre-wrap rounded bg-gray-50 p-2">{it.text_answer || '— لم تجب —'}</p>
                  <p className="text-sm font-bold" style={{ color: GREEN }}>الإجابة النموذجية:</p>
                  <p className="whitespace-pre-wrap rounded border p-2" style={{ borderColor: GREEN }}>{it.model_answer || '—'}</p>
                </>
              ) : it.type === 'tf' ? (
                <>
                  {([['true', 'صح'], ['false', 'خطأ']] as const).map(([v, l]) => {
                    const right = String(it.correct_tf) === v;
                    const wrong = it.text_answer === v && !right;
                    return (
                      <div key={v} className="my-1 rounded-lg border px-3 py-1"
                        style={right ? { borderColor: GREEN, background: '#198B4815' }
                          : wrong ? { borderColor: '#dc2626', background: '#dc262615' } : {}}>
                        {right ? '✓ ' : wrong ? '✗ ' : ''}{l}
                        {it.text_answer === v && <span className="text-xs text-gray-500"> (إجابتك)</span>}
                      </div>
                    );
                  })}
                  {it.model_answer && <p className="mt-2 text-sm" style={{ color: BLUE }}>التوضيح: {it.model_answer}</p>}
                </>
              ) : (
                <>
                  {it.options.map((o) => {
                    const right = o.id === it.correct_option_id;
                    const wrong = o.id === it.chosen_option_id && !right;
                    return (
                      <div key={o.id} className="my-1 rounded-lg border px-3 py-1"
                        style={right ? { borderColor: GREEN, background: '#198B4815' }
                          : wrong ? { borderColor: '#dc2626', background: '#dc262615' } : {}}>
                        {right ? '✓ ' : wrong ? '✗ ' : ''}{o.text}
                        {o.id === it.chosen_option_id && <span className="text-xs text-gray-500"> (إجابتك)</span>}
                      </div>
                    );
                  })}
                  {it.model_answer && (
                    <p className="mt-2 text-sm" style={{ color: BLUE }}>التوضيح: {it.model_answer}</p>
                  )}
                </>
              )}
            </div>
          ))}
          <button disabled={busy} onClick={retake} className="rounded-lg px-6 py-2 text-white" style={{ background: BLUE }}>
            إعادة المحاولة
          </button>
        </>
      )}
    </div>
  );
}
