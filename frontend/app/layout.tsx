import './globals.css';
import RegisterSW from './register-sw';
export const metadata={title:'PATKAI — Landslide Early Warning & Decision Support',description:'AI-powered landslide risk monitoring prototype for the North Eastern Region'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><RegisterSW/>{children}</body></html>}
