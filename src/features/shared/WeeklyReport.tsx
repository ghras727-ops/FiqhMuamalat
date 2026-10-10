import type React from 'react'

interface WeekEntry {
  number: number
  title: string
  total_possible: number
  has_attempt: boolean
  auto_score?: number
  manual_score?: number
  final_score?: number
  percent?: number
  status?: string
  submitted_at?: string | null
  rank?: number | null
  class_count?: number
  class_avg?: number
  class_top?: number
}

export interface ReportSnapshot {
  student: { id: string; full_name: string; student_no: string }
  from_week: number
  to_week: number
  type: 'weekly' | 'cumulative'
  weeks: WeekEntry[]
  totals: { total_possible: number; student_total: number; percent: number }
  generated_at: string
}

interface Props {
  snapshot: ReportSnapshot
  reportNumber: string | null
  approvedAt: string
  teacherNote: string | null
}

/* ============ الهوية اللونية ============ */
const C = {
  blue: '#0B6CB3',
  blueSoft: '#E6F2FA',
  cyan: '#49CEF3',
  cyanSoft: '#E8F8FD',
  green: '#198B48',
  greenSoft: '#E8F5ED',
  red: '#D74050',
  redSoft: '#FBEAEC',
  ink: '#123A2E',
  gray: '#4B5D63',
  line: '#D6E4EC',
  paper: '#F7FBFD',
  mute: '#B9C6CC',
}

const TEACHER = 'د. محمد إسماعيل'

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ar-SA-u-nu-latn', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch {
    return '—'
  }
}

function statusLabel(s?: string | null): string {
  if (!s) return '—'
  if (s === 'graded') return 'مصحح'
  if (s === 'submitted') return 'بانتظار التصحيح'
  if (s === 'draft') return 'مسودة'
  return s
}

function statusTone(s?: string | null) {
  if (s === 'graded') return { bg: C.greenSoft, fg: C.green }
  if (s === 'submitted') return { bg: C.blueSoft, fg: C.blue }
  return { bg: '#EEF2F4', fg: C.gray }
}

function percentColor(p: number) {
  return p >= 70 ? C.green : p >= 50 ? C.blue : C.red
}

/* أرقام بصيغة "الدرجة / الكامل" بدون انعكاس الاتجاه في RTL */
function Score({ value, total, style }: { value: React.ReactNode; total: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span dir="ltr" style={{ unicodeBidi: 'isolate', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', ...style }}>
      {value} <span style={{ opacity: 0.45, fontWeight: 500 }}>/</span> {total}
    </span>
  )
}

export default function WeeklyReport({ snapshot, reportNumber, approvedAt, teacherNote }: Props) {
  const { student, from_week, to_week, type, weeks, totals } = snapshot
  const isWeekly = type === 'weekly'
  const gradedWeeks = weeks.filter((w) => w.has_attempt && w.status === 'graded')
  const totalPossible = totals.total_possible
  const studentTotal = totals.student_total
  const percent = totals.percent
  const accent = C.blue
  const accentSoft = C.blueSoft
  const single = gradedWeeks.length === 1 ? gradedWeeks[0] : null

  return (
    <div
      dir="rtl"
      className="print-area"
      style={{
        width: '210mm',
        height: '297mm',
        background: 'white',
        color: C.ink,
        fontFamily: '"Cairo", "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif',
        fontSize: '13px',
        lineHeight: 1.6,
        boxSizing: 'border-box',
        margin: '0 auto',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
        .print-area, .print-area * { font-family: "Cairo", "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif; }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          /* اطبع التقرير وحده: أخفِ كل ما سواه دون أن يشغل مساحة صفحة إضافية */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 295mm !important;
            max-height: 295mm !important;
            overflow: hidden !important;
            background: white !important;
          }
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            /* fixed: يثبّت الورقة على زاوية الصفحة مهما كانت حاويات الواجهة حولها */
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: auto !important;
            bottom: auto !important;
            transform: none !important;
            zoom: 1 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            width: 210mm !important;
            height: 295mm !important;
            max-height: 295mm !important;
            overflow: hidden !important;
          }
          /* ورقة واحدة فقط: لا حاجة لقواعد منع التقسيم داخلها (كروم قد يحذف أو يزيح عناصر بسببها) */
          .print-area, .print-area * {
            break-inside: auto !important;
            page-break-inside: auto !important;
            break-before: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* شريط الهوية العلوي */}
      <div style={{ height: '6px', background: `linear-gradient(to left, ${C.blue}, ${C.cyan} 55%, ${C.green})`, flexShrink: 0 }} />

      <div style={{ padding: '8mm 11mm 8mm', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* ================= الترويسة ================= */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            paddingBottom: '10px',
            borderBottom: `1px solid ${C.line}`,
          }}
        >
          {/* الشعار + الجهة (ثلاثة أسطر) */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/UST.png" alt="شعار الجامعة" style={{ width: '72px', height: '72px', objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ lineHeight: 1.5 }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: C.blue }}>جامعة العلوم والتكنولوجيا</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.ink }}>كلية العلوم الإدارية والإنسانية</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.gray }}>قسم الشريعة والقانون</div>
            </div>
          </div>

          {/* الوسط: المستوى + المقرر */}
          <div
            style={{
              flexShrink: 0,
              textAlign: 'center',
              padding: '0 16px',
              borderInline: `1px solid ${C.line}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span
              style={{
                background: C.blue,
                color: 'white',
                fontWeight: 800,
                fontSize: '14.5px',
                padding: '1px 16px',
                borderRadius: '20px',
              }}
            >
              المستوى الثاني
            </span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: C.green, lineHeight: 1.4 }}>
              المقرر: فقه المعاملات (1)
            </span>
          </div>

          {/* الركن: رقم التقرير + التاريخ */}
          <div
            style={{
              flexShrink: 0,
              minWidth: '118px',
              border: `1px solid ${C.line}`,
              borderRadius: '8px',
              background: C.paper,
              overflow: 'hidden',
              textAlign: 'center',
            }}
          >
            <div style={{ padding: '3px 10px', background: C.blue, color: 'white', fontSize: '10.5px', fontWeight: 700 }}>
              رقم التقرير
            </div>
            <div
              dir="ltr"
              style={{ padding: '3px 10px 0', fontFamily: 'monospace', fontWeight: 800, color: C.blue, fontSize: '12.5px' }}
            >
              {reportNumber ?? '—'}
            </div>
            <div style={{ padding: '0 10px 4px', fontSize: '11px', color: C.gray, fontWeight: 600 }}>
              {fmtDate(approvedAt)}
            </div>
          </div>
        </header>

        {/* ================= شريط المدى ================= */}
        <div
          style={{
            marginTop: '10px',
            padding: '6px 12px',
            background: accentSoft,
            borderInlineStart: `5px solid ${accent}`,
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 800, color: accent }}>
            نتيجة الاختبار الأسبوعية
            <span style={{ margin: '0 8px', color: C.mute }}>|</span>
            {isWeekly
              ? `تقرير الأسبوع ${from_week}`
              : `تقرير تراكمي — من الأسبوع ${from_week} إلى الأسبوع ${to_week}`}
          </div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: C.gray,
              background: '#FFFFFF',
              padding: '2px 12px',
              borderRadius: '20px',
              border: `1px solid ${C.line}`,
              whiteSpace: 'nowrap',
            }}
          >
            عدد الأسابيع: {weeks.length}
          </div>
        </div>

        {/* ================= بيانات الطالب (صف واحد) ================= */}
        <section style={{ marginTop: '12px' }}>
          <SectionTitle>بيانات الطالب</SectionTitle>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '7px 14px',
              border: `1px solid ${C.line}`,
              borderRadius: '8px',
              background: C.paper,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0 }}>
              <span style={{ fontSize: '12.5px', color: C.gray, fontWeight: 700, whiteSpace: 'nowrap' }}>الاسم الكامل:</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: C.ink }}>{student.full_name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontSize: '12.5px', color: C.gray, fontWeight: 700, whiteSpace: 'nowrap' }}>الرقم المعرّف:</span>
              <span dir="ltr" style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 800, color: C.blue, unicodeBidi: 'isolate' }}>
                {student.student_no}
              </span>
            </div>
          </div>
        </section>

        {/* ================= ملخص النتيجة ================= */}
        <section style={{ marginTop: '12px' }}>
          <SectionTitle>ملخص النتيجة</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.3fr 1fr', gap: '8px' }}>
            <div style={cardStyle(C.blue, C.blueSoft)}>
              <div style={cardLabel}>الدرجة المحصّلة</div>
              <Score value={studentTotal} total={totalPossible} style={{ ...cardValue, color: C.blue }} />
            </div>
            <div style={cardStyle(percentColor(percent), percent >= 70 ? C.greenSoft : percent >= 50 ? C.blueSoft : C.redSoft)}>
              <div style={cardLabel}>النسبة المئوية</div>
              <div style={{ ...cardValue, color: percentColor(percent) }}>{percent}%</div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.9)', borderRadius: '4px', marginTop: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, Math.max(0, percent))}%`, height: '100%', background: percentColor(percent) }} />
              </div>
            </div>
            <div style={cardStyle(C.gray, C.paper)}>
              <div style={cardLabel}>ترتيب الطالب</div>
              <div style={{ ...cardValue, color: C.ink }}>
                {single && single.rank ? (
                  <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                    #{single.rank} <span style={{ fontSize: '12px', color: C.gray, fontWeight: 600 }}>من {single.class_count ?? '—'}</span>
                  </span>
                ) : '—'}
              </div>
            </div>
          </div>
        </section>

        {/* ================= تفصيل الأسابيع ================= */}
        <section style={{ marginTop: '12px' }}>
          <SectionTitle>تفصيل الأسابيع</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, border: `1px solid ${C.line}`, borderRadius: '8px', overflow: 'hidden', fontSize: '12.5px' }}>
            <thead>
              <tr>
                <th style={{ ...th, width: '46px', textAlign: 'center' }}>الأسبوع</th>
                <th style={th}>عنوان الدرس</th>
                <th style={{ ...th, width: '80px', textAlign: 'center' }}>الدرجة</th>
                <th style={{ ...th, width: '96px', textAlign: 'center' }}>النسبة</th>
                <th style={{ ...th, width: '92px', textAlign: 'center' }}>الحالة</th>
                <th style={{ ...th, width: '96px', textAlign: 'center' }}>تاريخ الأداء</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => {
                const bg = i % 2 === 1 ? C.paper : 'white'
                const st = w.has_attempt ? statusTone(w.status) : { bg: '#EEF2F4', fg: C.mute }
                const p = w.percent ?? 0
                return (
                  <tr key={w.number} style={{ background: bg }}>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '24px',
                          height: '24px',
                          lineHeight: '24px',
                          borderRadius: '50%',
                          background: C.blueSoft,
                          color: C.blue,
                          fontWeight: 800,
                          fontSize: '12.5px',
                        }}
                      >
                        {w.number}
                      </span>
                    </td>
                    <td style={{ ...td, fontWeight: 700 }}>{w.title || '—'}</td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 800 }}>
                      <Score
                        value={w.has_attempt ? (w.final_score ?? 0) : '—'}
                        total={w.total_possible}
                        style={{ color: w.has_attempt ? C.ink : C.mute }}
                      />
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {w.has_attempt ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                          <span style={{ fontWeight: 800, color: percentColor(p), minWidth: '34px', fontVariantNumeric: 'tabular-nums' }}>{p}%</span>
                          <span style={{ width: '34px', height: '6px', background: '#E8EEF2', borderRadius: '3px', overflow: 'hidden', display: 'inline-block' }}>
                            <span style={{ display: 'block', width: `${Math.min(100, p)}%`, height: '100%', background: percentColor(p) }} />
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: C.mute }}>—</span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '1px 10px',
                          borderRadius: '20px',
                          background: st.bg,
                          color: st.fg,
                          fontSize: '11.5px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {w.has_attempt ? statusLabel(w.status) : 'لا محاولة'}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'center', fontSize: '11.5px', color: C.gray }}>
                      {w.submitted_at ? fmtDate(w.submitted_at) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {/* ================= المقارنة ================= */}
        {gradedWeeks.length > 0 && (() => {
          const w = gradedWeeks[0]
          const max = Math.max(w.total_possible, w.class_top ?? 0, 1)
          return (
            <section style={{ marginTop: '12px', pageBreakInside: 'avoid' }}>
              <SectionTitle>
                {isWeekly ? 'مقارنة أدائك بالمجموعة' : 'المقارنة (تعتمد على أحدث أسبوع مصحح)'}
              </SectionTitle>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '8px 12px',
                  border: `1px solid ${C.line}`,
                  borderRadius: '8px',
                  background: C.paper,
                }}
              >
                <BarRow label="أنت" value={w.final_score ?? 0} max={max} color={C.blue} total={w.total_possible} />
                <BarRow label="متوسط المجموعة" value={w.class_avg ?? 0} max={max} color={C.cyan} total={w.total_possible} />
                <BarRow label="أعلى نتيجة" value={w.class_top ?? 0} max={max} color={C.green} total={w.total_possible} />
              </div>
            </section>
          )
        })()}

        {/* ================= ملاحظة المدرس ================= */}
        {teacherNote && (
          <section style={{ marginTop: '12px', pageBreakInside: 'avoid' }}>
            <SectionTitle>ملاحظة المدرس</SectionTitle>
            <div
              style={{
                padding: '8px 12px',
                background: C.paper,
                border: `1px solid ${C.line}`,
                borderInlineStart: `5px solid ${C.blue}`,
                borderRadius: '8px',
                fontSize: '13px',
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
                color: C.ink,
                fontWeight: 500,
              }}
            >
              {teacherNote}
            </div>
          </section>
        )}

        {/* ================= التذييل + التوقيع ================= */}
        <footer style={{ marginTop: 'auto', paddingTop: '8px', flexShrink: 0 }}>
          <div
            style={{
              padding: '6px 10px',
              background: C.blueSoft,
              border: `1px solid ${C.line}`,
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 700,
              lineHeight: 1.6,
              color: C.blue,
              flexShrink: 0,
            }}
          >
            مقرر المستوى الثاني - قسم الشريعة والقانون - فقه المعاملات (1) - مدرس المقرر: {TEACHER}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', marginTop: '6px' }}>
            <div style={{ fontSize: '12px', color: C.gray, fontWeight: 600 }}>
              <b style={{ color: C.blue }}>العام الدراسي:</b> 1448هـ — 2026م
            </div>

            <div style={{ position: 'relative', width: '220px', height: '78px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <img
                src="/signature.png"
                alt="توقيع المدرس"
                style={{
                  position: 'absolute',
                  top: '-4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '190px',
                  height: '64px',
                  objectFit: 'contain',
                  opacity: 0.92,
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  width: '210px',
                  borderTop: `1.5px solid ${C.blue}`,
                  paddingTop: '2px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: C.blue,
                }}
              >
                {TEACHER}
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* شريط الهوية السفلي */}
      <div style={{ height: '4px', background: `linear-gradient(to left, ${C.green}, ${C.cyan} 45%, ${C.blue})`, flexShrink: 0 }} />
    </div>
  )
}

/* ============ مكوّنات وأنماط فرعية ============ */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: '0 0 6px',
        fontSize: '14.5px',
        fontWeight: 800,
        color: C.blue,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        lineHeight: 1.4,
      }}
    >
      <span style={{ width: '4px', height: '16px', borderRadius: '2px', background: C.blue, display: 'inline-block' }} />
      {children}
      <span style={{ flex: 1, height: '1px', background: C.line }} />
    </h2>
  )
}

function BarRow({ label, value, max, color, total }: { label: string; value: number; max: number; color: string; total: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ width: '96px', fontSize: '12.5px', fontWeight: 700, color: C.ink, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '12px', background: '#E8EEF2', borderRadius: '6px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '6px' }} />
      </div>
      <Score value={value} total={total} style={{ width: '64px', textAlign: 'start', fontSize: '12.5px', fontWeight: 800, color: C.ink, flexShrink: 0 }} />
    </div>
  )
}

const cardStyle = (border: string, bg: string): React.CSSProperties => ({
  padding: '7px 10px',
  background: bg,
  borderTop: `4px solid ${border}`,
  borderRadius: '6px',
  textAlign: 'center',
})

const cardLabel: React.CSSProperties = { fontSize: '11.5px', color: C.gray, fontWeight: 700 }

const cardValue: React.CSSProperties = {
  display: 'block',
  fontSize: '20px',
  fontWeight: 800,
  lineHeight: 1.4,
  fontVariantNumeric: 'tabular-nums',
}

const th: React.CSSProperties = {
  padding: '6px 8px',
  background: C.blueSoft,
  color: C.blue,
  fontWeight: 800,
  textAlign: 'right',
  borderBottom: `2px solid ${C.blue}`,
  fontSize: '12px',
}

const td: React.CSSProperties = {
  padding: '5px 8px',
  height: '30px',
  color: C.ink,
  borderBottom: `1px solid ${C.line}`,
  verticalAlign: 'middle',
  lineHeight: 1.4,
}