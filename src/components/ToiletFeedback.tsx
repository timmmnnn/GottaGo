import { MessageSquare, Send, Star } from 'lucide-react'
import type { FormEvent } from 'react'
import { memo, useMemo, useState } from 'react'
import { useToiletFeedback } from '../hooks/useToiletFeedback'
import { isValidRating, normalizeComment } from '../lib/toiletFeedback'

type ToiletFeedbackProps = {
  toiletId: string
}

const stars = [1, 2, 3, 4, 5]

export const ToiletFeedback = memo(function ToiletFeedback({ toiletId }: ToiletFeedbackProps) {
  const { comments, error, isConfigured, status, submit, summary } = useToiletFeedback(toiletId)
  const [comment, setComment] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const averageLabel = summary.averageRating ? summary.averageRating.toFixed(1) : 'New'
  const reviewCountLabel = summary.ratingCount === 1 ? '1 rating' : `${summary.ratingCount} ratings`
  const normalizedComment = useMemo(() => normalizeComment(comment), [comment])
  const starLabel = summary.averageRating ? `${averageLabel} out of 5` : 'No ratings yet'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)

    if (!isValidRating(rating)) {
      setSubmitError('Choose a 1-5 star rating.')
      return
    }

    setSubmitting(true)
    try {
      await submit(rating, normalizedComment)
      setComment('')
      setFormOpen(false)
      setRating(0)
    } catch {
      setSubmitError('Could not submit feedback right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="feedback-panel" aria-label="Community ratings and comments">
      <div className="feedback-summary">
        <div>
          <p className="section-kicker">Community</p>
          <h3>{averageLabel}</h3>
          <span>{reviewCountLabel}</span>
        </div>
        <div className="rating-stars" aria-label={starLabel}>
          {stars.map((star) => (
            <Star
              key={star}
              aria-hidden="true"
              data-filled={Boolean(summary.averageRating && star <= Math.round(summary.averageRating))}
            />
          ))}
        </div>
      </div>

      {!isConfigured ? (
        <p className="feedback-note">Ratings and moderated comments will appear once Supabase is connected.</p>
      ) : null}

      {isConfigured && status === 'loading' ? (
        <p className="feedback-note">Loading community feedback.</p>
      ) : null}

      {isConfigured && !formOpen ? (
        <button className="feedback-toggle" type="button" onClick={() => setFormOpen(true)}>
          <MessageSquare aria-hidden="true" />
          Rate this toilet
        </button>
      ) : null}

      {isConfigured && formOpen ? (
        <form className="feedback-form" onSubmit={handleSubmit}>
          <div className="rating-picker" aria-label="Choose a rating">
            {stars.map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`${star} star${star === 1 ? '' : 's'}`}
                data-active={star <= rating}
                onClick={() => setRating(star)}
              >
                <Star aria-hidden="true" />
              </button>
            ))}
          </div>
          <label className="comment-box">
            <MessageSquare aria-hidden="true" />
            <span className="sr-only">Optional public comment</span>
            <textarea
              maxLength={500}
              placeholder="Optional comment for admin review"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </label>
          <div className="feedback-form-footer">
            <span>{normalizedComment.length}/500</span>
            <div className="feedback-form-actions">
              <button type="button" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" disabled={submitting}>
                <Send aria-hidden="true" />
                {submitting ? 'Sending' : 'Submit'}
              </button>
            </div>
          </div>
          {submitError ? <p className="feedback-note error-note">{submitError}</p> : null}
        </form>
      ) : null}

      {status === 'submitted' ? (
        <p className="feedback-note">Thanks. Your comment is waiting for admin review.</p>
      ) : null}

      {error ? <p className="feedback-note error-note">{error}</p> : null}

      {comments.length ? (
        <div className="approved-comments" aria-label="Approved comments">
          {comments.map((item) => (
            <blockquote key={item.id}>
              <span>{item.rating}/5</span>
              <p>{item.comment || 'Rated without a public comment.'}</p>
            </blockquote>
          ))}
        </div>
      ) : null}
    </section>
  )
})
