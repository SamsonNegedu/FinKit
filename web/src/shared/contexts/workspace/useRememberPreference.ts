import { useState } from 'react'
import { clearSession, getRememberPreference, setRememberPreference } from '@/shared/utils/storage'

export function useRememberPreference(pushToast: (t: { message: string; tone: 'success' | 'error' }) => void) {
  const [remember, setRemember] = useState(getRememberPreference)
  const toggleRemember = () => {
    const next = !remember

    setRemember(next)
    setRememberPreference(next)
    if (!next) {
      clearSession()
      pushToast({ message: 'Data is no longer saved on this device', tone: 'success' })
    }
  }

  return { remember, toggleRemember }
}
