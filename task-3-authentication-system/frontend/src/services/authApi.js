const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '');

/**
 * Error thrown for every failed API call
 *   status  HTTP status, or 0 when the server could not be reached
 *   code    the API's reason for a 401, for example "TOKEN_EXPIRED"
 *   fields  { field: message } returned by the API for invalid input
 */
export class ApiError extends Error {
  constructor(message, { status = 0, code = '', fields = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/**
 * Send one request to the API and return the JSON body
 * The token is passed in by the caller; it is only ever sent in the
 * Authorization header.
 */
const request = async (path, { method = 'GET', body, token } = {}) => {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new ApiError('Cannot reach the server. Check that the backend is running, then try again.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    // The response was not JSON; handled below as a server error.
  }

  if (!response.ok) {
    throw new ApiError(data?.message || `The server returned an error (${response.status}).`, {
      status: response.status,
      code: data?.code,
      fields: data?.fields,
    });
  }

  return data;
};

/**
 * Authentication API service
 * Handles all API calls related to authentication
 */
export const authApi = {
  /**
   * Register a new user
   */
  register: (username, email, password, confirmPassword) =>
    request('/api/auth/register', {
      method: 'POST',
      body: { username, email, password, confirmPassword },
    }),

  /**
   * Login user ("email" may be the email address or the username)
   */
  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  /**
   * Get current authenticated user
   */
  getCurrentUser: (token) => request('/api/auth/me', { token }),

  /**
   * Logout user (the server revokes the token)
   */
  logout: (token) => request('/api/auth/logout', { method: 'POST', token }),

  /**
   * Check API health
   */
  checkHealth: () => request('/api/health'),
};
