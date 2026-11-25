export interface FeedbackPayload {
  path: string;
  locale: string;
  title: string;
  vote: 'helpful' | 'not_helpful';
  comment?: string;
}

interface FeedbackApiResponse {
  code?: number;
  msg?: string;
}

function describeBody(body: string) {
  const trimmed = body.trim();
  return trimmed ? `: ${trimmed.slice(0, 200)}` : '';
}

export async function forwardFeedback(payload: FeedbackPayload) {
  const endpoint = process.env.FEEDBACK_API_URL;
  if (!endpoint) throw new Error('FEEDBACK_API_URL is not configured');

  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (process.env.FEEDBACK_API_TOKEN) headers.Authorization = `Bearer ${process.env.FEEDBACK_API_TOKEN}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const body = await response.text();
  if (!response.ok) throw new Error(`Feedback API returned ${response.status}${describeBody(body)}`);

  // The upstream (Gin-Vue-Admin) answers HTTP 200 for business failures too, e.g.
  // {"code":7,"msg":"无权访问"} for a bad token or when the token is not configured.
  // A non-zero business code means nothing was stored, so it must not be reported as success.
  let result: FeedbackApiResponse | undefined;
  try {
    result = body ? (JSON.parse(body) as FeedbackApiResponse) : undefined;
  } catch {
    result = undefined;
  }
  if (result && typeof result.code === 'number' && result.code !== 0) {
    throw new Error(`Feedback API rejected the request (code ${result.code}): ${result.msg ?? 'no message'}`);
  }
}
