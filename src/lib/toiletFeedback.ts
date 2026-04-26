export type RatingSummary = {
  averageRating: number | null
  ratingCount: number
}

export type ApprovedComment = {
  id: string
  rating: number
  comment: string | null
  createdAt: string
}

export type FeedbackPayload = {
  comment: string
  rating: number
  toiletId: string
}

export type ToiletFeedbackData = {
  comments: ApprovedComment[]
  summary: RatingSummary
}

type SupabaseSummaryRow = {
  average_rating: number | string | null
  rating_count: number | string | null
  toilet_id: string
}

type SupabaseCommentRow = {
  comment: string | null
  created_at: string
  id: string
  rating: number
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

export const isFeedbackConfigured = Boolean(supabaseUrl && supabasePublishableKey)

const feedbackCache = new Map<string, Promise<ToiletFeedbackData>>()

export function normalizeComment(comment: string) {
  const normalized = comment.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, 500) : ''
}

export function isValidRating(rating: number) {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5
}

function endpoint(path: string) {
  if (!supabaseUrl) throw new Error('Supabase URL is not configured.')
  return `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${path}`
}

function headers() {
  if (!supabasePublishableKey) throw new Error('Supabase publishable key is not configured.')
  return {
    apikey: supabasePublishableKey,
    Authorization: `Bearer ${supabasePublishableKey}`,
    'Content-Type': 'application/json',
  }
}

async function parseResponse<T>(response: Response) {
  if (!response.ok) {
    throw new Error(`Feedback request failed with status ${response.status}.`)
  }

  return (await response.json()) as T
}

export async function fetchRatingSummary(toiletId: string): Promise<RatingSummary> {
  if (!isFeedbackConfigured) return { averageRating: null, ratingCount: 0 }

  const params = new URLSearchParams({
    select: 'toilet_id,average_rating,rating_count',
    toilet_id: `eq.${toiletId}`,
  })
  const rows = await parseResponse<SupabaseSummaryRow[]>(
    await fetch(endpoint(`toilet_rating_summaries?${params}`), {
      headers: headers(),
    }),
  )
  const row = rows[0]

  return {
    averageRating: row?.average_rating == null ? null : Number(row.average_rating),
    ratingCount: row?.rating_count == null ? 0 : Number(row.rating_count),
  }
}

export async function fetchApprovedComments(toiletId: string): Promise<ApprovedComment[]> {
  if (!isFeedbackConfigured) return []

  const params = new URLSearchParams({
    select: 'id,rating,comment,created_at',
    toilet_id: `eq.${toiletId}`,
    order: 'created_at.desc',
    limit: '3',
  })
  const rows = await parseResponse<SupabaseCommentRow[]>(
    await fetch(endpoint(`toilet_ratings?${params}`), {
      headers: headers(),
    }),
  )

  return rows.map((row) => ({
    comment: row.comment,
    createdAt: row.created_at,
    id: row.id,
    rating: row.rating,
  }))
}

export function fetchToiletFeedback(toiletId: string): Promise<ToiletFeedbackData> {
  if (!isFeedbackConfigured) {
    return Promise.resolve({
      comments: [],
      summary: { averageRating: null, ratingCount: 0 },
    })
  }

  const cached = feedbackCache.get(toiletId)
  if (cached) return cached

  const request = Promise.all([fetchRatingSummary(toiletId), fetchApprovedComments(toiletId)]).then(
    ([summary, comments]) => ({
      comments,
      summary,
    }),
  )
  feedbackCache.set(toiletId, request)

  return request
}

export async function submitFeedback({ comment, rating, toiletId }: FeedbackPayload) {
  if (!isFeedbackConfigured) throw new Error('Feedback is not configured yet.')
  if (!isValidRating(rating)) throw new Error('Choose a rating from 1 to 5.')

  const normalizedComment = normalizeComment(comment)

  await fetch(endpoint('toilet_ratings'), {
    body: JSON.stringify({
      comment: normalizedComment || null,
      rating,
      status: 'pending',
      toilet_id: toiletId,
    }),
    headers: {
      ...headers(),
      Prefer: 'return=minimal',
    },
    method: 'POST',
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Feedback request failed with status ${response.status}.`)
    }
  })
  feedbackCache.delete(toiletId)
}
