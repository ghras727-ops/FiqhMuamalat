import type React from 'react'

export interface ComprehensiveSnapshot {
  student: { full_name: string; student_no: string | null }
  from_week: number
  to_week: number
  generated_at: string
  grades: { week: number; title: string; score: number; max: number; percent: number; status: string }[]
  attendance: { week: number; status: string }[]
  options: { showGrades: boolean; showAttendance: boolean }
}

const C = {
  blue: '#0B6CB3', blueSoft: '#E6F2FA', cyan: '#49CEF3', cyanSoft: '#E8F8FD',
  green: '#198B48', greenSoft: '#E8F5ED', red: '#D74050', redSoft: '#FBEAEC',
  ink: '#123A2E', gray: '#4B5D63', line: '#D6E4EC', paper: '#F7FBFD', mute: '#B9C6CC',
}

const TEACHER = 'د. محمد إسماعيل'

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch { return '—' }
}

function statusLabel(s?: string | null): string {
  if (!s) return '—'
  if (s === 'graded') return 'مصحح'
  if (s === 'submitted') return 'بانتظار التصحيح'
  if (s === 'draft') return 'مسودة'
  if (s === 'present') return 'حاضر'
  if (s === 'absent') return 'غائب'
  if (s === 'excused') return 'معذور'
  return s
}

function statusTone(s?: string | null) {
  if (s === 'graded' || s === 'present') return { bg: C.greenSoft, fg: C.green }
  if (s === 'submitted' || s === 'excused') return { bg: C.blueSoft, fg: C.blue }
  if (s === 'absent') return { bg: C.redSoft, fg: C.red }
  return { bg: '#EEF2F4', fg: C.gray }
}

function percentColor(p: number) {
  return p >= 70 ? C.green : p >= 50 ? C.blue : C.red
}

function Score({ value, total, style }: { value: React.ReactNode; total: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span dir="ltr" style={{ unicodeBidi: 'isolate', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', ...style }}>
      {value} <span style={{ opacity: 0.45, fontWeight: 500 }}>/</span> {total}
    </span>
  )
}

export default function ComprehensiveReport({ snapshot }: { snapshot: ComprehensiveSnapshot }) {
  const { student, from_week, to_week, grades, attendance, options, generated_at } = snapshot

  // حماية البيانات: إذا كانت الدرجة الكاملة 0، نجعلها 60 لمنع النسب الخاطئة
  const safeGrades = grades.map(g => {
    const safeMax = (g.max && g.max > 0) ? g.max : 60;
    const safePercent = Math.min(100, Math.round((g.score / safeMax) * 100));
    return { ...g, safeMax, safePercent };
  });

  const totalMax = safeGrades.reduce((sum, g) => sum + g.safeMax, 0)
  const totalScore = safeGrades.reduce((sum, g) => sum + g.score, 0)
  // إجبار النسبة النهائية ألا تتجاوز 100%
  const overallPercent = totalMax > 0 ? Math.min(100, Math.round((totalScore / totalMax) * 100)) : 0

  return (
    <div
      dir="rtl"
      className="print-area"
      style={{
        width: '210mm', minHeight: '297mm', background: 'white', color: C.ink,
        fontFamily: '"Cairo", "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif',
        fontSize: '13px', lineHeight: 1.6, boxSizing: 'border-box', margin: '0 auto',
        position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
        .print-area, .print-area * { font-family: "Cairo", "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif; }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; width: 210mm !important; height: 297mm !important; max-height: 297mm !important; overflow: hidden !important; background: white !important; }
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { -webkit-print-color-adjust: exact; print-color-adjust: exact; position: fixed !important; top: 0 !important; left: 0 !important; right: auto !important; bottom: auto !important; transform: none !important; zoom: 1 !important; margin: 0 !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; width: 210mm !important; min-height: 297mm !important; overflow: hidden !important; }
        }
      `}</style>

      <div style={{ height: '6px', background: `linear-gradient(to left, ${C.blue}, ${C.cyan} 55%, ${C.green})`, flexShrink: 0 }} />

      <div style={{ padding: '8mm 11mm 8mm', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        
        <header style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '10px', borderBottom: `1px solid ${C.line}` }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/UST.png" alt="شعار الجامعة" style={{ width: '72px', height: '72px', objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ lineHeight: 1.5 }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: C.blue }}>جامعة العلوم والتكنولوجيا</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.ink }}>كلية العلوم الإدارية والإنسانية</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.gray }}>قسم الشريعة والقانون</div>
            </div>
          </div>

          <div style={{ flexShrink: 0, textAlign: 'center', padding: '0 16px', borderInline: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
            <span style={{ background: C.blue, color: 'white', fontWeight: 800, fontSize: '14.5px', padding: '1px 16px', borderRadius: '20px' }}>المستوى الثاني</span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: C.green, lineHeight: 1.4 }}>المقرر: فقه المعاملات (1)</span>
          </div>

          <div style={{ flexShrink: 0, minWidth: '118px', border: `1px solid ${C.line}`, borderRadius: '8px', background: C.paper, overflow: 'hidden', textAlign: 'center' }}>
            <div style={{ padding: '3px 10px', background: C.blue, color: 'white', fontSize: '10.5px', fontWeight: 700 }}>تقرير شامل</div>
            <div dir="ltr" style={{ padding: '3px 10px 0', fontFamily: 'monospace', fontWeight: 800, color: C.blue, fontSize: '12.5px' }}>AUTO</div>
            <div style={{ padding: '0 10px 4px', fontSize: '11px', color: C.gray, fontWeight: 600 }}>{fmtDate(generated_at)}</div>
          </div>
        </header>

        <div style={{ marginTop: '10px', padding: '6px 12px', background: C.blueSoft, borderInlineStart: `5px solid ${C.blue}`, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: C.blue }}>
            تقرير الأداء الشامل
            <span style={{ margin: '0 8px', color: C.mute }}>|</span>
            الأسابيع من {from_week} إلى {to_week}
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: C.gray, background: '#FFFFFF', padding: '2px 12px', borderRadius: '20px', border: `1px solid ${C.line}`, whiteSpace: 'nowrap' }}>
            تاريخ الإصدار: {fmtDate(generated_at)}
          </div>
        </div>

        <section style={{ marginTop: '12px' }}>
          <SectionTitle>بيانات الطالب</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '7px 14px', border: `1px solid ${C.line}`, borderRadius: '8px', background: C.paper }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0 }}>
              <span style={{ fontSize: '12.5px', color: C.gray, fontWeight: 700, whiteSpace: 'nowrap' }}>الاسم الكامل:</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: C.ink }}>{student.full_name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontSize: '12.5px', color: C.gray, fontWeight: 700, whiteSpace: 'nowrap' }}>الرقم المعرّف:</span>
              <span dir="ltr" style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 800, color: C.blue, unicodeBidi: 'isolate' }}>{student.student_no || '—'}</span>
            </div>
          </div>
        </section>

        {options.showGrades && safeGrades.length > 0 && (
          <section style={{ marginTop: '12px' }}>
            <SectionTitle>ملخص النتيجة الأكاديمية</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.3fr 1fr', gap: '8px' }}>
              <div style={cardStyle(C.blue, C.blueSoft)}>
                <div style={cardLabel}>الدرجة المحصّلة</div>
                <Score value={totalScore} total={totalMax} style={{ ...cardValue, color: C.blue }} />
              </div>
              <div style={cardStyle(percentColor(overallPercent), overallPercent >= 70 ? C.greenSoft : overallPercent >= 50 ? C.blueSoft : C.redSoft)}>
                <div style={cardLabel}>النسبة المئوية</div>
                <div style={{ ...cardValue, color: percentColor(overallPercent) }}>{overallPercent}%</div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.9)', borderRadius: '4px', marginTop: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, overallPercent))}%`, height: '100%', background: percentColor(overallPercent) }} />
                </div>
              </div>
              <div style={cardStyle(C.gray, C.paper)}>
                <div style={cardLabel}>الأسابيع المكتملة</div>
                <div style={{ ...cardValue, color: C.ink }}>{safeGrades.length}</div>
              </div>
            </div>
          </section>
        )}

        {options.showGrades && (
          <section style={{ marginTop: '12px' }}>
            <SectionTitle>1. الجدول الأكاديمي (الدرجات)</SectionTitle>
            {safeGrades.length === 0 ? <p style={{ fontSize: '12px', color: C.gray }}>لا توجد درجات مسجلة.</p> : (
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, border: `1px solid ${C.line}`, borderRadius: '8px', overflow: 'hidden', fontSize: '12.5px' }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: '46px', textAlign: 'center' }}>الأسبوع</th>
                    <th style={th}>عنوان الدرس</th>
                    <th style={{ ...th, width: '80px', textAlign: 'center' }}>الدرجة</th>
                    <th style={{ ...th, width: '96px', textAlign: 'center' }}>النسبة</th>
                    <th style={{ ...th, width: '92px', textAlign: 'center' }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {safeGrades.map((g, i) => {
                    const bg = i % 2 === 1 ? C.paper : 'white'
                    const st = statusTone(g.status)
                    return (
                      <tr key={i} style={{ background: bg }}>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', width: '24px', height: '24px', lineHeight: '24px', borderRadius: '50%', background: C.blueSoft, color: C.blue, fontWeight: 800, fontSize: '12.5px' }}>{g.week}</span>
                        </td>
                        <td style={{ ...td, fontWeight: 700 }}>{g.title || '—'}</td>
                        <td style={{ ...td, textAlign: 'center', fontWeight: 800 }}>
                          <Score value={g.score} total={g.safeMax} style={{ color: C.ink }} />
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <span style={{ fontWeight: 800, color: percentColor(g.safePercent), minWidth: '34px', fontVariantNumeric: 'tabular-nums' }}>{g.safePercent}%</span>
                            <span style={{ width: '34px', height: '6px', background: '#E8EEF2', borderRadius: '3px', overflow: 'hidden', display: 'inline-block' }}>
                              <span style={{ display: 'block', width: `${Math.min(100, g.safePercent)}%`, height: '100%', background: percentColor(g.safePercent) }} />
                            </span>
                          </div>
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', padding: '1px 10px', borderRadius: '20px', background: st.bg, color: st.fg, fontSize: '11.5px', fontWeight: 700, whiteSpace: 'nowrap' }}>{statusLabel(g.status)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </section>
        )}

        {options.showAttendance && (
          <section style={{ marginTop: '16px' }}>
            <SectionTitle>2. سجل الحضور والغياب</SectionTitle>
            {attendance.length === 0 ? <p style={{ fontSize: '12px', color: C.gray }}>لا يوجد سجل حضور.</p> : (
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, border: `1px solid ${C.line}`, borderRadius: '8px', overflow: 'hidden', fontSize: '12.5px' }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: '46px', textAlign: 'center' }}>الأسبوع</th>
                    <th style={{ ...th, textAlign: 'center' }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((a, i) => {
                    const bg = i % 2 === 1 ? C.paper : 'white'
                    const st = statusTone(a.status)
                    return (
                      <tr key={i} style={{ background: bg }}>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', width: '24px', height: '24px', lineHeight: '24px', borderRadius: '50%', background: C.blueSoft, color: C.blue, fontWeight: 800, fontSize: '12.5px' }}>{a.week}</span>
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', padding: '1px 16px', borderRadius: '20px', background: st.bg, color: st.fg, fontSize: '11.5px', fontWeight: 800, whiteSpace: 'nowrap' }}>{statusLabel(a.status)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </section>
        )}

        <footer style={{ marginTop: 'auto', paddingTop: '12px', flexShrink: 0 }}>
          <div style={{ padding: '6px 10px', background: C.blueSoft, border: `1px solid ${C.line}`, borderRadius: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 700, lineHeight: 1.6, color: C.blue, flexShrink: 0 }}>
            مقرر المستوى الثاني - قسم الشريعة والقانون - فقه المعاملات (1) - مدرس المقرر: {TEACHER}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', marginTop: '6px' }}>
            <div style={{ fontSize: '12px', color: C.gray, fontWeight: 600 }}>
              <b style={{ color: C.blue }}>العام الدراسي:</b> 1448هـ — 2026م
            </div>

            <div style={{ position: 'relative', width: '220px', height: '78px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <img src="/signature.png" alt="توقيع المدرس" style={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)', width: '190px', height: '64px', objectFit: 'contain', opacity: 0.92, pointerEvents: 'none' }} />
              <div style={{ width: '210px', borderTop: `1.5px solid ${C.blue}`, paddingTop: '2px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: C.blue }}>
                {TEACHER}
              </div>
            </div>
          </div>
        </footer>
      </div>

      <div style={{ height: '4px', background: `linear-gradient(to left, ${C.green}, ${C.cyan} 45%, ${C.blue})`, flexShrink: 0 }} />
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ margin: '0 0 6px', fontSize: '14.5px', fontWeight: 800, color: C.blue, display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.4 }}>
      <span style={{ width: '4px', height: '16px', borderRadius: '2px', background: C.blue, display: 'inline-block' }} />
      {children}
      <span style={{ flex: 1, height: '1px', background: C.line }} />
    </h2>
  )
}

const cardStyle = (border: string, bg: string): React.CSSProperties => ({
  padding: '7px 10px', background: bg, borderTop: `4px solid ${border}`, borderRadius: '6px', textAlign: 'center',
})
const cardLabel: React.CSSProperties = { fontSize: '11.5px', color: C.gray, fontWeight: 700 }
const cardValue: React.CSSProperties = { display: 'block', fontSize: '20px', fontWeight: 800, lineHeight: 1.4, fontVariantNumeric: 'tabular-nums' }
const th: React.CSSProperties = { padding: '6px 8px', background: C.blueSoft, color: C.blue, fontWeight: 800, textAlign: 'right', borderBottom: `2px solid ${C.blue}`, fontSize: '12px' }
const td: React.CSSProperties = { padding: '5px 8px', height: '30px', color: C.ink, borderBottom: `1px solid ${C.line}`, verticalAlign: 'middle', lineHeight: 1.4 }