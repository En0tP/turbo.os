import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Script from 'next/script';
export default function Home() {
  const html = readFileSync(join(process.cwd(), 'public/classic-home.html'), 'utf8');
  return <><link rel="stylesheet" href="/classic.css?v=2"/><div dangerouslySetInnerHTML={{__html: html}}/><Script src="/classic.js?v=2" strategy="afterInteractive" /></>;
}
