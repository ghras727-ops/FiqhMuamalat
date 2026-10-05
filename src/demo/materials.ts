import { useSyncExternalStore } from 'react'
import { demoMaterials } from './data'
import type { Attachment } from './files'

export interface MaterialItem {
  id: string
  title: string
  kind: string
  size: string
  weekId: string
  published: boolean
  file?: Attachment
}

const KEY = 'fm-demo-materials-v1'
const listeners = new Set<() => void>()
const BLOCKED = ['exe', 'bat', 'cmd', 'msi', 'com', 'scr', 'vbs', 'ps1', 'js', 'jar', 'sh']

export function isBlocked(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return BLOCKED.includes(ext)
}

export function sizeLabel(n: number): string {
  if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB'
  return (n / (1024 * 1024)).toFixed(1) + ' MB'
}

function initial(): MaterialItem[] {
  return demoMaterials.map((m) => ({ ...m }))
}

function read(): MaterialItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as MaterialItem[]
  } catch {
    // fall back to the initial demo data
  }
  return initial()
}

let cache: MaterialItem[] = read()

function write(next: MaterialItem[]) {
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

export function useMaterials(): MaterialItem[] {
  return useSyncExternalStore(subscribe, () => cache)
}

export function addMaterial(title: string, weekId: string, file: Attachment) {
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toUpperCase() : 'ملف'
  const item: MaterialItem = {
    id: 'm' + Date.now(),
    title,
    kind: ext,
    size: sizeLabel(file.size),
    weekId,
    published: false,
    file,
  }
  write([...cache, item])
}

export function toggleMaterial(id: string) {
  write(cache.map((m) => (m.id === id ? { ...m, published: !m.published } : m)))
}

export function resetMaterials() {
  write(initial())
}
