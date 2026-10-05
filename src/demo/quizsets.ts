import { useSyncExternalStore } from 'react'

export type QKind = 'mcq' | 'tf' | 'essay_smart' | 'essay_reason'

export const kindLabel: Record<QKind, string> = {
  mcq: 'اختيار من متعدد',
  tf: 'صح/خطأ',
  essay_smart: 'مقالي ذكي',
  essay_reason: 'مقالي استدلال وفهم',
}
export const kindOrder: QKind[] = ['mcq', 'tf', 'essay_smart', 'essay_reason']
export const defaultPoints: Record<QKind, number> = { mcq: 1, tf: 1, essay_smart: 3, essay_reason: 5 }

export function isObjective(k: QKind): boolean {
  return k === 'mcq' || k === 'tf'
}

export interface SetQuestion {
  id: string
  kind: QKind
  text: string
  options: string[]
  answer: string
  points: number
}

export interface WeekQuiz {
  week: number
  open: boolean
  questions: SetQuestion[]
}

export interface QuizAttempt {
  last: number
  best: number
  count: number
  autoMax: number
  essayMax: number
  essayCount: number
  marks: Record<string, boolean>
}

function makeStore<T>(key: string, empty: T) {
  const listeners = new Set<() => void>()
  function read(): T {
    try {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw) as T
    } catch {
      // fall back to empty
    }
    return empty
  }
  let cache: T = read()
  function set(next: T) {
    cache = next
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // storage may be unavailable; the in-memory copy still works
    }
    listeners.forEach((l) => l())
  }
  function subscribe(cb: () => void) {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  }
  window.addEventListener('storage', (e) => {
    if (e.key === key) {
      cache = read()
      listeners.forEach((l) => l())
    }
  })
  return { get: () => cache, set, subscribe }
}

type QuizMap = Record<number, WeekQuiz>
type AttemptMap = Record<string, QuizAttempt>

const quizStore = makeStore<QuizMap>('fm-demo-quizsets-v1', {})
const attemptStore = makeStore<AttemptMap>('fm-demo-quiz-attempts-v1', {})

export function useQuizSets(): QuizMap {
  return useSyncExternalStore(quizStore.subscribe, quizStore.get)
}

export function useAttempts(): AttemptMap {
  return useSyncExternalStore(attemptStore.subscribe, attemptStore.get)
}

export function getQuiz(map: QuizMap, week: number): WeekQuiz {
  return map[week] ?? { week, open: false, questions: [] }
}

export function summarize(qs: SetQuestion[]) {
  const counts: Record<QKind, number> = { mcq: 0, tf: 0, essay_smart: 0, essay_reason: 0 }
  let total = 0
  qs.forEach((q) => {
    counts[q.kind] += 1
    total += q.points
  })
  return { counts, total }
}

export function addQuestion(week: number, q: Omit<SetQuestion, 'id'>) {
  const all = quizStore.get()
  const cur = getQuiz(all, week)
  const item: SetQuestion = { ...q, id: 'sq' + Date.now() + Math.random().toString(36).slice(2, 6) }
  quizStore.set({ ...all, [week]: { ...cur, questions: [...cur.questions, item] } })
}

export function removeQuestion(week: number, id: string) {
  const all = quizStore.get()
  const cur = getQuiz(all, week)
  quizStore.set({ ...all, [week]: { ...cur, questions: cur.questions.filter((q) => q.id !== id) } })
}

export function setQuizOpen(week: number, open: boolean) {
  const all = quizStore.get()
  quizStore.set({ ...all, [week]: { ...getQuiz(all, week), open } })
}

export function saveAttempt(key: string, a: Omit<QuizAttempt, 'best' | 'count'>) {
  const all = attemptStore.get()
  const prev = all[key]
  attemptStore.set({
    ...all,
    [key]: { ...a, best: prev ? Math.max(prev.best, a.last) : a.last, count: prev ? prev.count + 1 : 1 },
  })
}
