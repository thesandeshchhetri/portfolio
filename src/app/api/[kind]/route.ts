import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { NextRequest,NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAdminRequest,isSameOriginMutation } from '@/lib/auth'
const MODELS:Record<string,any>={rides:prisma.ride,projects:prisma.project,experience:prisma.experience}
const FIELDS:Record<string,string[]>={rides:['place','date','km','story'],projects:['name','blurb','stack'],experience:['title','org','period','details']}
const MAX_TEXT=5000,MAX_IMAGE=5*1024*1024
function validKind(k:string){return Object.prototype.hasOwnProperty.call(MODELS,k)}
function imageType(b:Buffer){if(b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255)return'jpg';if(b.length>=8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return'png';if(b.length>=12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')return'webp';return null}
export async function GET(_:NextRequest,context:{params:Promise<{kind:string}>}){const {kind}=await context.params;if(!validKind(kind))return NextResponse.json({error:'Not found'},{status:404});try{return NextResponse.json(await MODELS[kind].findMany({orderBy:{id:'desc'}}),{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Unable to load records'},{status:500})}}
export async function POST(req:NextRequest,context:{params:Promise<{kind:string}>}){
 const {kind}=await context.params;if(!validKind(kind))return NextResponse.json({error:'Not found'},{status:404})
 if(!isAdminRequest(req))return NextResponse.json({error:'Login required'},{status:401})
 if(!isSameOriginMutation(req))return NextResponse.json({error:'Invalid request origin'},{status:403})
 let form:FormData;try{form=await req.formData()}catch{return NextResponse.json({error:'Invalid form data'},{status:400})}
 const data:Record<string,unknown>={}
 for(const field of FIELDS[kind]){const value=form.get(field);if(field==='km'){if(typeof value==='string'&&value.trim()){const n=Number(value);if(!Number.isSafeInteger(n)||n<0||n>2000000)return NextResponse.json({error:'Distance must be a whole number between 0 and 2000000'},{status:400});data.km=n}}else if(field==='date'){if(typeof value==='string'&&value.trim()){const d=new Date(value);if(Number.isNaN(d.getTime()))return NextResponse.json({error:'Invalid ride date'},{status:400});data.date=d}}else if(typeof value==='string'){const v=value.trim(),limit=['place','name','title'].includes(field)?160:MAX_TEXT;if(v&&v.length<=limit)data[field]=v}}
 const required=kind==='rides'?['place']:kind==='projects'?['name','blurb','stack']:['title','org','period','details'];const missing=required.filter(f=>!data[f]);if(missing.length)return NextResponse.json({error:`Required fields missing: ${missing.join(', ')}`},{status:400})
 let savedPath:string|undefined
 try{const file=form.get('photo');if(kind==='rides'&&file instanceof File&&file.size){if(file.size>MAX_IMAGE)return NextResponse.json({error:'Image must be 5 MB or smaller'},{status:413});const bytes=Buffer.from(await file.arrayBuffer()),ext=imageType(bytes);if(!ext)return NextResponse.json({error:'Only valid JPEG, PNG, or WebP images are allowed'},{status:415});const dir=process.env.UPLOAD_DIR||path.join(process.cwd(),'uploads');await fs.mkdir(dir,{recursive:true});const name=`${crypto.randomUUID()}.${ext}`;savedPath=path.join(dir,name);await fs.writeFile(savedPath,bytes,{flag:'wx',mode:0o640});data.photo=name}const result=await MODELS[kind].create({data});return NextResponse.json(result,{status:201,headers:{'Cache-Control':'no-store'}})}catch{if(savedPath)await fs.unlink(savedPath).catch(()=>undefined);return NextResponse.json({error:'Unable to save record'},{status:500})}
}
export async function DELETE(req:NextRequest,context:{params:Promise<{kind:string}>}){const {kind}=await context.params;if(!validKind(kind))return NextResponse.json({error:'Not found'},{status:404});if(!isAdminRequest(req))return NextResponse.json({error:'Login required'},{status:401});if(!isSameOriginMutation(req))return NextResponse.json({error:'Invalid request origin'},{status:403});const raw=req.nextUrl.searchParams.get('id'),id=raw?Number(raw):NaN;if(!Number.isSafeInteger(id)||id<1)return NextResponse.json({error:'A valid record id is required'},{status:400});try{const old=kind==='rides'?await MODELS[kind].findUnique({where:{id},select:{photo:true}}):null;await MODELS[kind].delete({where:{id}});if(old?.photo&&/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(old.photo))await fs.unlink(path.join(process.env.UPLOAD_DIR||path.join(process.cwd(),'uploads'),old.photo)).catch(()=>undefined);return NextResponse.json({ok:true})}catch{return NextResponse.json({error:'Record not found or could not be deleted'},{status:404})}}
