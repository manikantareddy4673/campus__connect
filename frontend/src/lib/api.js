const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Could not reach the backend. Check that the API server is running.', 0)
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(data?.error || data?.detail || `Backend request failed (${response.status}).`, response.status)
  }
  return data
}

export const api = {
  getEvents: () => request('/api/events'),
  signIn: (credentials) => request('/api/auth/login', { method: 'POST', body: credentials }),
  signUp: (credentials) => request('/api/auth/signup', { method: 'POST', body: credentials }),
  getMyRegistrations: (token) => request('/api/registrations', { token }),
  createRegistration: (token, registration) =>
    request('/api/registrations', { method: 'POST', token, body: registration }),
}
