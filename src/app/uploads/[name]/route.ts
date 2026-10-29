import fs from 'node:fs/promises'
import path from 'node:path'
const TYPES:Record<string,string>={jpg:'image/jpeg',png:'image/png',webp:'image/webp'}
export async function GET(_:Request,context:{params:Promise<{name:string}>}){
 const {name}=await context.params;if(!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(name))return new Response('Not found',{status:404})
 try{const bytes=await fs.readFile(path.join(process.env.UPLOAD_DIR||path.join(process.cwd(),'uploads'),name));return new Response(bytes,{headers:{'Content-Type':TYPES[name.split('.').pop()!.toLowerCase()],'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Cache-Control':'public, max-age=86400, immutable'}})}catch{return new Response('Not found',{status:404,headers:{'X-Content-Type-Options':'nosniff'}})}
}
