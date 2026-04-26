import { useCallback, useEffect, useState } from 'react'
import {
  fetchToiletFeedback,
  isFeedbackConfigured,
  submitFeedback,
  type ApprovedComment,
  type RatingSummary,
} from '../lib/toiletFeedback'

type FeedbackStatus = 'idle' | 'loading' | 'ready' | 'submitted' | 'error'

export function useToiletFeedback(toiletId: string) {
  const [comments, setComments] = useState<ApprovedComment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<FeedbackStatus>(isFeedbackConfigured ? 'loading' : 'idle')
  const [summary, setSummary] = useState<RatingSummary>({
    averageRating: null,
    ratingCount: 0,
  })

  useEffect(() => {
    let cancelled = false

    if (!isFeedbackConfigured) return

    fetchToiletFeedback(toiletId)
      .then(({ comments: nextComments, summary: nextSummary }) => {
        if (cancelled) return
        setError(null)
        setSummary(nextSummary)
        setComments(nextComments)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setError('Community feedback is unavailable right now.')
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [toiletId])

  const submit = useCallback(
    async (rating: number, comment: string) => {
      setError(null)
      await submitFeedback({ comment, rating, toiletId })
      setStatus('submitted')
    },
    [toiletId],
  )

  return {
    comments,
    error,
    isConfigured: isFeedbackConfigured,
    status,
    submit,
    summary,
  }
}
