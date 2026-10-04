import { useSyncExternalStore } from 'react'

// موجّه بسيط بلا مكتبات: مساران فعليان فقط (/login و/admin) إضافة إلى /student.
// إن احتجنا لاحقًا إلى توجيه أغنى نقترح react-router ونطلب موافقتكم أولًا.
const NAV_EVENT = 'app:navigate'

function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback)
  window.addEventListener(NAV_EVENT, callback)
  return () => {
    window.removeEventListener('popstate', callback)
    window.removeEventListener(NAV_EVENT, callback)
  }
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname)
}

export function navigate(to: string, replace = false) {
  if (window.location.pathname === to) return
  if (replace) window.history.replaceState(null, '', to)
  else window.history.pushState(null, '', to)
  window.dispatchEvent(new Event(NAV_EVENT))
}
