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

export default function WeeklyReport({ snapshot, reportNumber, approvedAt, teacherNote }: Props) {
  const { student, from_week, to_week, type, weeks, totals } = snapshot
  const isWeekly = type === 'weekly'
  const gradedWeeks = weeks.filter((w) => w.has_attempt && w.status === 'graded')
  const totalPossible = totals.total_possible
  const studentTotal = totals.student_total
  const percent = totals.percent

  return (
    <div
      dir="rtl"
      className="print-area"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '10mm 12mm',
        background: 'white',
        color: '#123A2E',
        fontFamily: '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif',
        fontSize: '14px',
        lineHeight: 1.8,
        boxSizing: 'border-box',
        margin: '0 auto',
      }}
    >
      {/* ================= الترويسة ================= */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          borderBottom: '3px solid #0B6CB3',
          paddingBottom: '12px',
        }}
      >
        <img src="/UST.png" alt="شعار الجامعة" style={{ width: '90px', height: '90px', objectFit: 'contain' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0B6CB3', lineHeight: 1.3 }}>
            جامعة العلوم والتكنولوجيا
          </div>
          <div style={{ fontSize: '17px', color: '#198B48', fontWeight: 700, marginTop: '3px' }}>
            مقرر فقه المعاملات - 1
          </div>
          <div style={{ fontSize: '16px', color: '#4B5D63', marginTop: '3px', fontWeight: 600 }}>
            نتيجة الاختبار الأسبوعية
          </div>
        </div>
        <div style={{ textAlign: 'left', fontSize: '12px', color: '#4B5D63', lineHeight: 1.6 }}>
          {reportNumber && (
            <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0B6CB3', fontSize: '13px' }}>
              {reportNumber}
            </div>
          )}
          <div style={{ marginTop: '2px' }}>
            <b style={{ color: '#0B6CB3' }}>تاريخ الإصدار</b>
          </div>
          <div>{fmtDate(approvedAt)}</div>
        </div>
      </header>

      {/* ================= عنوان المدى + عدد الأسابيع ================= */}
      <div
        style={{
          marginTop: '14px',
          padding: '10px 14px',
          background: isWeekly ? '#E6F2FA' : '#E8F5ED',
          borderInlineStart: '5px solid ' + (isWeekly ? '#0B6CB3' : '#198B48'),
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ fontSize: '18px', fontWeight: 800, color: isWeekly ? '#0B6CB3' : '#198B48' }}>
          {isWeekly
            ? `تقرير الأسبوع ${from_week}`
            : `تقرير تراكمي — من الأسبوع ${from_week} إلى الأسبوع ${to_week}`}
        </div>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#4B5D63',
            background: '#FFFFFF',
            padding: '4px 12px',
            borderRadius: '20px',
          }}
        >
          عدد الأسابيع: {weeks.length}
        </div>
      </div>

      {/* ================= بيانات الطالب ================= */}
      <section style={{ marginTop: '16px' }}>
        <h2 style={sectionTitleStyle}>بيانات الطالب</h2>
        <table style={tableStyle}>
          <tbody>
            <tr>
              <td style={labelCellStyle}>الاسم الكامل</td>
              <td style={{ ...valueCellStyle, fontWeight: 700 }} colSpan={3}>
                {student.full_name}
              </td>
            </tr>
            <tr>
              <td style={labelCellStyle}>الرقم الجامعي</td>
              <td style={valueCellStyle}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }} dir="ltr">
                  {student.student_no}
                </span>
              </td>
              <td style={labelCellStyle}>المستوى</td>
              <td style={valueCellStyle}>الثاني</td>
            </tr>
            <tr>
              <td style={labelCellStyle}>المقرر</td>
              <td style={valueCellStyle}>فقه المعاملات - 1</td>
              <td style={labelCellStyle}>المدرس</td>
              <td style={valueCellStyle}>د. محمد إسماعيل</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ================= ملخص النتيجة ================= */}
      <section style={{ marginTop: '16px' }}>
        <h2 style={sectionTitleStyle}>ملخص النتيجة</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
          <SummaryCard label="الدرجة المحصّلة" value={`${studentTotal} / ${totalPossible}`} tone="primary" />
          <SummaryCard label="النسبة المئوية" value={`${percent}%`} tone={percent >= 70 ? 'success' : percent >= 50 ? 'info' : 'error'} />
          <SummaryCard
            label="ترتيب الطالب"
            value={
              gradedWeeks.length === 1 && gradedWeeks[0].rank
                ? `#${gradedWeeks[0].rank} من ${gradedWeeks[0].class_count ?? '—'}`
                : '—'
            }
            tone="ink"
          />
          <SummaryCard
            label="متوسط المجموعة"
            value={
              gradedWeeks.length === 1 && gradedWeeks[0].class_avg !== undefined
                ? `${gradedWeeks[0].class_avg} / ${gradedWeeks[0].total_possible}`
                : '—'
            }
            tone="ink"
          />
        </div>
      </section>

      {/* ================= جدول تفصيل الأسابيع (مضغوط) ================= */}
      <section style={{ marginTop: '16px' }}>
        <h2 style={sectionTitleStyle}>تفصيل الأسابيع</h2>
        <table style={compactTableStyle}>
          <thead>
            <tr>
              <th style={{ ...compactHeaderCellStyle, width: '55px' }}>الأسبوع</th>
              <th style={compactHeaderCellStyle}>عنوان الدرس</th>
              <th style={{ ...compactHeaderCellStyle, width: '85px' }}>الدرجة</th>
              <th style={{ ...compactHeaderCellStyle, width: '60px' }}>النسبة</th>
              <th style={{ ...compactHeaderCellStyle, width: '100px' }}>الحالة</th>
              <th style={{ ...compactHeaderCellStyle, width: '100px' }}>تاريخ الأداء</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.number}>
                <td style={{ ...compactBodyCellStyle, textAlign: 'center', fontWeight: 800, color: '#0B6CB3' }}>
                  {w.number}
                </td>
                <td style={{ ...compactBodyCellStyle, fontWeight: 600 }}>{w.title || '—'}</td>
                <td style={{ ...compactBodyCellStyle, textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>
                  {w.has_attempt
                    ? `${w.final_score ?? 0} / ${w.total_possible}`
                    : `— / ${w.total_possible}`}
                </td>
                <td style={{ ...compactBodyCellStyle, textAlign: 'center', fontWeight: 800, color: w.has_attempt ? '#0B6CB3' : '#B9C6CC' }}>
                  {w.has_attempt ? `${w.percent ?? 0}%` : '—'}
                </td>
                <td style={{ ...compactBodyCellStyle, textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>
                  {w.has_attempt ? statusLabel(w.status) : 'لا محاولة'}
                </td>
                <td style={{ ...compactBodyCellStyle, textAlign: 'center', fontSize: '12px', color: '#4B5D63' }}>
                  {w.submitted_at ? fmtDate(w.submitted_at) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ================= الرسم البياني ================= */}
      {gradedWeeks.length > 0 && (() => {
        const w = gradedWeeks[0]
        const max = Math.max(w.total_possible, w.class_top ?? 0, 1)
        const studentVal = w.final_score ?? 0
        const avgVal = w.class_avg ?? 0
        const topVal = w.class_top ?? 0
        return (
          <section style={{ marginTop: '16px', pageBreakInside: 'avoid' }}>
            <h2 style={sectionTitleStyle}>
              {isWeekly ? 'مقارنة أدائك بالمجموعة' : 'المقارنة (تعتمد على أحدث أسبوع مصحح)'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <BarRow label="أنت" value={studentVal} max={max} color="#0B6CB3" suffix={` / ${w.total_possible}`} />
              <BarRow label="متوسط المجموعة" value={avgVal} max={max} color="#49CEF3" suffix={` / ${w.total_possible}`} />
              <BarRow label="أعلى نتيجة" value={topVal} max={max} color="#198B48" suffix={` / ${w.total_possible}`} />
            </div>
          </section>
        )
      })()}

      {/* ================= ملاحظة الأستاذ ================= */}
      {teacherNote && (
        <section style={{ marginTop: '16px', pageBreakInside: 'avoid' }}>
          <h2 style={sectionTitleStyle}>ملاحظة المدرس</h2>
          <div
            style={{
              padding: '12px 14px',
              background: '#F7FBFD',
              border: '1px solid #D6E4EC',
              borderInlineStart: '5px solid #0B6CB3',
              borderRadius: '8px',
              fontSize: '14px',
              lineHeight: 1.9,
              whiteSpace: 'pre-wrap',
              color: '#123A2E',
              fontWeight: 500,
            }}
          >
            {teacherNote}
          </div>
        </section>
      )}

      {/* ================= التذييل + التوقيع (مضغوط) ================= */}
      <footer
        style={{
          marginTop: '20px',
          paddingTop: '10px',
          borderTop: '3px solid #0B6CB3',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '16px',
          pageBreakInside: 'avoid',
        }}
      >
        <div style={{ fontSize: '12px', color: '#4B5D63', lineHeight: 1.8 }}>
          <div>
            <b style={{ color: '#0B6CB3' }}>مدرس المقرر:</b>{' '}
            <span style={{ fontWeight: 700, color: '#123A2E' }}>د. محمد إسماعيل</span>
          </div>
          <div>
            <b style={{ color: '#0B6CB3' }}>تاريخ الإصدار:</b> {fmtDate(approvedAt)}
          </div>
          <div>
            <b style={{ color: '#0B6CB3' }}>العام الدراسي:</b> 1448هـ — 2026م
          </div>
          {reportNumber && (
            <div style={{ fontFamily: 'monospace', marginTop: '2px' }}>
              <b style={{ color: '#0B6CB3' }}>رقم التقرير:</b> {reportNumber}
            </div>
          )}
        </div>

        {/* التوقيع متراكب فوق اسم المدرس */}
        <div
          style={{
            position: 'relative',
            width: '170px',
            height: '70px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          {/* صورة التوقيع فوق الخط */}
          <img
            src="/signature.png"
            alt="توقيع المدرس"
            style={{
              position: 'absolute',
              top: '-4px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '140px',
              height: '55px',
              objectFit: 'contain',
              opacity: 0.92,
              pointerEvents: 'none',
            }}
          />
          {/* خط الاسم */}
          <div
            style={{
              width: '160px',
              borderTop: '1.5px solid #0B6CB3',
              paddingTop: '3px',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 700,
              color: '#0B6CB3',
            }}
          >
            د. محمد إسماعيل
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ============ أنماط فرعية ============ */
const sectionTitleStyle: React.CSSProperties = {
  fontSize: '17px',
  fontWeight: 800,
  color: '#0B6CB3',
  marginBottom: '8px',
  paddingBottom: '4px',
  borderBottom: '2px solid #D6E4EC',
  letterSpacing: '0.2px',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  border: '1px solid #D6E4EC',
  fontSize: '14px',
  background: 'white',
}


const labelCellStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: '#F7FBFD',
  fontWeight: 700,
  color: '#0B6CB3',
  width: '140px',
  borderBottom: '1px solid #D6E4EC',
  fontSize: '14px',
}

const valueCellStyle: React.CSSProperties = {
  padding: '8px 12px',
  color: '#123A2E',
  borderBottom: '1px solid #D6E4EC',
  fontSize: '14px',
  fontWeight: 500,
}

/* ============ أنماط الجدول المضغوط ============ */
const compactTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  border: '1px solid #D6E4EC',
  fontSize: '13px',
  background: 'white',
}

const compactHeaderCellStyle: React.CSSProperties = {
  padding: '6px 8px',
  background: '#E6F2FA',
  color: '#0B6CB3',
  fontWeight: 800,
  textAlign: 'right',
  borderBottom: '2px solid #0B6CB3',
  fontSize: '13px',
}

const compactBodyCellStyle: React.CSSProperties = {
  padding: '5px 8px',
  color: '#123A2E',
  borderBottom: '1px solid #D6E4EC',
  fontSize: '13px',
  lineHeight: 1.4,
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: 'primary' | 'success' | 'info' | 'error' | 'ink' }) {
  const tones: Record<string, { bg: string; border: string; text: string }> = {
    primary: { bg: '#E6F2FA', border: '#0B6CB3', text: '#0B6CB3' },
    success: { bg: '#E8F5ED', border: '#198B48', text: '#198B48' },
    info:    { bg: '#E8F8FD', border: '#49CEF3', text: '#0B6CB3' },
    error:   { bg: '#FBEAEC', border: '#D74050', text: '#D74050' },
    ink:     { bg: '#F7FBFD', border: '#4B5D63', text: '#123A2E' },
  }
  const t = tones[tone]
  return (
    <div
      style={{
        padding: '10px 8px',
        background: t.bg,
        borderTop: `4px solid ${t.border}`,
        borderRadius: '6px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '12px', color: '#4B5D63', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '19px', fontWeight: 800, color: t.text, marginTop: '3px', fontFamily: 'monospace' }}>
        {value}
      </div>
    </div>
  )
}

function BarRow({ label, value, max, color, suffix }: { label: string; value: number; max: number; color: string; suffix: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '14px',
          color: '#123A2E',
          marginBottom: '3px',
          fontWeight: 700,
        }}
      >
        <span>{label}</span>
        <span style={{ fontFamily: 'monospace' }}>{value}{suffix}</span>
      </div>
      <div style={{ height: '16px', background: '#F0F4F7', borderRadius: '8px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: '8px',
            transition: 'width 0.3s',
          }}
        />
      </div>
    </div>
  )
}
