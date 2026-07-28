/**
 * JWT Utilities
 *
 * Helper functions for decoding JWT tokens
 *
 * Note: For production, consider using a library with more robust validation
 * This is a simple base64 decoder for JWT payloads
 */

/**
 * JWT payload interface - matches backend JWT payload structure
 */
export interface JWTPayload {
  sub: string // user ID
  email: string
  firstName?: string | null
  lastName?: string | null
  isActive: boolean
  isSuperAdmin: boolean
  iat?: number
  exp?: number
}

/**
 * Decode JWT payload without verification (for client-side use only)
 * WARNING: This does not verify the token signature. For display purposes only.
 *
 * @param token - JWT access token
 * @returns Decoded payload or null if invalid
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    // Decode the payload (middle part)
    const payload = parts[1]
    const decoded = atob(payload)
    return JSON.parse(decoded) as JWTPayload
  } catch {
    return null
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token)
  if (!payload || !payload.exp) {
    return true // Treat as expired if we can't verify
  }

  // exp is in seconds, Date.now() is in milliseconds
  const expirationTime = payload.exp * 1000
  return Date.now() >= expirationTime
}

/**
 * Get user display name from JWT payload
 */
export function getUserDisplayName(payload: JWTPayload): string {
  const firstName = payload.firstName?.trim()
  const lastName = payload.lastName?.trim()

  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }
  if (firstName) {
    return firstName
  }
  if (lastName) {
    return lastName
  }
  return payload.email
}

/**
 * Get user initials from JWT payload
 */
export function getUserInitials(payload: JWTPayload): string {
  const firstName = payload.firstName?.trim()
  const lastName = payload.lastName?.trim()

  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }
  if (firstName) {
    return firstName[0].toUpperCase()
  }
  if (lastName) {
    return lastName[0].toUpperCase()
  }
  return payload.email[0].toUpperCase()
}
