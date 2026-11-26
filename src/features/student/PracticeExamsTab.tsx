import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase'

const sb = supabase!

const BLUE = '#0B6CB3';
const GREEN = '#198B48';
const AMBER = '#b45309';
const RED = '#dc2626';
const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ'];

type Opt = { id: string; text: string };
type Q = { id: string; text: string; type: 'mcq' | 'tf' | 'essay'; options: Opt[]; hints?: string[] | null };
type Item = Q & {
  chosen_option_id: string | null; text_answer: string | null; is_correct: boolean | null;
  awarded_score: number; correct_option_id: string | null; correct_tf: boolean | null; model_answer: string | null;
};
type Review = { score: number; max_score: number; attempt_no: number; items: Item[] };
type Exam = { id: string; title: string; description: string | null; max_score: number };
type Ans = { option_id?: string; text_answer?: string };
type Answers = Record<string, Ans>;
type CurAttempt = { id: string; score: number };

/* ---------- أدوات تقدير تغطية الإجابة المقالية (تقريبي) ---------- */
const norm = (s: string) =>
  s.replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[^\u0621-\u064Aa-zA-Z0-9\s]/g, ' ').toLowerCase();
const stem = (w: string) => w.replace(/^(وال|بال|فال|كال|لل|ال)/, '');
const STOP = new Set(
  ['من', 'في', 'على', 'الي', 'عن', 'ان', 'او', 'ما', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي', 'لان', 'كان', 'كل', 'مع',
    'بعد', 'قبل', 'لا', 'اي', 'ثم', 'قد', 'هو', 'هي', 'بين', 'عند', 'حتي', 'كما', 'اذا', 'لم', 'ولا', 'وهو', 'وهي',
    'الذين', 'دون', 'غير', 'فيه', 'منه', 'له', 'لها', 'به', 'بها', 'انه', 'انها', 'تكون', 'يكون', 'ذلك', 'مثل'].map(norm),
);
const elements = (model: string) =>
  model.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('المرجع'));
const reference = (model: string) => {
  const l = model.split('\n').find((x) => x.trim().startsWith('المرجع'));
  return l ? l.replace(/^\s*المرجع:?\s*/, '').trim() : '';
};
const keywords = (line: string) =>
  Array.from(new Set(norm(line).split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w)).map(stem).filter((w) => w.length >= 3)));
function covered(line: string, answer: string) {
  const kw = keywords(line);
  if (!kw.length || !answer.trim()) return false;
  const aw = norm(answer).split(/\s+/).map(stem);
  const hits = kw.filter((k) => aw.some((w) => w === k || (k.length >= 4 && w.length >= 4 && (w.startsWith(k) || k.startsWith(w)))));
  return hits.length / kw.length >= 0.35;
}
const hintOf = (l: string) => l.split(/\s+/).slice(0, 3).join(' ') + ' …';
const isAnswered = (q: Q, a?: Ans) => (q.type === 'mcq' ? !!a?.option_id : !!a?.text_answer?.trim());

function progressMsg(done: number, total: number) {
  const p = total ? (done / total) * 100 : 0;
  if (done === 0) return 'ابدأ بثقة 🌱 لا درجات رسمية هنا، الهدف أن تتعلم';
  if (p >= 100) return 'أنجزت جميع الأسئلة 🎉 راجع إجاباتك ثم سلّم';
  if (p >= 75) return 'اقتربت من خط النهاية 🔥 دقائق وتنتهي';
  if (p >= 50) return 'وصلت إلى النصف 💪 استمر، أنت تبلي بلاءً حسناً';
  if (p >= 25) return 'بداية موفقة 👏 واصل التقدم';
  return 'خطوات ثابتة تصنع الإتقان ✨';
}
function resultMsg(p: number) {
  if (p >= 90) return { icon: '🏆', t: 'ممتاز! أنت متمكن من هذه المادة', s: 'استمر على هذا المستوى وجرّب المقالي بلا تلميحات.' };
  if (p >= 75) return { icon: '🌟', t: 'جيد جداً! أنت قريب من الإتقان', s: 'مراجعة سريعة للمواضع أدناه وتبلغ القمة.' };
  if (p >= 60) return { icon: '👍', t: 'جيد، وبقليل من المراجعة تتفوق', s: 'راجع المواضع الموضحة في المقرر ثم أعد المحاولة.' };
  if (p >= 40) return { icon: '💪', t: 'بداية طيبة، والطريق واضح أمامك', s: 'اقرأ التوضيح تحت كل سؤال ثم أعد المحاولة، وسترى الفرق.' };
  return { icon: '🌱', t: 'لا بأس! الاختبار وُضع لتتعلم منه', s: 'ابدأ بقراءة المراجع المذكورة ثم أعد المحاولة، فكل محاولة تقرّبك.' };
}

/* ---------- مراجعة السؤال المقالي مع المساعدة المتدرجة ---------- */
function EssayReview({ item, level }: { item: Item; level: number }) {
  const model = item.model_answer ?? '';
  const els = useMemo(() => elements(model), [model]);
  const ref = reference(model);
  const answer = item.text_answer ?? '';
  const cov = els.map((l) => covered(l, answer));
  const covCount = cov.filter(Boolean).length;
  const pct = els.length ? Math.round((covCount / els.length) * 100) : 0;
  const shown = level >= 3 ? els.length : level === 2 ? Math.ceil(els.length / 2) : 0;
  const peekTotal = level === 1 ? 10 : 20;
  const [peek, setPeek] = useState(0);
  useEffect(() => {
    if (peek <= 0) return;
    const t = setTimeout(() => setPeek((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [peek]);
  const open = peek > 0;
  const note = level >= 3 ? 'في المحاولة الثالثة وما بعدها تظهر الإجابة النموذجية كاملة.'
    : level === 2 ? 'في محاولتك الثانية كشفنا لك نصف الإجابة النموذجية، وسيظهر الباقي في المحاولة الثالثة.'
      : 'في محاولتك الأولى نعطيك عناصر الإجابة بتلميحات قصيرة، ويزداد الكشف مع كل محاولة.';
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-gray-50 p-3">
        <p className="mb-1 text-xs font-bold text-gray-500">إجابتك</p>
        <p className="whitespace-pre-wrap text-sm">{answer.trim() || '— لم تكتب إجابة —'}</p>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-bold">
          <span style={{ color: BLUE }}>عناصر الإجابة المطلوبة: غطّيت {covCount} من {els.length}</span>
          <span style={{ color: pct >= 60 ? GREEN : AMBER }}>{pct}% (تقدير تقريبي)</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: pct + '%', background: pct >= 60 ? GREEN : AMBER }} />
        </div>
      </div>
      <ul className="space-y-2">
        {els.map((l, i) => {
          const full = i < shown || open;
          return (
            <li key={i} className="flex gap-2 rounded-lg border p-2 text-sm"
              style={{ borderColor: cov[i] ? GREEN : '#e5e7eb', background: cov[i] ? '#198B4812' : '#fff' }}>
              <span className="mt-0.5 font-bold" style={{ color: cov[i] ? GREEN : AMBER }}>{cov[i] ? '✓' : '○'}</span>
              <span className="flex-1 whitespace-pre-wrap">
                {full ? l : <span className="text-gray-500">🔒 {hintOf(l)}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {level < 3 && (
        <div className="space-y-1">
          <button onClick={() => setPeek(peekTotal)} disabled={open} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            style={{ background: BLUE }}>
            {open ? `👁 تختفي بعد ${peek} ث` : `👁 إطلالة سريعة على الإجابة النموذجية (${peekTotal} ث)`}
          </button>
          {open && (
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full" style={{ width: (peek / peekTotal) * 100 + '%', background: AMBER, transition: 'width 1s linear' }} />
            </div>
          )}
        </div>
      )}
      <p className="text-xs text-gray-500">{note} (التغطية تقدير آلي بالكلمات المفتاحية؛ قارن إجابتك بالنموذج بنفسك.)</p>
      {ref && <p className="rounded-lg p-2 text-sm font-semibold" style={{ background: '#0B6CB314', color: BLUE }}>📖 المرجع: {ref}</p>}
    </div>
  );
}

export default function PracticeExamsTab() {
  const [phase, setPhase] = useState<'list' | 'taking' | 'report'>('list');
  const [exams, setExams] = useState<Exam[]>([]);
  const [current, setCurrent] = useState<Record<string, CurAttempt>>({});
  const [active, setActive] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [idx, setIdx] = useState(0);
  const [hintOpen, setHintOpen] = useState<Record<string, boolean>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'wrong' | 'essay'>('all');
  const [ringPct, setRingPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const startedAt = useRef(0);

  async function loadList() {
    const { data: ex } = await sb.from('practice_exams').select('*').eq('is_published', true)
      .order('created_at', { ascending: false });
    setExams((ex as Exam[]) ?? []);
    const { data: at } = await sb.from('practice_attempts').select('id, exam_id, score').eq('is_current', true);
    const map: Record<string, CurAttempt> = {};
    (at ?? []).forEach((a: { id: string; exam_id: string; score: number }) => { map[a.exam_id] = { id: a.id, score: a.score }; });
    setCurrent(map);
  }
  useEffect(() => { loadList(); }, []);

  const draftKey = (id: string) => 'pe_draft_' + id;
  useEffect(() => {
    if (phase !== 'taking' || !active) return;
    try { localStorage.setItem(draftKey(active.id), JSON.stringify(answers)); } catch { /* ignore */ }
  }, [answers, phase, active]);

  async function start(exam: Exam) {
    setBusy(true); setError('');
    const { data, error: e } = await sb.rpc('get_practice_exam_questions', { p_exam_id: exam.id });
    setBusy(false);
    if (e) return setError(e.message);
    let saved: Answers = {};
    try { saved = JSON.parse(localStorage.getItem(draftKey(exam.id)) ?? '{}') as Answers; } catch { saved = {}; }
    setActive(exam); setQuestions((data as Q[]) ?? []); setAnswers(saved); setIdx(0);
    setHintOpen({}); setReview(null); setPhase('taking'); startedAt.current = Date.now();
  }
  async function showReport(attemptId: string, exam: Exam, secs: number | null) {
    setBusy(true); setError('');
    const { data, error: e } = await sb.rpc('get_practice_review', { p_attempt_id: attemptId });
    setBusy(false);
    if (e) return setError(e.message);
    setActive(exam); setReview(data as Review); setElapsed(secs); setFilter('all'); setPhase('report');
  }
  async function open(exam: Exam) {
    const cur = current[exam.id];
    if (cur) await showReport(cur.id, exam, null); else await start(exam);
  }
  async function doSubmit() {
    if (!active) return;
    setConfirmOpen(false); setBusy(true); setError('');
    const payload = Object.entries(answers).map(([question_id, v]) => ({ question_id, ...v }));
    const { data, error: e } = await sb.rpc('submit_practice_attempt', { p_exam_id: active.id, p_answers: payload });
    if (e) { setBusy(false); return setError(e.message); }
    try { localStorage.removeItem(draftKey(active.id)); } catch { /* ignore */ }
    const secs = Math.round((Date.now() - startedAt.current) / 1000);
    await showReport(data as string, active, secs);
    setBusy(false);
  }
  async function retake() {
    if (!active) return;
    if (!window.confirm('ستبدأ محاولة جديدة وتختفي نتيجتك الحالية من شاشتك. هل أنت متأكد؟')) return;
    setBusy(true);
    await sb.rpc('retake_practice_exam', { p_exam_id: active.id });
    setCurrent((c) => { const n = { ...c }; delete n[active.id]; return n; });
    setBusy(false);
    await start(active);
  }
  function back() { setPhase('list'); setActive(null); setReview(null); loadList(); }

  const setOpt = (qid: string, oid: string) => setAnswers((a) => ({ ...a, [qid]: { option_id: oid } }));
  const setTxt = (qid: string, t: string) => setAnswers((a) => ({ ...a, [qid]: { text_answer: t } }));

  const answeredCount = questions.filter((q) => isAnswered(q, answers[q.id])).length;
  const unanswered = questions.map((q, i) => ({ q, i })).filter(({ q }) => !isAnswered(q, answers[q.id]));

  const pct = review && review.max_score > 0 ? Math.min(100, Math.round((review.score / review.max_score) * 100)) : 0;
  useEffect(() => {
    if (phase !== 'report' || !review) return;
    setRingPct(0);
    const t = setTimeout(() => setRingPct(pct), 200);
    return () => clearTimeout(t);
  }, [phase, review, pct]);

  const stats = useMemo(() => {
    if (!review) return null;
    const obj = review.items.filter((i) => i.type !== 'essay');
    const un = obj.filter((i) => (i.type === 'tf' ? !i.text_answer : !i.chosen_option_id)).length;
    const ok = obj.filter((i) => i.is_correct === true).length;
    const essays = review.items.filter((i) => i.type === 'essay');
    let eCov = 0; let eTot = 0;
    essays.forEach((e) => {
      const els = elements(e.model_answer ?? '');
      eTot += els.length;
      eCov += els.filter((l) => covered(l, e.text_answer ?? '')).length;
    });
    const refs = new Set<string>();
    obj.filter((i) => i.is_correct !== true).forEach((i) => {
      const r = (i.model_answer ?? '').split(':')[0].trim();
      if (r.startsWith('الدرس')) refs.add(r);
    });
    return { total: obj.length, ok, wrong: obj.length - ok - un, un, essays: essays.length, eCov, eTot, refs: Array.from(refs) };
  }, [review]);

  const shell = 'mx-auto max-w-3xl space-y-4';

  /* ================= القائمة ================= */
  if (phase === 'list') {
    return (
      <div dir="rtl" className={shell}>
        <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, ${GREEN})` }}>
          <h2 className="text-2xl font-bold">🎯 الاختبارات التدريبية</h2>
          <p className="mt-1 text-sm opacity-90">تدرّب بحرية على أسئلة الاختبارات السابقة. لا تدخل في تقييمك الرسمي ولا في «درجاتي»، وهدفها أن تتعلم وتتقن.</p>
        </div>
        {error && <p className="rounded bg-red-50 p-2 text-red-700">{error}</p>}
        {exams.length === 0 && <p className="rounded-xl border bg-white p-6 text-center text-gray-500">لا توجد اختبارات تدريبية متاحة الآن.</p>}
        {exams.map((e) => {
          const cur = current[e.id];
          const p = cur && e.max_score > 0 ? Math.round((cur.score / e.max_score) * 100) : null;
          return (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold" style={{ color: BLUE }}>{e.title}</h3>
                {e.description && <p className="mt-1 text-sm text-gray-600">{e.description}</p>}
                {cur && p !== null && (
                  <span className="mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-bold text-white" style={{ background: p >= 60 ? GREEN : AMBER }}>
                    آخر نتيجة: {cur.score} / {e.max_score} ({p}%)
                  </span>
                )}
              </div>
              <button disabled={busy} onClick={() => open(e)} className="rounded-xl px-5 py-2 font-bold text-white disabled:opacity-60"
                style={{ background: cur ? GREEN : BLUE }}>
                {cur ? 'استعراض نتيجتي' : 'ابدأ الاختبار ←'}
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  /* ================= الاختبار ================= */
  if (phase === 'taking' && active) {
    const q = questions[idx];
    const donePct = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
    return (
      <div dir="rtl" className={shell}>
        <div className="sticky top-0 z-10 space-y-2 rounded-2xl border bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <button onClick={back} className="text-sm underline" style={{ color: BLUE }}>← خروج (تُحفظ إجاباتك)</button>
            <span className="text-sm font-bold" style={{ color: GREEN }}>{answeredCount} / {questions.length} ({donePct}%)</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: donePct + '%', background: `linear-gradient(90deg, ${BLUE}, ${GREEN})` }} />
          </div>
          <p className="text-center text-sm font-semibold" style={{ color: BLUE }}>{progressMsg(answeredCount, questions.length)}</p>
        </div>

        {error && <p className="rounded bg-red-50 p-2 text-red-700">{error}</p>}

        {q && (
          <div className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: BLUE }}>السؤال {idx + 1} من {questions.length}</span>
              <span className="text-xs text-gray-500">{q.type === 'essay' ? 'مقالي (للتدرب)' : q.type === 'tf' ? 'صح / خطأ' : 'اختيار من متعدد'}</span>
            </div>
            <p className="whitespace-pre-wrap text-lg font-semibold leading-8">{q.text}</p>

            {q.type === 'mcq' && (
              <div className="space-y-2">
                {q.options.map((o, k) => {
                  const sel = answers[q.id]?.option_id === o.id;
                  return (
                    <button key={o.id} onClick={() => setOpt(q.id, o.id)}
                      className="flex w-full items-center gap-3 rounded-xl border-2 p-3 text-right transition"
                      style={{ borderColor: sel ? BLUE : '#e5e7eb', background: sel ? '#0B6CB30F' : '#fff' }}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                        style={{ background: sel ? BLUE : '#f3f4f6', color: sel ? '#fff' : '#374151' }}>{LETTERS[k] ?? k + 1}</span>
                      <span>{o.text}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === 'tf' && (
              <div className="grid grid-cols-2 gap-3">
                {([['true', '✓ صح'], ['false', '✗ خطأ']] as const).map(([v, l]) => {
                  const sel = answers[q.id]?.text_answer === v;
                  return (
                    <button key={v} onClick={() => setTxt(q.id, v)} className="rounded-xl border-2 p-4 text-lg font-bold transition"
                      style={{ borderColor: sel ? BLUE : '#e5e7eb', background: sel ? BLUE : '#fff', color: sel ? '#fff' : '#374151' }}>{l}</button>
                  );
                })}
              </div>
            )}

            {q.type === 'essay' && (
              <div className="space-y-2">
                <textarea rows={7} className="w-full rounded-xl border-2 p-3 focus:outline-none" style={{ borderColor: '#e5e7eb' }}
                  placeholder="اكتب إجابتك بأسلوبك... سنساعدك بعد التسليم في معرفة ما غطّيته وما فاتك."
                  value={answers[q.id]?.text_answer ?? ''} onChange={(e) => setTxt(q.id, e.target.value)} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">{(answers[q.id]?.text_answer ?? '').trim().split(/\s+/).filter(Boolean).length} كلمة</span>
                  {(q.hints?.length ?? 0) > 0 && (
                    <button onClick={() => setHintOpen((h) => ({ ...h, [q.id]: !h[q.id] }))} className="rounded-lg border px-3 py-1 text-sm font-bold"
                      style={{ borderColor: AMBER, color: AMBER }}>💡 {hintOpen[q.id] ? 'إخفاء التلميح' : 'أعطني تلميحاً'}</button>
                  )}
                </div>
                {hintOpen[q.id] && (
                  <div className="rounded-xl p-3 text-sm" style={{ background: '#fef3c7', color: '#78350f' }}>
                    <p className="mb-1 font-bold">إجابتك الكاملة تتضمن {q.hints?.length} عناصر، تبدأ بـ:</p>
                    <ol className="list-decimal space-y-0.5 pr-5">{q.hints?.map((h, i) => <li key={i}>{h} …</li>)}</ol>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <button disabled={idx === 0} onClick={() => setIdx(idx - 1)} className="rounded-xl border px-4 py-2 font-bold disabled:opacity-40" style={{ borderColor: BLUE, color: BLUE }}>→ السابق</button>
          {idx < questions.length - 1
            ? <button onClick={() => setIdx(idx + 1)} className="rounded-xl px-5 py-2 font-bold text-white" style={{ background: BLUE }}>التالي ←</button>
            : <button onClick={() => setConfirmOpen(true)} className="rounded-xl px-5 py-2 font-bold text-white" style={{ background: GREEN }}>تسليم الإجابات ✔</button>}
        </div>

        <div className="rounded-2xl border bg-white p-3">
          <p className="mb-2 text-xs font-bold text-gray-500">تنقّل بين الأسئلة</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((qq, i) => {
              const done = isAnswered(qq, answers[qq.id]);
              return (
                <button key={qq.id} onClick={() => setIdx(i)} className="h-9 w-9 rounded-full text-sm font-bold"
                  style={{ background: done ? GREEN : '#f3f4f6', color: done ? '#fff' : '#374151', outline: i === idx ? `3px solid ${BLUE}` : 'none' }}>{i + 1}</button>
              );
            })}
          </div>
          <button onClick={() => setConfirmOpen(true)} disabled={busy} className="mt-3 w-full rounded-xl py-2 font-bold text-white disabled:opacity-60" style={{ background: GREEN }}>
            {busy ? 'جارٍ التسليم...' : 'تسليم الإجابات'}
          </button>
        </div>

        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div dir="rtl" className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-2xl">
              <h3 className="text-xl font-bold" style={{ color: BLUE }}>هل أنت متأكد من التسليم؟</h3>
              <p>أجبت عن <b style={{ color: GREEN }}>{answeredCount}</b> من أصل <b>{questions.length}</b> سؤالاً
                {unanswered.length > 0 ? <>، وتركت <b style={{ color: RED }}>{unanswered.length}</b> بلا إجابة.</> : <>. أحسنت، أجبت عن الجميع! 🎉</>}</p>
              {unanswered.length > 0 && (
                <div>
                  <p className="mb-1 text-sm text-gray-600">اضغط رقم السؤال للعودة إليه:</p>
                  <div className="flex flex-wrap gap-2">
                    {unanswered.map(({ q: uq, i }) => (
                      <button key={uq.id} onClick={() => { setIdx(i); setConfirmOpen(false); }} className="h-9 w-9 rounded-full text-sm font-bold text-white" style={{ background: RED }}>{i + 1}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setConfirmOpen(false)} className="flex-1 rounded-xl border py-2 font-bold" style={{ borderColor: BLUE, color: BLUE }}>العودة للمراجعة</button>
                <button onClick={doSubmit} className="flex-1 rounded-xl py-2 font-bold text-white" style={{ background: GREEN }}>نعم، سلّم الآن</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ================= التقرير ================= */
  if (phase === 'report' && active && review && stats) {
    const m = resultMsg(pct);
    const level = Math.min(review.attempt_no, 3);
    const C = 2 * Math.PI * 52;
    const shownItems = review.items.map((it, i) => ({ it, i })).filter(({ it }) =>
      filter === 'all' ? true : filter === 'essay' ? it.type === 'essay' : it.type !== 'essay' && it.is_correct !== true);
    return (
      <div dir="rtl" className={shell}>
        <button onClick={back} className="text-sm underline" style={{ color: BLUE }}>← رجوع للقائمة</button>

        <div className="rounded-3xl p-6 text-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${BLUE}, ${GREEN})` }}>
          <p className="text-sm opacity-90">{active.title}</p>
          <div className="relative mx-auto my-4 h-40 w-40">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="10" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - ringPct / 100)} style={{ transition: 'stroke-dashoffset 1.2s ease-out' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold">{pct}%</span>
              <span className="text-sm">{review.score} / {review.max_score}</span>
            </div>
          </div>
          <p className="text-3xl">{m.icon}</p>
          <h2 className="mt-1 text-xl font-bold">{m.t}</h2>
          <p className="mt-1 text-sm opacity-95">{m.s}</p>
          <p className="mt-3 text-xs opacity-80">المحاولة رقم {review.attempt_no}{elapsed !== null ? ` • الزمن ${Math.floor(elapsed / 60)} د ${elapsed % 60} ث` : ''} • للمراجعة الشخصية فقط</p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl border bg-white p-3"><p className="text-2xl font-extrabold" style={{ color: GREEN }}>{stats.ok}</p><p className="text-xs text-gray-600">إجابة صحيحة</p></div>
          <div className="rounded-2xl border bg-white p-3"><p className="text-2xl font-extrabold" style={{ color: RED }}>{stats.wrong}</p><p className="text-xs text-gray-600">إجابة خاطئة</p></div>
          <div className="rounded-2xl border bg-white p-3"><p className="text-2xl font-extrabold" style={{ color: AMBER }}>{stats.un}</p><p className="text-xs text-gray-600">لم تُجب</p></div>
        </div>

        {stats.essays > 0 && (
          <div className="rounded-2xl border bg-white p-4">
            <p className="font-bold" style={{ color: BLUE }}>✍️ الأسئلة المقالية ({stats.essays}) — للتدرب ولا تدخل في الدرجة</p>
            <p className="mt-1 text-sm text-gray-600">غطّيت تقريباً <b style={{ color: GREEN }}>{stats.eCov}</b> من <b>{stats.eTot}</b> عنصراً من عناصر الإجابات النموذجية. افتح كل سؤال لترى ما فاتك.</p>
          </div>
        )}

        {stats.refs.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: '#0B6CB30F' }}>
            <p className="font-bold" style={{ color: BLUE }}>📚 راجع في المقرر:</p>
            <div className="mt-2 flex flex-wrap gap-2">{stats.refs.map((r) => <span key={r} className="rounded-full bg-white px-3 py-1 text-sm font-semibold" style={{ color: BLUE }}>{r}</span>)}</div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {([['all', 'كل الأسئلة'], ['wrong', 'ما أخطأت فيه'], ['essay', 'المقالي']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className="rounded-full px-4 py-1.5 text-sm font-bold"
              style={{ background: filter === k ? BLUE : '#fff', color: filter === k ? '#fff' : BLUE, border: `1px solid ${BLUE}` }}>{l}</button>
          ))}
        </div>
        {shownItems.length === 0 && <p className="rounded-xl bg-green-50 p-4 text-center font-bold" style={{ color: GREEN }}>🎉 لا شيء هنا، أحسنت!</p>}

        {shownItems.map(({ it, i }) => {
          const none = it.type === 'tf' ? !it.text_answer : it.type === 'mcq' ? !it.chosen_option_id : false;
          const border = it.type === 'essay' ? BLUE : it.is_correct ? GREEN : none ? AMBER : RED;
          return (
            <div key={it.id} className="space-y-3 rounded-2xl border-2 bg-white p-4" style={{ borderColor: border }}>
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-wrap font-semibold leading-7">{i + 1}. {it.text}</p>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: border }}>
                  {it.type === 'essay' ? 'مقالي' : it.is_correct ? 'صحيح ✓' : none ? 'لم تُجب' : 'خطأ ✗'}
                </span>
              </div>

              {it.type === 'mcq' && it.options.map((o, k) => {
                const right = o.id === it.correct_option_id;
                const wrong = o.id === it.chosen_option_id && !right;
                return (
                  <div key={o.id} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
                    style={right ? { borderColor: GREEN, background: '#198B4815' } : wrong ? { borderColor: RED, background: '#dc262612' } : {}}>
                    <b>{LETTERS[k] ?? k + 1})</b><span className="flex-1">{o.text}</span>
                    {right && <span style={{ color: GREEN }}>✓ الصحيحة</span>}
                    {o.id === it.chosen_option_id && <span className="text-xs" style={{ color: wrong ? RED : GREEN }}>إجابتك</span>}
                  </div>
                );
              })}

              {it.type === 'tf' && (['true', 'false'] as const).map((v) => {
                const right = String(it.correct_tf) === v;
                const wrong = it.text_answer === v && !right;
                return (
                  <div key={v} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
                    style={right ? { borderColor: GREEN, background: '#198B4815' } : wrong ? { borderColor: RED, background: '#dc262612' } : {}}>
                    <span className="flex-1">{v === 'true' ? 'صح' : 'خطأ'}</span>
                    {right && <span style={{ color: GREEN }}>✓ الصحيحة</span>}
                    {it.text_answer === v && <span className="text-xs" style={{ color: wrong ? RED : GREEN }}>إجابتك</span>}
                  </div>
                );
              })}

              {it.type !== 'essay' && it.model_answer && (
                <p className="rounded-lg p-2 text-sm" style={{ background: '#0B6CB30F', color: '#075985' }}>📖 {it.model_answer}</p>
              )}
              {it.type === 'essay' && <EssayReview item={it} level={level} />}
            </div>
          );
        })}

        <button disabled={busy} onClick={retake} className="w-full rounded-2xl py-3 text-lg font-bold text-white disabled:opacity-60" style={{ background: BLUE }}>
          🔄 إعادة المحاولة وتحسين نتيجتي
        </button>
      </div>
    );
  }

  return <div dir="rtl" className="p-6 text-gray-500">جارٍ التحميل...</div>;
}
