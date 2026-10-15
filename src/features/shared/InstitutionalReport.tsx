import type React from 'react'
import { useEffect, useRef } from 'react'

interface WeekMeta { id: string; number: number; title: string }
interface WeekData {
  week_number: number
  score: number | null
  possible: number
  percent: number | null
  status: string | null
  attendance: string | null
}
interface StudentRow {
  id: string
  full_name: string
  student_no: string | null
  weeks: WeekData[]
  total_score: number
  total_possible: number
  percent: number | null
  attendance_present: number
  attendance_excused: number
}

export interface InstitutionalSnapshot {
  from_week: number
  to_week: number
  weeks: WeekMeta[]
  students: StudentRow[]
  total_students: number
  generated_at: string
}

export type ReportMode = 'grades' | 'attendance'

interface Props {
  snapshot: InstitutionalSnapshot
  generatedAt: string
  mode: ReportMode
}

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
  lineSoft: '#EEF3F6',
  paper: '#F7FBFD',
  mute: '#B9C6CC',
}

const TEACHER = 'د. محمد إسماعيل'

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-SA-u-nu-latn', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return '—' }
}

function pctColor(p: number | null): string {
  if (p === null) return C.mute
  return p >= 70 ? C.green : p >= 50 ? C.blue : C.red
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export default function InstitutionalReport({ snapshot, generatedAt, mode }: Props) {
  const { weeks, students, from_week, to_week, total_students } = snapshot
  const weeksCount = weeks.length

  // الطباعة عبر iframe معزول يحتوي التقرير وحده، بعيدًا عن أي CSS أو مودال في التطبيق.
  // أثناء عرض هذا المكوّن نستبدل window.print بنسخة تطبع الـ iframe، ثم نعيدها عند الإغلاق.
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const originalPrint = window.print.bind(window)

    const printIsolated = () => {
      const el = rootRef.current
      if (!el) { originalPrint(); return }

      const iframe = document.createElement('iframe')
      iframe.setAttribute('aria-hidden', 'true')
      iframe.style.cssText =
        'position:fixed;right:0;bottom:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;'
      iframe.srcdoc =
        '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">' +
        '<style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0;background:#fff}</style>' +
        '</head><body>' + el.outerHTML + '</body></html>'

      iframe.onload = async () => {
        const w = iframe.contentWindow
        const d = iframe.contentDocument
        if (!w || !d) { iframe.remove(); return }
        try { await d.fonts.ready } catch { /* تجاهل */ }
        await Promise.all(
          Array.from(d.images).map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res() }),
          ),
        )
        await new Promise((r) => setTimeout(r, 400)) // مهلة قصيرة لتحميل خط Cairo
        w.focus()
        w.print()
        setTimeout(() => iframe.remove(), 60000)
      }
      document.body.appendChild(iframe)
    }

    // توليد PDF مباشر (صفحة A4 دقيقة) دون المرور بتقسيم المتصفح للصفحات
    const exportPdf = async () => {
      const el = rootRef.current
      if (!el) throw new Error('no element')
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      try { await document.fonts.ready } catch { /* تجاهل */ }
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (doc) => {
          // توسيع الصفوف في الصورة الملتقطة فقط حتى لا تُقص الأسماء العربية من الأسفل
          const st = doc.createElement('style')
          st.textContent =
            '.print-area td, .print-area th { line-height: 2.1 !important; padding-top: 5px !important; padding-bottom: 7px !important; overflow: visible !important; }' +
            '.print-area td, .print-area th, .print-area span, .print-area div { letter-spacing: 0 !important; }'
          doc.head.appendChild(st)
        },
      })
      const img = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
      const pageW = 210
      const pageH = 297
      const imgH = (canvas.height * pageW) / canvas.width
      if (imgH > pageH && imgH <= pageH * 1.12) {
        // زيادة طفيفة: نصغّر قليلًا ليبقى التقرير في صفحة واحدة
        const w = (pageW * pageH) / imgH
        pdf.addImage(img, 'PNG', (pageW - w) / 2, 0, w, pageH, undefined, 'FAST')
      } else {
        pdf.addImage(img, 'PNG', 0, 0, pageW, imgH, undefined, 'FAST')
        let left = imgH - pageH
        let pos = 0
        while (left > 1) {
          pos -= pageH
          pdf.addPage()
          pdf.addImage(img, 'PNG', 0, pos, pageW, imgH, undefined, 'FAST')
          left -= pageH
        }
      }
      pdf.save(`institutional-report-weeks-${from_week}-${to_week}.pdf`)
    }

    window.print = () => { exportPdf().catch(() => printIsolated()) }
    return () => { window.print = originalPrint }
  }, [from_week, to_week])

  // حسابات النتائج
  const graded = students.filter((s) => s.percent !== null)
  const classAvg = graded.length === 0 ? 0
    : Math.round(graded.reduce((t, s) => t + (s.percent ?? 0), 0) / graded.length)
  const topPercent = graded.length === 0 ? 0
    : Math.max(...graded.map((s) => s.percent ?? 0))
  const lowPercent = graded.length === 0 ? 0
    : Math.min(...graded.map((s) => s.percent ?? 0))

  // الترتيب
  const ranked = [...students].sort((a, b) => {
    if (a.percent === null && b.percent === null) return 0
    if (a.percent === null) return 1
    if (b.percent === null) return -1
    return (b.percent ?? 0) - (a.percent ?? 0)
  })
  const rankMap: Record<string, number> = {}
  ranked.forEach((s, i) => { rankMap[s.id] = i + 1 })

  // الحضور
  const totalAttPossible = students.length * weeksCount
  const totalAttPresent = students.reduce((t, s) => t + s.attendance_present, 0)
  const classAttPercent = totalAttPossible === 0 ? 0
    : Math.round((totalAttPresent / totalAttPossible) * 100)

  const isGrades = mode === 'grades'
  const isAtt = mode === 'attendance'

  const titleLine = isGrades
    ? 'التقرير المؤسسي — كشف النتائج'
    : 'التقرير المؤسسي — كشف الحضور والغياب'

  return (
    <div
      ref={rootRef}
      dir="rtl"
      className="print-area"
      style={{
        width: '210mm',
        minHeight: '265mm',
        background: 'white',
        color: C.ink,
        fontFamily: '"Cairo", "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif',
        fontSize: '11px',
        lineHeight: 1.5,
        boxSizing: 'border-box',
        margin: '0 auto',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
        .print-area, .print-area * { font-family: "Cairo", "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif; }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; height: auto !important; overflow: visible !important; }
          .print-area {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            position: static !important;
            width: 210mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* شريط الهوية العلوي */}
      <div style={{ height: '6px', background: `linear-gradient(to left, ${C.blue}, ${C.cyan} 55%, ${C.green})` }} />

      <div style={{ padding: '8mm 10mm', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* ============ الترويسة ============ */}
        <header style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '10px', borderBottom: `2px solid ${C.blue}` }}>
          <img src="/UST.png" alt="شعار الجامعة" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: C.blue }}>جامعة العلوم والتكنولوجيا</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink }}>كلية العلوم الإدارية والإنسانية</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.gray }}>قسم الشريعة والقانون</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: isGrades ? C.blue : C.green, marginTop: '3px' }}>
              {titleLine} — فقه المعاملات (1)
            </div>
          </div>
          <div style={{ textAlign: 'left', fontSize: '11px', color: C.gray, lineHeight: 1.6 }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: C.blue }}>الأسابيع: {from_week}–{to_week}</div>
            <div>عدد الأسابيع: {weeksCount}</div>
            <div style={{ marginTop: '2px' }}>{fmtDate(generatedAt)}</div>
            <div style={{ marginTop: '2px' }}>1448هـ — 2026م</div>
          </div>
        </header>

        {/* ============ الملخص ============ */}
        <section style={{ marginTop: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isGrades ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)', gap: '6px' }}>
            <SummaryCard label="عدد الطلاب" value={String(total_students)} tone="primary" />
            {isGrades && (
              <>
                <SummaryCard label="متوسط النتائج" value={`${classAvg}%`} tone={classAvg >= 70 ? 'success' : classAvg >= 50 ? 'info' : 'error'} />
                <SummaryCard label="أعلى نتيجة" value={`${topPercent}%`} tone="success" />
                <SummaryCard label="أدنى نتيجة" value={graded.length > 0 ? `${lowPercent}%` : '—'} tone={lowPercent < 50 ? 'error' : 'ink'} />
              </>
            )}
            {isAtt && (
              <>
                <SummaryCard label="متوسط الحضور" value={`${classAttPercent}%`} tone={classAttPercent >= 80 ? 'success' : classAttPercent >= 60 ? 'info' : 'error'} />
                <SummaryCard label="إجمالي الحضور" value={`${totalAttPresent} / ${totalAttPossible}`} tone="success" />
                <SummaryCard label="إجمالي الغياب" value={String(totalAttPossible - totalAttPresent)} tone={classAttPercent >= 80 ? 'ink' : 'error'} />
              </>
            )}
          </div>
        </section>

        {/* ============ جدول النتائج ============ */}
        {isGrades && (
          <section style={{ marginTop: '14px' }}>
            <SectionTitle>📊 كشف النتائج</SectionTitle>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thCell, width: '28px' }}>#</th>
                  <th style={thCell}>الطالب</th>
                  <th style={{ ...thCell, width: '60px' }}>الرقم</th>
                  {weeks.map((w) => (
                    <th key={w.id} style={{ ...thCell, width: '36px', textAlign: 'center' }}>أ{w.number}</th>
                  ))}
                  <th style={{ ...thCell, width: '76px', textAlign: 'center', whiteSpace: 'nowrap' }}>المجموع</th>
                  <th style={{ ...thCell, width: '52px', textAlign: 'center' }}>النسبة</th>
                  <th style={{ ...thCell, width: '44px', textAlign: 'center' }}>الترتيب</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => {
                  const prev = idx > 0 ? students[idx - 1] : null
                  const sameRankAsPrev = prev && prev.percent !== null && s.percent === prev.percent
                  const rank = rankMap[s.id]
                  const total1 = round1(s.total_score)
                  return (
                    <tr key={s.id} style={{ background: idx % 2 === 1 ? C.paper : 'white' }}>
                      <td style={{ ...tdCell, textAlign: 'center', fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ ...tdCell, fontWeight: 700 }}>{s.full_name}</td>
                      <td style={{ ...tdCell, fontFamily: 'monospace', fontSize: '10px' }} dir="ltr">{s.student_no ?? '—'}</td>
                      {s.weeks.map((wd, i) => {
                        const hasScore = wd.status === 'graded' && wd.score !== null
                        return (
                          <td key={i} style={{ ...tdCell, textAlign: 'center', fontWeight: 700, color: hasScore ? pctColor(wd.percent) : C.mute }}>
                            {hasScore ? round1(wd.score ?? 0) : '—'}
                          </td>
                        )
                      })}
                      <td style={{ ...tdCell, textAlign: 'center', fontWeight: 800, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }} dir="ltr">
                        {s.total_possible > 0 ? `${total1} / ${s.total_possible}` : '—'}
                      </td>
                      <td style={{ ...tdCell, textAlign: 'center', fontWeight: 800, color: pctColor(s.percent) }}>
                        {s.percent !== null ? `${s.percent}%` : '—'}
                      </td>
                      <td style={{ ...tdCell, textAlign: 'center', fontWeight: 800, color: C.blue }}>
                        {s.percent !== null ? (sameRankAsPrev ? `=${rank}` : `#${rank}`) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* ============ جدول الحضور ============ */}
        {isAtt && (
          <section style={{ marginTop: '14px' }}>
            <SectionTitle>📋 كشف الحضور والغياب</SectionTitle>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thCell, width: '28px' }}>#</th>
                  <th style={thCell}>الطالب</th>
                  <th style={{ ...thCell, width: '60px' }}>الرقم</th>
                  {weeks.map((w) => (
                    <th key={w.id} style={{ ...thCell, width: '38px', textAlign: 'center' }}>أ{w.number}</th>
                  ))}
                  <th style={{ ...thCell, width: '72px', textAlign: 'center', whiteSpace: 'nowrap' }}>الحضور</th>
                  <th style={{ ...thCell, width: '52px', textAlign: 'center' }}>النسبة</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => {
                  const presentPercent = weeksCount > 0
                    ? Math.round((s.attendance_present / weeksCount) * 100)
                    : 0
                  const noData = s.weeks.every((w) => w.attendance === null)
                  return (
                    <tr key={s.id} style={{ background: idx % 2 === 1 ? C.paper : 'white' }}>
                      <td style={{ ...tdCell, textAlign: 'center', fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ ...tdCell, fontWeight: 700 }}>{s.full_name}</td>
                      <td style={{ ...tdCell, fontFamily: 'monospace', fontSize: '10px' }} dir="ltr">{s.student_no ?? '—'}</td>
                      {s.weeks.map((wd, i) => {
                        const st = wd.attendance
                        const color = st === 'present' ? C.green : st === 'absent' ? C.red : st === 'excused' ? C.blue : C.mute
                        const label = st === 'present' ? '✓' : st === 'absent' ? '✗' : st === 'excused' ? 'ع' : '—'
                        return (
                          <td key={i} style={{ ...tdCell, textAlign: 'center', fontWeight: 800, color }}>
                            {label}
                          </td>
                        )
                      })}
                      <td style={{ ...tdCell, textAlign: 'center', fontWeight: 800, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }} dir="ltr">
                        {noData ? '—' : `${s.attendance_present} / ${weeksCount}`}
                      </td>
                      <td style={{ ...tdCell, textAlign: 'center', fontWeight: 800, color: noData ? C.mute : presentPercent >= 80 ? C.green : presentPercent >= 60 ? C.blue : C.red }}>
                        {noData ? '—' : `${presentPercent}%`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div style={{ marginTop: '8px', display: 'flex', gap: '16px', fontSize: '10px', color: C.gray }}>
              <span><b style={{ color: C.green }}>✓</b> حاضر</span>
              <span><b style={{ color: C.red }}>✗</b> غائب</span>
              <span><b style={{ color: C.blue }}>ع</b> معذور (يُحسب غائبًا في عمود الحضور)</span>
            </div>
          </section>
        )}

        {/* ============ التذييل ============ */}
        <footer style={{ marginTop: 'auto', paddingTop: '10px', borderTop: `2px solid ${C.blue}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ fontSize: '11px', color: C.gray, lineHeight: 1.8 }}>
              <div><b style={{ color: C.blue }}>مدرس المقرر:</b> <b>{TEACHER}</b></div>
              <div><b style={{ color: C.blue }}>تاريخ الإصدار:</b> {fmtDate(generatedAt)}</div>
              <div><b style={{ color: C.blue }}>العام الدراسي:</b> 1448هـ — 2026م</div>
            </div>
            <div style={{ position: 'relative', width: '180px', height: '70px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <img
                src="/signature.png"
                alt="توقيع المدرس"
                style={{
                  position: 'absolute',
                  top: '-4px', left: '50%', transform: 'translateX(-50%)',
                  width: '160px', height: '55px', objectFit: 'contain', opacity: 0.92,
                }}
              />
              <div style={{ width: '170px', borderTop: `1.5px solid ${C.blue}`, paddingTop: '2px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: C.blue }}>
                {TEACHER}
              </div>
            </div>
          </div>
        </footer>
      </div>

      <div style={{ height: '4px', background: `linear-gradient(to left, ${C.green}, ${C.cyan} 45%, ${C.blue})` }} />
    </div>
  )
}

/* ============ مكونات وأنماط ============ */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      margin: '0 0 6px', fontSize: '14px', fontWeight: 800, color: C.blue,
      display: 'flex', alignItems: 'center', gap: '8px',
    }}>
      <span style={{ width: '4px', height: '14px', borderRadius: '2px', background: C.blue, display: 'inline-block' }} />
      {children}
      <span style={{ flex: 1, height: '1px', background: C.line }} />
    </h2>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: 'primary' | 'success' | 'info' | 'error' | 'ink' }) {
  const tones: Record<string, { bg: string; border: string; text: string }> = {
    primary: { bg: C.blueSoft, border: C.blue, text: C.blue },
    success: { bg: C.greenSoft, border: C.green, text: C.green },
    info:    { bg: C.cyanSoft, border: C.cyan, text: C.blue },
    error:   { bg: C.redSoft, border: C.red, text: C.red },
    ink:     { bg: C.paper, border: C.gray, text: C.ink },
  }
  const t = tones[tone]
  return (
    <div style={{ padding: '6px 8px', background: t.bg, borderTop: `3px solid ${t.border}`, borderRadius: '5px', textAlign: 'center' }}>
      <div style={{ fontSize: '10px', color: C.gray, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: 800, color: t.text, marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  )
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  border: `1px solid ${C.line}`,
  fontSize: '11px',
  background: 'white',
}

const thCell: React.CSSProperties = {
  padding: '5px 6px',
  background: C.blueSoft,
  color: C.blue,
  fontWeight: 800,
  textAlign: 'right',
  borderBottom: `2px solid ${C.blue}`,
  borderLeft: `1px solid ${C.lineSoft}`,
  fontSize: '10.5px',
}

const tdCell: React.CSSProperties = {
  padding: '4px 6px',
  borderBottom: `1px solid ${C.line}`,
  borderLeft: `1px solid ${C.lineSoft}`,
  fontSize: '11px',
  lineHeight: 1.4,
}
