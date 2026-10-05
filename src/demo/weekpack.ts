import { useSyncExternalStore } from 'react'
import type { Attachment } from './files'

export interface PackLink {
  id: string
  title: string
  url: string
  kind: 'كتاب' | 'فيديو' | 'مقال' | 'أخرى'
}

export interface WeekPack {
  week: number
  title: string
  book: Attachment | null
  slides: Attachment | null
  files: Attachment[]
  links: PackLink[]
  questionIds: string[]
  published: boolean
}

type PackMap = Record<number, WeekPack>

const KEY = 'fm-demo-weekpacks-v1'
const listeners = new Set<() => void>()

function read(): PackMap {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as PackMap
  } catch {
    // fall back to empty
  }
  return {}
}

let cache: PackMap = read()

function write(next: PackMap) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
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

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cache = read()
      listeners.forEach((l) => l())
    }
  })
}

export function useWeekPacks(): PackMap {
  return useSyncExternalStore(subscribe, () => cache)
}

export function getPack(state: PackMap, week: number): WeekPack {
  return (
    state[week] ?? {
      week,
      title: 'الأسبوع ' + week,
      book: null,
      slides: null,
      files: [],
      links: [],
      questionIds: [],
      published: false,
    }
  )
}

export function updatePack(week: number, patch: Partial<WeekPack>) {
  const cur = getPack(cache, week)
  write({ ...cache, [week]: { ...cur, ...patch } })
}
