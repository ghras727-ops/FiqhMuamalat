import { useSyncExternalStore } from 'react'
import { demoComments, demoPosts, type DemoComment, type DemoPost } from './data'
import type { Attachment } from './files'

export type StoredPost = DemoPost & { hidden?: boolean; attachments?: Attachment[] }
export type StoredComment = DemoComment & { hidden?: boolean }

export interface FeedState {
  posts: StoredPost[]
  comments: StoredComment[]
  liked: Record<string, boolean>
}

const KEY = 'fm-demo-feed-v1'
const listeners = new Set<() => void>()

function initial(): FeedState {
  return {
    posts: demoPosts.map((p) => ({ ...p })),
    comments: demoComments.map((c) => ({ ...c })),
    liked: {},
  }
}

function read(): FeedState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as FeedState
  } catch {
    // ignore and fall back to the initial demo data
  }
  return initial()
}

let cache: FeedState = read()

function write(next: FeedState) {
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

export function useFeed(): FeedState {
  return useSyncExternalStore(subscribe, () => cache)
}

export function addPost(p: Omit<StoredPost, 'id' | 'date' | 'likes'>) {
  const post: StoredPost = { ...p, id: 'p' + Date.now(), date: 'الآن', likes: 0 }
  write({ ...cache, posts: [post, ...cache.posts] })
}

export function togglePin(id: string) {
  write({ ...cache, posts: cache.posts.map((p) => (p.id === id ? { ...p, pinned: !p.pinned } : p)) })
}

export function toggleHidePost(id: string) {
  write({ ...cache, posts: cache.posts.map((p) => (p.id === id ? { ...p, hidden: !p.hidden } : p)) })
}

export function addComment(postId: string, author: string, text: string) {
  const c: StoredComment = { id: 'c' + Date.now(), postId, author, text }
  write({ ...cache, comments: [...cache.comments, c] })
}

export function toggleHideComment(id: string) {
  write({ ...cache, comments: cache.comments.map((c) => (c.id === id ? { ...c, hidden: !c.hidden } : c)) })
}

export function toggleLike(postId: string) {
  const was = Boolean(cache.liked[postId])
  write({
    ...cache,
    liked: { ...cache.liked, [postId]: !was },
    posts: cache.posts.map((p) => (p.id === postId ? { ...p, likes: p.likes + (was ? -1 : 1) } : p)),
  })
}

export function resetFeed() {
  write(initial())
}

