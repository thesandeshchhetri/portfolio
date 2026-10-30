import {prisma} from '@/lib/db'
import PortfolioExperience from '@/components/portfolio-experience'
export const dynamic='force-dynamic'
const defaults:any={siteName:'SANDESH CHHETRI',intro:'I build, support and improve the systems people rely on. When the work is done, I take the long way home.',accentWork:'#c9a77a',accentRide:'#e05b3f'}
export default async function Home(){
 let settings=defaults,rows:any[]=[]
 try{
  const [s,c,projects,experience,rides]=await Promise.all([
   prisma.siteSettings.findUnique({where:{id:1}}),
   prisma.contentItem.findMany({where:{visible:true},orderBy:[{sortOrder:'asc'},{id:'asc'}]}),
   prisma.project.findMany({orderBy:{id:'asc'}}),
   prisma.experience.findMany({orderBy:{id:'asc'}}),
   prisma.ride.findMany({orderBy:{id:'asc'}})
  ])
  if(s?.data)settings={...defaults,...(s.data as object)}
  rows=c
  const kinds=new Set(c.map(x=>x.kind))
  if(!kinds.has('projects'))rows.push(...projects.map((x,i)=>({id:-x.id,kind:'projects',title:x.name,sortOrder:i,data:{description:x.blurb,stack:x.stack}})))
  if(!kinds.has('experience'))rows.push(...experience.map((x,i)=>({id:-1000-x.id,kind:'experience',title:x.title,sortOrder:i,data:{eyebrow:x.org,description:x.details,detail:x.period}})))
  if(!kinds.has('journeys')&&!kinds.has('rides'))rows.push(...rides.map((x,i)=>({id:-2000-x.id,kind:'journeys',title:x.place,sortOrder:i,data:{description:x.story||'',detail:x.km?x.km+' km':'',image:x.photo?'/uploads/'+x.photo:''}})))
 }catch{}
 const content:Record<string,any[]>={}
 for(const row of rows)(content[row.kind]??=[]).push(row)
 return <PortfolioExperience settings={settings} content={content}/>
}
