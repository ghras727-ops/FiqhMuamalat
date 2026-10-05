import AttachmentView from '../../components/AttachmentView'
import DemoBadge from '../../components/DemoBadge'
import Tag from '../../components/Tag'
import { card } from '../../components/ui'
import { getQuiz, useQuizSets } from '../../demo/quizsets'
import { useWeekPacks } from '../../demo/weekpack'

export default function WeekPacksView() {
  const packs = useWeekPacks()
  const quizzes = useQuizSets()
  const list = Object.values(packs)
    .filter((p) => p.published)
    .sort((a, b) => a.week - b.week)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-primary">دروس الأسابيع</h2>
        <DemoBadge />
      </div>

      {list.length === 0 && (
        <section className={card}>
          <p className="text-ink/70">لم يُنشر أي أسبوع بعد.</p>
        </section>
      )}

      {list.map((p) => {
        const quiz = getQuiz(quizzes, p.week)
        return (
          <section key={p.week} className={card}>
            <h3 className="text-lg font-bold text-primary">الأسبوع {p.week}: {p.title}</h3>

            {p.book && (
              <div className="mt-4">
                <div className="mb-2 text-sm font-semibold text-ink/70">الكتاب</div>
                <AttachmentView att={p.book} />
              </div>
            )}

            {p.slides && (
              <div className="mt-4">
                <div className="mb-2 text-sm font-semibold text-ink/70">العرض التقديمي</div>
                <AttachmentView att={p.slides} />
              </div>
            )}

            {quiz.open && quiz.questions.length > 0 && (
              <div className="mt-4 rounded-xl bg-surface p-3 text-sm">
                أسئلة الدرس: {quiz.questions.length} سؤالًا في تبويب «اختبر نفسك».
              </div>
            )}

            {(p.files.length > 0 || p.links.length > 0) && (
              <div className="mt-4 space-y-2">
                <div className="text-sm font-semibold text-ink/70">مواد وروابط</div>
                {p.files.map((a) => <AttachmentView key={a.id} att={a} />)}
                {p.links.map((l) => (
                  <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-light-blue p-3 text-sm">
                    <span><Tag tone="info">{l.kind}</Tag> {l.title}</span>
                    <a
                      className="rounded-xl border border-primary bg-white px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-surface"
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      فتح الرابط
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
