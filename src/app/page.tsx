import {prisma} from '@/lib/db'
import PortfolioExperience from '@/components/portfolio-experience'
export const dynamic='force-dynamic'
const defaults:any={siteName:'SANDESH CHHETRI',intro:'I build, support and improve the systems people rely on. When the work is done, I take the long way home.',accentWork:'#c9a77a',accentRide:'#e05b3f'}
export default async function Home(){let settings=defaults,rows:any[]=[];try{const [s,c]=await Promise.all([prisma.siteSettings.findUnique({where:{id:1}}),prisma.contentItem.findMany({where:{visible:true},orderBy:[{sortOrder:'asc'},{id:'asc'}]})]);if(s?.data)settings={...defaults,...(s.data as object)};rows=c}catch{}const content:Record<string,any[]>={};for(const row of rows)(content[row.kind]??=[]).push(row);return <PortfolioExperience settings={settings} content={content}/>}
