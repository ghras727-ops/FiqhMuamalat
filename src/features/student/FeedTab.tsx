import { useState } from 'react'
import { useAuth } from '../../app/auth-context'
import DemoBadge from '../../components/DemoBadge'
import Tag from '../../components/Tag'
import AttachmentView from '../../components/AttachmentView'
import { btn, btnOutline, card, field, th } from '../../components/ui'
import { demoActivities, demoMaterials, demoProgress, demoResults, demoStudents } from '../../demo/data'
import { addComment, toggleLike, useFeed } from '../../demo/store'

const ME = 'FM0001'

const acts = demoActivities.filter((a) => a.status !== 'draft')
const students = demoStudents.filter((s) => s.active)

const ranking = students
  .map((s) => {
    let sum = 0
    let maxSum = 0
    acts.forEach((a) => {
      const r = demoResults.find((x) => x.studentNo === s.no && x.activityId === a.id)
      if (r) {
        sum += r.score
        maxSum += a.max
      }
    })
    return {
      no: s.no,
      name: s.name,
      percent: maxSum === 0 ? 0 : Math.round((sum / maxSum) * 100),
      progress: demoProgress[s.no] ?? 0,
    }
  })
  .sort((a, b) => b.percent - a.percent)

let bestSingle = { name: '', percent: 0 }
demoResults.forEach((r) => {
  const a = demoActivities.find((x) => x.id === r.activityId)
  const s = demoStudents.find((x) => x.no === r.studentNo)
  if (a && s) {
    const p = Math.round((r.score / a.max) * 100)
    if (p > bestSingle.percent) bestSingle = { name: s.name, percent: p }
  }
})

const avgProgress = Math.round(ranking.reduce((t, r) => t + r.progress, 0) / ranking.length)
const myRank = ranking.findIndex((r) => r.no === ME) + 1
const myProgress = demoProgress[ME] ?? 0

const kindTone = { 'إعلان': 'wait', 'درس': 'info', 'ملف': 'ok', 'نقاش': 'info' } as const

export default function FeedTab() {
  const { profile } = useAuth()
  const feed = useFeed()
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const posts = feed.posts
    .filter((p) => !p.hidden)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned))

  function send(postId: string) {
    const text = (drafts[postId] ?? '').trim()
    if (!text) return
    addComment(postId, profile?.full_name ?? 'طالب', text)
    setDrafts({ ...drafts, [postId]: '' })
  }

  const stats = [
    { label: 'أفضل طالب', value: ranking[0]?.name ?? '—', sub: ranking[0] ? ranking[0].percent + '%' : '' },
    { label: 'أفضل درجة في نشاط', value: bestSingle.percent + '%', sub: bestSingle.name },
    { label: 'متوسط إنجاز الصف', value: avgProgress + '%', sub: 'من المادة' },
    { label: 'ترتيبك', value: '#' + myRank, sub: 'إنجازك ' + myProgress + '%' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-primary">المنصة</h2>
        <DemoBadge />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-light-blue bg-white p-4">
            <div className="text-sm text-ink/70">{s.label}</div>
            <div className="mt-1 text-xl font-bold text-primary">{s.value}</div>
            <div className="text-xs text-ink/60">{s.sub}</div>
          </div>
        ))}
      </div>

      <section className={card}>
        <h3 className="text-lg font-bold text-primary">ترتيب الصف</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-blue text-ink/70">
                <th className={th}>#</th>
                <th className={th}>الطالب</th>
                <th className={th}>نسبة الدرجات</th>
                <th className={th}>إنجاز المادة</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.no} className={'border-b border-light-blue/50 ' + (r.no === ME ? 'bg-surface font-semibold' : '')}>
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2">{r.name}{r.no === ME ? ' (أنت)' : ''}</td>
                  <td className="p-2">{r.percent}%</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-28 overflow-hidden rounded-full bg-surface">
                        <div className="h-full bg-secondary" style={{ width: r.progress + '%' }} />
                      </div>
                      <span>{r.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {posts.length === 0 && (
        <section className={card}>
          <p className="text-ink/70">لا توجد منشورات بعد.</p>
        </section>
      )}

      {posts.map((p) => {
        const mat = p.materialId ? demoMaterials.find((m) => m.id === p.materialId) : undefined
        const list = feed.comments.filter((c) => c.postId === p.id && !c.hidden)
        const liked = Boolean(feed.liked[p.id])
        return (
          <section key={p.id} className={card}>
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone={kindTone[p.kind]}>{p.kind}</Tag>
              {p.pinned && <Tag tone="wait">مثبّت</Tag>}
              <span className="text-xs text-ink/60">{p.date}</span>
            </div>
            <h3 className="mt-2 text-lg font-bold text-primary">{p.title}</h3>
            <p className="mt-2 whitespace-pre-line leading-7 text-ink/80">{p.body}</p>

            {p.attachments && p.attachments.length > 0 && (<div className="mt-3 space-y-2">{p.attachments.map((a) => (<AttachmentView key={a.id} att={a} />))}</div>)}
            {mat && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-light-blue p-3">
                <span className="text-sm">
                  {mat.title} <span className="font-mono text-xs text-ink/60" dir="ltr">({mat.kind}، {mat.size})</span>
                </span>
                <button className="cursor-not-allowed rounded-xl border border-light-blue px-3 py-1.5 text-sm text-ink/50" disabled>
                  تنزيل (تجريبي)
                </button>
              </div>
            )}

            <div className="mt-3">
              <button className={btnOutline} onClick={() => toggleLike(p.id)}>
                {liked ? 'أعجبني ✓' : 'إعجاب'} ({p.likes})
              </button>
            </div>

            <div className="mt-4 space-y-2 border-t border-light-blue/50 pt-3">
              <div className="text-sm font-semibold text-ink/70">التعليقات ({list.length})</div>
              {list.map((c) => (
                <div key={c.id} className="rounded-xl bg-surface p-3 text-sm">
                  <div className="font-semibold">{c.author}</div>
                  <div className="mt-1 text-ink/80">{c.text}</div>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  className={field + ' mt-0'}
                  placeholder="اكتب تعليقًا..."
                  value={drafts[p.id] ?? ''}
                  onChange={(e) => setDrafts({ ...drafts, [p.id]: e.target.value })}
                />
                <button className={btn} onClick={() => send(p.id)}>إرسال</button>
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}

