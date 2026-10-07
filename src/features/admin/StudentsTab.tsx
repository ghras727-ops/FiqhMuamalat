import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface StudentRow {
  id: string
  full_name: string
  student_no: string | null
  university_no: string | null
  active: boolean
}

interface CreatedRow {
  full_name: string
  ok: boolean
  student_no?: string
  password?: string
  error?: string
}

const CREATE_FN = 'smooth-task'

const card = 'rounded-2xl border border-light-blue bg-white p-6'
const btn = 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-surface disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-3 py-1.5 text-sm font-semibold text-error transition hover:bg-error-soft disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue p-2 text-ink'

export default function StudentsTab() {
  const [rows, setRows] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [names, setNames] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<CreatedRow[] | null>(null)

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editUni, setEditUni] = useState('')

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, full_name, student_no, university_no, active')
      .eq('role', 'student')
      .order('student_no', { ascending: true })
    if (err) setError('تعذّر تحميل قائمة الطلاب.')
    else {
      setError(null)
      setRows((data ?? []) as StudentRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function addStudents() {
    if (!supabase) return
    const list = names
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((full_name) => ({ full_name }))
    if (list.length === 0 || list.length > 100) {
      setError('اكتب من 1 إلى 100 اسم، اسم في كل سطر.')
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(null)
    const { data, error: err } = await supabase.functions.invoke(CREATE_FN, {
      body: { students: list },
    })
    setBusy(false)
    if (err || !data?.results) {
      setError('تعذّرت إضافة الطلاب. حاول مرة أخرى.')
      return
    }
    setCreated(data.results as CreatedRow[])
    setNames('')
    setShowAdd(false)
    void load()
  }

  async function toggleActive(r: StudentRow) {
    if (!supabase) return
    const { error: err } = await supabase
      .from('profiles')
      .update({ active: !r.active })
      .eq('id', r.id)
    if (err) setError('تعذّر تغيير حالة الطالب.')
    else void load()
  }

  function startEdit(r: StudentRow) {
    setEditingId(r.id)
    setEditName(r.full_name)
    setEditUni(r.university_no ?? '')
    setError(null)
    setSuccess(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditUni('')
  }

  async function saveEdit(r: StudentRow) {
    if (!supabase) return
    if (!editName.trim()) {
      setError('الاسم مطلوب.')
      return
    }
    setBusy(true); setError(null); setSuccess(null)
    const { error: rpcErr } = await supabase.rpc('update_student', {
      p_student_id: r.id,
      p_full_name: editName.trim(),
      p_university_no: editUni.trim() || null,
    })
    setBusy(false)
    if (rpcErr) { setError('تعذّر التعديل: ' + rpcErr.message); return }
    setSuccess('تم تعديل بيانات الطالب.')
    cancelEdit()
    await load()
  }

  async function deleteStudent(r: StudentRow) {
    if (!supabase) return
    const msg = `حذف الطالب «${r.full_name}» نهائيًا؟\n\nسيُحذف حسابه وملفه وكل محاولاته وإجاباته ودرجاته. لا يمكن التراجع.`
    if (!window.confirm(msg)) return
    setBusy(true); setError(null); setSuccess(null)
    const { data, error: rpcErr } = await supabase.rpc('delete_student', {
      p_student_id: r.id,
    })
    setBusy(false)
    if (rpcErr) { setError('تعذّر الحذف: ' + rpcErr.message); return }
    const count = (data as { deleted_attempts?: number } | null)?.deleted_attempts ?? 0
    setSuccess(`تم حذف الطالب و${count} محاولة مرتبطة به.`)
    await load()
  }

  function copyCreated() {
    if (!created) return
    const text = created
      .filter((c) => c.ok)
      .map((c) => [c.full_name, c.student_no, c.password].join('\t'))
      .join('\n')
    void navigator.clipboard.writeText(text)
  }

  const statusClass = (active: boolean) =>
    'p-2 font-semibold ' + (active ? 'text-secondary' : 'text-error')

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-primary">الطلاب</h2>
          <button className={btn} onClick={() => setShowAdd((v) => !v)}>
            + إضافة طلاب
          </button>
        </div>

        {showAdd && (
          <div className="mt-4">
            <label className="block text-sm font-semibold text-ink" htmlFor="names">
              أسماء الطلاب (اسم في كل سطر)
            </label>
            <textarea
              id="names"
              rows={6}
              value={names}
              onChange={(e) => setNames(e.target.value)}
              className="mt-2 w-full rounded-xl border border-light-blue p-3 text-ink"
            />
            <button className={btn + ' mt-3'} onClick={addStudents} disabled={busy}>
              {busy ? 'جارٍ الإضافة...' : 'إنشاء الحسابات'}
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm font-semibold text-error">{error}</p>}
        {success && <p className="mt-3 text-sm font-semibold text-secondary">{success}</p>}
      </section>

      {created && (
        <section className={card}>
          <h3 className="text-lg font-bold text-primary">الحسابات الجديدة</h3>
          <p className="mt-1 text-sm font-semibold text-error">
            كلمات المرور تظهر هنا مرة واحدة فقط. انسخها أو اطبعها الآن.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-blue text-ink/70">
                  <th className="p-2 text-start">الاسم</th>
                  <th className="p-2 text-start">الرقم التعريفي</th>
                  <th className="p-2 text-start">كلمة المرور المؤقتة</th>
                </tr>
              </thead>
              <tbody>
                {created.map((c, i) => (
                  <tr key={i} className="border-b border-light-blue/50">
                    <td className="p-2">{c.full_name}</td>
                    {c.ok ? (
                      <>
                        <td className="p-2 font-mono" dir="ltr">{c.student_no}</td>
                        <td className="p-2 font-mono" dir="ltr">{c.password}</td>
                      </>
                    ) : (
                      <td className="p-2 text-error" colSpan={2}>فشل: {c.error}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-2">
            <button className={btnOutline} onClick={copyCreated}>نسخ</button>
            <button className={btnOutline} onClick={() => window.print()}>طباعة</button>
            <button className={btnOutline} onClick={() => setCreated(null)}>إخفاء</button>
          </div>
        </section>
      )}

      <section className={card}>
        {loading ? (
          <p className="text-ink/70">جارٍ التحميل...</p>
        ) : rows.length === 0 ? (
          <p className="text-ink/70">لا يوجد طلاب بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-blue text-ink/70">
                  <th className="p-2 text-start">الاسم</th>
                  <th className="p-2 text-start">الرقم التعريفي</th>
                  <th className="p-2 text-start">الرقم الجامعي</th>
                  <th className="p-2 text-start">الحالة</th>
                  <th className="p-2 text-start">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isEditing = editingId === r.id
                  return (
                    <tr key={r.id} className="border-b border-light-blue/50 align-top">
                      {isEditing ? (
                        <>
                          <td className="p-2">
                            <input
                              className={input + ' mt-0'}
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          </td>
                          <td className="p-2 font-mono" dir="ltr">{r.student_no ?? '—'}</td>
                          <td className="p-2">
                            <input
                              className={input + ' mt-0'}
                              dir="ltr"
                              value={editUni}
                              onChange={(e) => setEditUni(e.target.value)}
                            />
                          </td>
                          <td className={statusClass(r.active)}>
                            {r.active ? 'مفعّل' : 'معطّل'}
                          </td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1">
                              <button className={btn} onClick={() => void saveEdit(r)} disabled={busy}>حفظ</button>
                              <button className={btnOutline} onClick={cancelEdit} disabled={busy}>إلغاء</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-2">{r.full_name}</td>
                          <td className="p-2 font-mono" dir="ltr">{r.student_no ?? '—'}</td>
                          <td className="p-2 font-mono text-xs" dir="ltr">{r.university_no ?? '—'}</td>
                          <td className={statusClass(r.active)}>
                            {r.active ? 'مفعّل' : 'معطّل'}
                          </td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1">
                              <button className={btnOutline} onClick={() => toggleActive(r)} disabled={busy}>
                                {r.active ? 'تعطيل' : 'تفعيل'}
                              </button>
                              <button className={btnOutline} onClick={() => startEdit(r)} disabled={busy}>
                                تعديل
                              </button>
                              <button className={btnDanger} onClick={() => void deleteStudent(r)} disabled={busy}>
                                حذف
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}