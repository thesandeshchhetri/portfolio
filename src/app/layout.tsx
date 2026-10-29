import './globals.css'
export const metadata={title:'Sandesh Chhetri / Yukin',description:'Developer, QA and motorcycle rider portfolio.'}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><head><link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;700&family=Racing+Sans+One&family=Barlow+Condensed:wght@500;700&display=swap" rel="stylesheet"/></head><body data-side="work" suppressHydrationWarning>{children}</body></html>}
