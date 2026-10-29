import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { hasValidAdminConfiguration, isSameOriginMutation, setAdminCookie } from '@/lib/auth'
const attempts = new Map<string,{count:number;resetAt:number}>()
const WINDOW_MS = 15*60*1000, MAX_ATTEMPTS = 10
let lastPrune = 0
function allowed(key:string) {
  const now=Date.now()
  if(now-lastPrune>WINDOW_MS){for(const [k,v] of attempts)if(v.resetAt<=now)attempts.delete(k);lastPrune=now}
  const current=attempts.get(key)
  if(!current||current.resetAt<=now){attempts.set(key,{count:1,resetAt:now+WINDOW_MS});return true}
  if(current.count>=MAX_ATTEMPTS)return false
  current.count++;return true
}
function safeEqual(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y)}
export async function POST(req:NextRequest){
  if(!isSameOriginMutation(req))return NextResponse.json({error:'Invalid request origin'},{status:403})
  if(!hasValidAdminConfiguration())return NextResponse.json({error:'Admin authentication is not configured securely'},{status:503})
  const key=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'
  if(!allowed(key))return NextResponse.json({error:'Too many login attempts. Try again later.'},{status:429})
  let password:unknown
  try{password=(await req.json())?.password}catch{return NextResponse.json({error:'Invalid JSON body'},{status:400})}
  if(typeof password!=='string'||!safeEqual(password,process.env.ADMIN_PASSWORD||''))return NextResponse.json({error:'Invalid credentials'},{status:401})
  attempts.delete(key);const response=NextResponse.json({ok:true});setAdminCookie(response);return response
}
