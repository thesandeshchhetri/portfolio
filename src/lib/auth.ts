import crypto from 'node:crypto'
import type { NextRequest, NextResponse } from 'next/server'
const COOKIE_NAME = 'adm'
const TTL = 60 * 60 * 8
function secret(): string {
  const value = process.env.SESSION_SECRET
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters')
  return value
}
function sign(exp: number) { return crypto.createHmac('sha256', secret()).update(`admin:${exp}`).digest('hex') }
export function createAdminSession() {
  const maxAge = TTL, exp = Math.floor(Date.now()/1000) + maxAge
  return { value: `${exp}.${sign(exp)}`, maxAge }
}
export function isAdminRequest(req: NextRequest): boolean {
  const value = req.cookies.get(COOKIE_NAME)?.value
  if (!value) return false
  const [expText, sig, ...extra] = value.split('.')
  if (!expText || !sig || extra.length || !/^\d+$/.test(expText)) return false
  const exp = Number(expText), now = Math.floor(Date.now()/1000)
  if (!Number.isSafeInteger(exp) || exp <= now || exp > now + TTL) return false
  try {
    const expected = Buffer.from(sign(exp), 'hex'), actual = Buffer.from(sig, 'hex')
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
  } catch { return false }
}
export function setAdminCookie(res: NextResponse) {
  const session = createAdminSession()
  res.cookies.set(COOKIE_NAME, session.value, { httpOnly:true, secure:process.env.NODE_ENV === 'production', sameSite:'strict', path:'/', maxAge:session.maxAge })
}
export function clearAdminCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, '', { httpOnly:true, secure:process.env.NODE_ENV === 'production', sameSite:'strict', path:'/', maxAge:0 })
}
export function hasValidAdminConfiguration() { return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 12 && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) }
export function isSameOriginMutation(req: NextRequest) {
  const origin = req.headers.get('origin')
  const host = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || req.headers.get('host')
  const protocol = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || req.nextUrl.protocol.replace(':', '')
  if (!origin || !host || !['http', 'https'].includes(protocol)) return false
  try {
    const originUrl = new URL(origin)
    return originUrl.origin === `${protocol}://${host}`
  } catch {
    return false
  }
}
