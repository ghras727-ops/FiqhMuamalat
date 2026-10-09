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
        padding: '12mm 14mm',
        background: 'white',
        color: '#1F2937',
        fontFamily: '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif',
        fontSize: '11px',
        lineHeight: 1.6,
        boxSizing: 'border-box',
        margin: '0 auto',
      }}
    >
      {/* ================= الترويسة ================= */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '2px solid #0B6CB3', paddingBottom: '8px' }}>
        <img
          src="/UST.png"
          alt="شعار الجامعة"
          style={{ width: '70px', height: '70px', objectFit: 'contain' }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#0B6CB3' }}>
            جامعة العلوم والتكنولوجيا
          </div>
          <div style={{ fontSize: '13px', color: '#198B48', fontWeight: 600, marginTop: '2px' }}>
            مقرر فقه المعاملات - 1
          </div>
          <div style={{ fontSize: '12px', color: '#4B5D63', marginTop: '2px' }}>
            تقرير الأداء الأكاديمي الفردي
          </div>
        </div>
        <div style={{ textAlign: 'left', fontSize: '10px', color: '#4B5D63' }}>
          {reportNumber && (
            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0B6CB3' }}>
              {reportNumber}
            </div>
          )}
          <div>تاريخ الإصدار</div>
          <div>{fmtDate(approvedAt)}</div>
        </div>
      </header>

      {/* ================= عنوان المدى ================= */}
      <div
        style={{
          marginTop: '14px',
          padding: '8px 12px',
          background: isWeekly ? '#E6F2FA' : '#E8F5ED',
          borderInlineStart: '4px solid ' + (isWeekly ? '#0B6CB3' : '#198B48'),
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 700,
          color: isWeekly ? '#0B6CB3' : '#198B48',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>
          {isWeekly
            ? `تقرير الأسبوع ${from_week}`
            : `تقرير تراكمي — من الأسبوع ${from_week} إلى الأسبوع ${to_week}`}
        </span>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#4B5D63' }}>
          عدد الأسابيع: {weeks.length}
        </span>
      </div>

      {/* ================= بيانات الطالب ================= */}
      <section style={{ marginTop: '14px' }}>
        <h2 style={sectionTitleStyle}>بيانات الطالب</h2>
        <table style={tableStyle}>
          <tbody>
            <tr>
              <td style={labelCellStyle}>الاسم الكامل</td>
              <td style={valueCellStyle} colSpan={3}>{student.full_name}</td>
            </tr>
            <tr>
              <td style={labelCellStyle}>الرقم الجامعي</td>
              <td style={valueCellStyle}>
                <span style={{ fontFamily: 'monospace' }} dir="ltr">{student.student_no}</span>
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
      <section style={{ marginTop: '14px' }}>
        <h2 style={sectionTitleStyle}>ملخص النتيجة</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
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

      {/* ================= جدول النتائج ================= */}
      <section style={{ marginTop: '14px' }}>
        <h2 style={sectionTitleStyle}>تفصيل الأسابيع</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...headerCellStyle, width: '50px' }}>الأسبوع</th>
              <th style={headerCellStyle}>الدرس / النشاط</th>
              <th style={{ ...headerCellStyle, width: '70px' }}>الدرجة</th>
              <th style={{ ...headerCellStyle, width: '60px' }}>النسبة</th>
              <th style={{ ...headerCellStyle, width: '90px' }}>الحالة</th>
              <th style={{ ...headerCellStyle, width: '90px' }}>تاريخ الأداء</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.number}>
                <td style={{ ...bodyCellStyle, textAlign: 'center', fontWeight: 700 }}>
                  {w.number}
                </td>
                <td style={bodyCellStyle}>{w.title || '—'}</td>
                <td style={{ ...bodyCellStyle, textAlign: 'center', fontFamily: 'monospace' }}>
                  {w.has_attempt
                    ? `${w.final_score ?? 0} / ${w.total_possible}`
                    : `— / ${w.total_possible}`}
                </td>
                <td style={{ ...bodyCellStyle, textAlign: 'center', fontWeight: 700, color: w.has_attempt ? '#0B6CB3' : '#B9C6CC' }}>
                  {w.has_attempt ? `${w.percent ?? 0}%` : '—'}
                </td>
                <td style={{ ...bodyCellStyle, textAlign: 'center', fontSize: '10px' }}>
                  {w.has_attempt ? statusLabel(w.status) : 'لا محاولة'}
                </td>
                <td style={{ ...bodyCellStyle, textAlign: 'center', fontSize: '10px' }}>
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
          <section style={{ marginTop: '14px' }}>
            <h2 style={sectionTitleStyle}>
              {isWeekly ? 'مقارنة أدائك بالمجموعة' : 'المقارنة (تعتمد على أحدث أسبوع مصحح)'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <BarRow label="أنت" value={studentVal} max={max} color="#0B6CB3" suffix={` / ${w.total_possible}`} />
              <BarRow label="متوسط المجموعة" value={avgVal} max={max} color="#49CEF3" suffix={` / ${w.total_possible}`} />
              <BarRow label="أعلى نتيجة" value={topVal} max={max} color="#198B48" suffix={` / ${w.total_possible}`} />
            </div>
          </section>
        )
      })()}

      {/* ================= ملاحظة الأستاذ ================= */}
      {teacherNote && (
        <section style={{ marginTop: '14px' }}>
          <h2 style={sectionTitleStyle}>ملاحظة المدرس</h2>
          <div
            style={{
              padding: '10px 12px',
              background: '#F7FBFD',
              border: '1px solid #D6E4EC',
              borderInlineStart: '4px solid #0B6CB3',
              borderRadius: '6px',
              fontSize: '11px',
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
              color: '#1F2937',
            }}
          >
            {teacherNote}
          </div>
        </section>
      )}

      {/* ================= التذييل + التوقيع ================= */}
      <footer
        style={{
          marginTop: '24px',
          paddingTop: '12px',
          borderTop: '2px solid #0B6CB3',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ fontSize: '10px', color: '#4B5D63', lineHeight: 1.8 }}>
          <div>
            <b style={{ color: '#0B6CB3' }}>مدرس المقرر:</b> د. محمد إسماعيل
          </div>
          <div>
            <b>تاريخ الإصدار:</b> {fmtDate(approvedAt)}
          </div>
          <div>
            <b>العام الدراسي:</b> 1448هـ — 2026م
          </div>
          {reportNumber && (
            <div style={{ fontFamily: 'monospace', marginTop: '4px' }}>
              <b>رقم التقرير:</b> {reportNumber}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center' }}>
          <img
            src="/signature.png"
            alt="توقيع المدرس"
            style={{ width: '130px', height: '60px', objectFit: 'contain' }}
          />
          <div style={{ marginTop: '2px', fontSize: '10px', color: '#4B5D63' }}>
            د. محمد إسماعيل
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ============ أنماط فرعية ============ */
const sectionTitleStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#0B6CB3',
  marginBottom: '6px',
  paddingBottom: '2px',
  borderBottom: '1px solid #D6E4EC',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  border: '1px solid #D6E4EC',
  fontSize: '11px',
  background: 'white',
}

const headerCellStyle: React.CSSProperties = {
  padding: '6px 8px',
  background: '#E6F2FA',
  color: '#0B6CB3',
  fontWeight: 700,
  textAlign: 'right',
  borderBottom: '2px solid #0B6CB3',
  fontSize: '10px',
}

const labelCellStyle: React.CSSProperties = {
  padding: '6px 8px',
  background: '#F7FBFD',
  fontWeight: 600,
  color: '#4B5D63',
  width: '120px',
  borderBottom: '1px solid #D6E4EC',
  fontSize: '10px',
}

const valueCellStyle: React.CSSProperties = {
  padding: '6px 8px',
  color: '#1F2937',
  borderBottom: '1px solid #D6E4EC',
  fontSize: '11px',
}

const bodyCellStyle: React.CSSProperties = {
  padding: '5px 8px',
  color: '#1F2937',
  borderBottom: '1px solid #D6E4EC',
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: 'primary' | 'success' | 'info' | 'error' | 'ink' }) {
  const tones: Record<string, { bg: string; border: string; text: string }> = {
    primary: { bg: '#E6F2FA', border: '#0B6CB3', text: '#0B6CB3' },
    success: { bg: '#E8F5ED', border: '#198B48', text: '#198B48' },
    info:    { bg: '#E8F8FD', border: '#49CEF3', text: '#0B6CB3' },
    error:   { bg: '#FBEAEC', border: '#D74050', text: '#D74050' },
    ink:     { bg: '#F7FBFD', border: '#4B5D63', text: '#1F2937' },
  }
  const t = tones[tone]
  return (
    <div
      style={{
        padding: '8px 10px',
        background: t.bg,
        borderTop: `3px solid ${t.border}`,
        borderRadius: '4px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '9px', color: '#4B5D63', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: t.text, marginTop: '2px', fontFamily: 'monospace' }}>
        {value}
      </div>
    </div>
  )
}

function BarRow({ label, value, max, color, suffix }: { label: string; value: number; max: number; color: string; suffix: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#4B5D63', marginBottom: '2px' }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ fontFamily: 'monospace' }}>{value}{suffix}</span>
      </div>
      <div style={{ height: '12px', background: '#F0F4F7', borderRadius: '6px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: '6px',
            transition: 'width 0.3s',
          }}
        />
      </div>
    </div>
  )
}