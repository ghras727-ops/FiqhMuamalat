export function copyForGrading(
  row: { student_name: string; week_number: number; activity_title: string },
  questions: any[],
  answers: Record<string, any>,
  keys: Record<string, any>
): string {
  let prompt = `# تصحيح خارجي — ${row.activity_title} (الأسبوع ${row.week_number})\n\n`
  prompt += `أنت مصحح أكاديمي لمقرر فقه المعاملات. المطلوب تصحيح إجابات الطالب المقالية بناءً على الإجابة النموذجية ومعايير التصحيح المرفقة.\n\n`
  prompt += `## القواعد الإلزامية:\n`
  prompt += `1. اعتمد حصراً على معايير التصحيح. لا تُضف بنوداً.\n`
  prompt += `2. امنح الدرجة الجزئية لكل بند بناءً على تحقق مضمونه في إجابة الطالب فقط.\n`
  prompt += `3. اذكر دليلاً حرفياً من إجابة الطالب لكل درجة تمنحها.\n`
  prompt += `4. في النهاية، ضع جدولاً إجمالياً بالدرجات وخلاصة قصيرة.\n\n`
  prompt += `## الأسئلة والإجابات:\n\n`

  const essays = questions.filter(q => q.type.startsWith('essay'))

  essays.forEach((q, i) => {
    const ans = answers[q.id]?.text_answer || '(لم يجب)'
    const k = keys[q.id] || {}
    prompt += `### السؤال ${i + 1} (${q.score} درجات)\n`
    prompt += `**نص السؤال:**\n${q.text}\n\n`
    prompt += `**إجابة الطالب:**\n${ans}\n\n`
    prompt += `**الإجابة النموذجية:**\n${k.model_answer || 'غير متوفر'}\n\n`
    prompt += `**معايير التصحيح:**\n${k.grading_criteria || 'غير متوفر'}\n\n`
    prompt += `---\n\n`
  })

  return prompt
}