import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'World Agentic | We Build Future With AI',description:'World Agentic — AI-powered websites, apps, design, and automation. Explore our services and create an account to try the project collection.',icons:{icon:'/world-agentic-logo.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-theme="light"><body>{children}</body></html>}
