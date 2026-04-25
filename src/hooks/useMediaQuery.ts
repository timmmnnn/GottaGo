import { useEffect, useState } from 'react'

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const media = window.matchMedia(query)
    const syncMatches = () => setMatches(media.matches)

    syncMatches()
    media.addEventListener('change', syncMatches)
    return () => media.removeEventListener('change', syncMatches)
  }, [query])

  return matches
}
