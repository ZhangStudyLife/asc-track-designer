export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export async function handleRequest(request: Request, action: () => Promise<Response>) {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    return await action()
  } catch (reason) {
    const status = reason instanceof HttpError ? reason.status : 500
    const message = reason instanceof Error ? reason.message : 'Unexpected server error'
    return jsonResponse({ error: message }, status)
  }
}
