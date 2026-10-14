import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const btnSuccess = 'rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary-hover disabled:opacity-60'

interface Week { id: string; number: number; title: string }
interface Student { id: string; full_name: string; student_no: string | null }
type AttStatus = 'present' | 'absent' | 'excused'
interface AttRow { student_id: string; status: AttStatus }

export default function AttendanceTab() {
  const [weeks, setWeeks] = useState<Week[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [currentWeekId, setCurrentWeekId] = useState<string>('')
  const [marks, setMarks] = useState<Record<string, AttStatus>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadBase = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)

    const [wRes, sRes] = await Promise.all([
      supabase.from('weeks').select('id,number,title').order('number'),
      supabase.from('profiles').select('id,full_name,student_no').eq('role', 'student').eq('active', true).order('student_no'),
    ])

    if (wRes.error || sRes.error) {
      setError('تعذّر التحميل.')
      setLoading(false)
      return
    }

    const wList = (wRes.data ?? []) as Week[]
    setWeeks(wList)
    setStudents((sRes.data ?? []) as Student[])
    if (wList.length > 0 && !currentWeekId) setCurrentWeekId(wList[0].id)
    setLoading(false)
  }, [currentWeekId])

  useEffect(() => { void loadBase() }, [loadBase])

  const loadWeek = useCallback(async () => {
    if (!supabase || !currentWeekId) return
    setBusy(true); setError(null); setSuccess(null)
    const { data, error: err } = await supabase
      .from('attendance')
      .select('student_id,status')
      .eq('week_id', currentWeekId)

    if (err) { setError('تعذّر تحميل الحضور.'); setBusy(false); return }

    const m: Record<string, AttStatus> = {}
    for (const r of (data ?? []) as AttRow[]) m[r.student_id] = r.status
    setMarks(m)
    setBusy(false)
  }, [currentWeekId])

  useEffect(() => { void loadWeek() }, [loadWeek])

  async function setStatus(studentId: string, status: AttStatus) {
    if (!supabase || !currentWeekId) return
    // optimistic update
    const prev = marks[studentId]
    setMarks((m) => ({ ...m, [studentId]: status }))
    setSuccess(null)
    const { error: rpcErr } = await supabase.rpc('mark_attendance', {
      p_student_id: studentId,
      p_week_id: currentWeekId,
      p_status: status,
    })
    if (rpcErr) {
      setError('تعذّر الحفظ: ' + rpcErr.message)
      // rollback
      setMarks((m) => {
        const c = { ...m }
        if (prev) c[studentId] = prev; else delete c[studentId]
        return c
      })
    }
  }

  async function markAllPresent() {
    if (!supabase || !currentWeekId) return
    if (!window.confirm('تحديد الجميع كـ «حاضر» لهذا الأسبوع؟')) return
    setBusy(true); setError(null); setSuccess(null)
    const { error: rpcErr } = await supabase.rpc('mark_all_present', { p_week_id: currentWeekId })
    setBusy(false)
    if (rpcErr) { setError(rpcErr.message); return }
    setSuccess('تم تحديد الجميع كحاضر.')
    await loadWeek()
  }

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  const currentWeek = weeks.find((w) => w.id === currentWeekId)
  const presentCount = Object.values(marks).filter((s) => s === 'present').length
  const absentCount = Object.values(marks).filter((s) => s === 'absent').length
  const excusedCount = Object.values(marks).filter((s) => s === 'excused').length
  const unmarked = students.length - (presentCount + absentCount + excusedCount)

  return (
    <div className="space-y-5">
      {/* رأس الصفحة */}
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">📋 الحضور والغياب</h2>
        <p className="mt-1 text-base text-white/85">
          سجّل حضور الطلاب لكل أسبوع. تُحفظ تلقائيًا عند كل نقرة.
        </p>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-base font-semibold text-error">{error}</p>}
      {success && <p className="rounded-xl bg-secondary-soft p-3 text-base font-semibold text-secondary ring-1 ring-secondary/20">{success}</p>}

      {/* تبويبات الأسابيع */}
      <section className={card}>
        <h3 className="mb-3 text-lg font-bold text-primary">اختر الأسبوع</h3>
        <div className="flex flex-wrap gap-2">
          {weeks.map((w) => {
            const active = w.id === currentWeekId
            return (
              <button
                key={w.id}
                onClick={() => setCurrentWeekId(w.id)}
                className={
                  'rounded-xl border-2 px-4 py-2 text-sm font-bold transition ' +
                  (active
                    ? 'border-primary bg-primary text-white shadow-md'
                    : 'border-light-blue bg-white text-ink-muted hover:border-primary/40 hover:bg-primary-soft')
                }
              >
                الأسبوع {w.number}
              </button>
            )
          })}
        </div>
      </section>

      {/* جدول الحضور */}
      <section className={card}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-primary">
              {currentWeek ? `الأسبوع ${currentWeek.number}: ${currentWeek.title}` : 'اختر أسبوعًا'}
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              {presentCount} حاضر — {absentCount} غائب — {excusedCount} معذور
              {unmarked > 0 && <> — {unmarked} لم يُسجَّل</>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btnSuccess} onClick={() => void markAllPresent()} disabled={busy}>
              ✓ الجميع حاضرون
            </button>
            <button className={btnOutline} onClick={() => void loadWeek()} disabled={busy}>
              🔄 تحديث
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-blue">
                <th className="p-3 text-start text-ink-muted">#</th>
                <th className="p-3 text-start text-ink-muted">الطالب</th>
                <th className="p-3 text-start text-ink-muted">الرقم</th>
                <th className="p-3 text-center text-ink-muted" colSpan={3}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const st = marks[s.id]
                return (
                  <tr key={s.id} className="border-b border-light-blue/50 hover:bg-bg">
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3 text-base font-semibold text-ink">{s.full_name}</td>
                    <td className="p-3 font-mono text-xs text-ink-muted" dir="ltr">{s.student_no ?? '—'}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-center gap-1.5">
                        <StatusButton
                          active={st === 'present'}
                          tone="success"
                          label="حاضر"
                          onClick={() => void setStatus(s.id, 'present')}
                        />
                        <StatusButton
                          active={st === 'absent'}
                          tone="danger"
                          label="غائب"
                          onClick={() => void setStatus(s.id, 'absent')}
                        />
                        <StatusButton
                          active={st === 'excused'}
                          tone="info"
                          label="معذور"
                          onClick={() => void setStatus(s.id, 'excused')}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatusButton({ active, tone, label, onClick }: {
  active: boolean
  tone: 'success' | 'danger' | 'info'
  label: string
  onClick: () => void
}) {
  const base = 'rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition min-w-[64px]'
  const styles: Record<string, { on: string; off: string }> = {
    success: {
      on: 'border-secondary bg-secondary text-white shadow-sm',
      off: 'border-secondary/30 bg-white text-secondary hover:bg-secondary-soft',
    },
    danger: {
      on: 'border-error bg-error text-white shadow-sm',
      off: 'border-error/30 bg-white text-error hover:bg-error-soft',
    },
    info: {
      on: 'border-primary bg-primary text-white shadow-sm',
      off: 'border-primary/30 bg-white text-primary hover:bg-primary-soft',
    },
  }
  return (
    <button className={base + ' ' + (active ? styles[tone].on : styles[tone].off)} onClick={onClick}>
      {label}
    </button>
  )
}