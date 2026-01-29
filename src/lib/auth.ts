import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export interface JWTPayload {
  userId: string
  username: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function signJWT(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }) // Shorter expiration for socket tokens
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    console.log('Verifying JWT token')
    const result = jwt.verify(token, JWT_SECRET) as JWTPayload
    console.log('JWT verification successful:', result)
    return result
  } catch (error) {
    console.error('JWT verification failed:', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

export async function getAuthUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    console.log('Auth token from cookie:', token ? 'exists' : 'missing')
    if (!token) return null
    const payload = verifyJWT(token)
    console.log('JWT verification result:', payload)
    return payload
  } catch (error) {
    console.error('Error in getAuthUser:', error)
    return null
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })
}

export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('auth-token')
}