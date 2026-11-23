import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const input = 'w-20 rounded-xl border border-light-blue p-2 text-center text-sm font-bold text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent/40'

interface StudentGrade {
  student_id: string
  full_name: string
  student_no: string
  quizzes_10: number
  assignments_10: number
  attendance_10: number
  midterm_20: number | null
  final_60: number | null
  total_100: number
}

export default function FinalGradesTab() {
  const [data, setData] = useState<StudentGrade[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true); setError(null)

    const { data: grades, error: gErr } = await supabase
      .from('final_grades')
      .select('*, profiles(full_name, student_no)')
      .order('profiles(student_no)')

    if (gErr) { setError(gErr.message); setLoading(false); return }

    const formatted = (grades || []).map((g: any) => ({
      student_id: g.student_id,
      full_name: g.profiles.full_name,
      student_no: g.profiles.student_no,
      quizzes_10: g.quizzes_10 || 0,
      assignments_10: g.assignments_10 || 0,
      attendance_10: g.attendance_10 || 0,
      midterm_20: g.midterm_20,
      final_60: g.final_60,
      total_100: g.total_100 || 0
    }))

    setData(formatted)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function syncData() {
    if (!supabase) return
    if (!window.confirm('سيتم سحب درجات الأنشطة والتكاليف والحضور آلياً. هل تريد المتابعة؟')) return
    setBusy(true); setError(null); setSuccess(null)
    
    const { error: rpcErr } = await supabase.rpc('sync_final_grades')
    setBusy(false)
    if (rpcErr) { setError(rpcErr.message); return }
    setSuccess('تم مزامنة الدرجات الآلية بنجاح!')
    await load()
  }

  async function updateManualGrade(studentId: string, field: 'midterm_20' | 'final_60', value: string) {
    if (!supabase) return
    const num = value === '' ? null : Number(value)
    
    // تحديث الواجهة فوراً (Optimistic UI)
    setData(prev => prev.map(d => {
      if (d.student_id === studentId) {
        const newData = { ...d, [field]: num }
        // إعادة حساب المجموع محلياً
        const q = Math.min(10, newData.quizzes_10)
        const a = Math.min(10, newData.assignments_10)
        const at = Math.min(10, newData.attendance_10)
        const m = Math.min(20, newData.midterm_20 || 0)
        const f = Math.min(60, newData.final_60 || 0)
        newData.total_100 = q + a + at + m + f
        return newData
      }
      return d
    }))

    // الحفظ في الخلفية
    await supabase.from('final_grades').update({ [field]: num, updated_at: new Date().toISOString() }).eq('student_id', studentId)
  }

  if (loading) return <section className={card}><p>جارٍ التحميل...</p></section>

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">النتائج النهائية والتجميعية</h2>
          <p className="mt-1 text-base text-white/85">تجميع درجات الأنشطة، التكاليف، الحضور، والميدتيرم والنهائي.</p>
        </div>
        <button className="rounded-xl bg-white px-5 py-2.5 text-primary font-bold shadow-sm hover:bg-primary-soft" onClick={() => void syncData()} disabled={busy}>
          {busy ? '⏳ جاري المزامنة...' : '🔄 مزامنة الدرجات الآلية'}
        </button>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-error">{error}</p>}
      {success && <p className="rounded-xl bg-secondary-soft p-3 text-secondary">{success}</p>}

      <section className={card}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-center">
            <thead>
              <tr className="border-b-2 border-primary bg-primary-soft/30 text-primary">
                <th className="p-3 text-start">الطالب</th>
                <th className="p-3">الأنشطة (10)</th>
                <th className="p-3">التكاليف (10)</th>
                <th className="p-3">الحضور (10)</th>
                <th className="p-3">الميدتيرم (20)</th>
                <th className="p-3">النهائي (60)</th>
                <th className="p-3 font-bold text-lg">المجموع (100)</th>
              </tr>
            </thead>
            <tbody>
              {data.map(d => (
                <tr key={d.student_id} className="border-b border-light-blue/50 hover:bg-bg">
                  <td className="p-3 text-start">
                    <div className="font-bold text-ink">{d.full_name}</div>
                    <div className="text-xs text-ink-muted font-mono">{d.student_no}</div>
                  </td>
                  <td className="p-3 font-semibold text-primary">{d.quizzes_10.toFixed(1)}</td>
                  <td className="p-3 font-semibold text-primary">{d.assignments_10.toFixed(1)}</td>
                  <td className="p-3 font-semibold text-primary">{d.attendance_10.toFixed(1)}</td>
                  
                  {/* خانات الإدخال اليدوي */}
                  <td className="p-3">
                    <input 
                      type="number" min={0} max={20} className={input} 
                      value={d.midterm_20 ?? ''} 
                      onChange={(e) => void updateManualGrade(d.student_id, 'midterm_20', e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-3">
                    <input 
                      type="number" min={0} max={60} className={input} 
                      value={d.final_60 ?? ''} 
                      onChange={(e) => void updateManualGrade(d.student_id, 'final_60', e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0"
                    />
                  </td>

                  <td className="p-3">
                    <span className="inline-block rounded-lg bg-secondary px-4 py-1.5 text-base font-bold text-white shadow-sm">
                      {d.total_100.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}