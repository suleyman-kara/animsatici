import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Analytics } from "@/components/Analytics";
import { getLastScan } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { CONTACT_EMAIL, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/", types: { "text/calendar": "/takvim.ics" } },
  openGraph: { type: "website", siteName: SITE_NAME, locale: "tr_TR", url: "/" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f11" },
  ],
};

const NAV = [
  { href: "/", label: "Etkinlikler" },
  { href: "/devam-eden", label: "Devam eden" },
  { href: "/kaynaklar", label: "Kaynaklar" },
  { href: "/oneri", label: "Öner" },
];

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lastScan = await getLastScan();
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <a href="#icerik" className="sr-only focus:not-sr-only focus:absolute focus:p-2">
          İçeriğe geç
        </a>
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <span aria-hidden className="grid size-7 place-items-center rounded-full bg-accent text-sm text-accent-fg">◎</span>
              {SITE_NAME}
            </Link>
            <nav aria-label="Ana menü" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="text-fg-muted hover:text-fg">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main id="icerik" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>

        <footer className="border-t border-border bg-surface text-sm text-fg-muted">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {lastScan ? <>Son güncelleme: {formatDate(lastScan.completedAt)}</> : "Henüz tarama yapılmadı"}
              {" · "}
              <Link href="/kaynaklar" className="underline-offset-2 hover:underline">Tarama durumu</Link>
            </p>
            <nav aria-label="Alt menü" className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/hakkinda" className="hover:text-fg">Hakkında</Link>
              <Link href="/gizlilik" className="hover:text-fg">Gizlilik</Link>
              <Link href="/oneri" className="hover:text-fg">Etkinlik öner</Link>
              {CONTACT_EMAIL && <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-fg">İletişim</a>}
            </nav>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
