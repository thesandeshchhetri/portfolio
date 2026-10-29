import { NextRequest, NextResponse } from 'next/server'
import { clearAdminCookie, isSameOriginMutation } from '@/lib/auth'
export async function POST(req:NextRequest){if(!isSameOriginMutation(req))return NextResponse.json({error:'Invalid request origin'},{status:403});const res=NextResponse.json({ok:true});clearAdminCookie(res);return res}
