import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { SetupTabs, type SetupClient } from "@/components/SetupTabs";
import { getActiveSources } from "@/lib/sources";
import { MCP_URL } from "@/lib/site";

const EXAMPLES = [
  { emoji: "🚀", text: "İstanbul'da bu ay başvurusu kapanan yapay zeka hackathonları var mı?" },
  { emoji: "💼", text: "Bilgisayar mühendisliği 3. sınıfım. Yaz stajı için hangi programlara bakmalıyım?" },
  { emoji: "📄", text: "GitHub kullanıcı adım şu, LinkedIn PDF'im ekte. Bana tek sayfalık bir CV hazırla." },
  { emoji: "🎯", text: "Şu staj ilanına göre CV'mi uyarla ve eksik kalan yeteneklerimi söyle." },
];

const TOOLS = [
  { name: "find_sources", text: "İsteğine uyan kaynak sayfaları alan, tür ve şehre göre bulur. Asistanın sayfaları okuyup fırsatları linkleriyle getirir." },
  { name: "list_categories", text: "Hangi alan, tür ve şehirlerde kaynak olduğunu gösterir." },
  { name: "get_cv_guide", text: "Uydurmayan, ATS uyumlu bir öğrenci CV'si için adım adım rehber. İlana göre uyarlamayı da kapsar." },
  { name: "get_github_projects", text: "Açık GitHub repolarını proje listesi olarak getirir; CV'ye hangilerinin gireceğini sen seçersin." },
];

export default async function HomePage() {
  const sources = await getActiveSources();
  const clients: SetupClient[] = [
    {
      id: "claude",
      name: "Claude",
      steps: [
        "claude.ai'de ya da Claude masaüstü uygulamasında Customize → Connectors bölümünü aç.",
        "Add custom connector'a tıkla. Ad: Kampüs30, URL: aşağıdaki adres.",
        "Add'e bas. Sohbette + menüsünden Connectors altında Kampüs30'un açık olduğundan emin ol.",
      ],
      snippet: MCP_URL,
    },
    {
      id: "claude-code",
      name: "Claude Code",
      steps: ["Terminalde şu komutu çalıştır:"],
      snippet: `claude mcp add --transport http kampus30 ${MCP_URL}`,
    },
    {
      id: "gemini-cli",
      name: "Gemini CLI",
      steps: ["~/.gemini/settings.json dosyasına ekle (Gemini CLI uzak sunucular için httpUrl kullanır):", "Gemini CLI'da /mcp yazarak bağlantıyı kontrol et."],
      snippet: JSON.stringify({ mcpServers: { kampus30: { httpUrl: MCP_URL } } }, null, 2),
    },
    {
      id: "vscode",
      name: "VS Code",
      steps: ["Projendeki .vscode/mcp.json dosyasına ekle:"],
      snippet: JSON.stringify({ servers: { kampus30: { type: "http", url: MCP_URL } } }, null, 2),
    },
    {
      id: "cursor",
      name: "Cursor",
      steps: ["~/.cursor/mcp.json dosyasına ekle:"],
      snippet: JSON.stringify({ mcpServers: { kampus30: { url: MCP_URL } } }, null, 2),
    },
    {
      id: "other",
      name: "Diğer",
      steps: ["MCP destekleyen her uygulamada uzak sunucu (Streamable HTTP) olarak bu adresi ekle. Hesap ya da anahtar gerekmez."],
      snippet: MCP_URL,
    },
  ];

  return (
    <div className="flex flex-col gap-12">
      <section className="relative overflow-hidden rounded-3xl border-2 border-border bg-pop-violet p-6 text-pop-fg shadow-pop-lg sm:p-10">
        <span aria-hidden className="pointer-events-none absolute -right-4 -top-6 select-none text-[9rem] leading-none opacity-20 sm:text-[12rem]">
          30
        </span>
        <div className="relative flex flex-col gap-4">
          <p className="w-fit -rotate-2 rounded-full border-2 border-border bg-pop-yellow px-3 py-1 font-display text-sm font-bold shadow-pop-sm">
            🤖 Claude, Gemini ve diğerleri için
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Fırsatları ve CV&apos;ni{" "}
            <span className="inline-block rotate-2 rounded-xl border-2 border-border bg-pop-mint px-2 shadow-pop-sm">yapay zekana</span> sor
          </h1>
          <p className="max-w-2xl text-base font-medium sm:text-lg">
            Kampüs30, yapay zeka asistanına bağlanan ücretsiz bir MCP sunucusu. Asistanın hackathon, kamp, staj ve yarışmalar için
            doğru kaynaklara gider, bulduklarını linkleriyle getirir ve CV&apos;ni seninle birlikte hazırlar. Üyelik yok.
          </p>
          <div className="flex max-w-xl flex-wrap items-center gap-2 rounded-2xl border-2 border-border bg-surface p-2 pl-4 text-fg shadow-pop-sm">
            <code className="min-w-0 flex-1 truncate text-sm sm:text-base">{MCP_URL}</code>
            <CopyButton text={MCP_URL} event="mcp-kopyala" label="Adresi kopyala" />
          </div>
        </div>
      </section>

      <section aria-labelledby="baglan" className="flex flex-col gap-4">
        <h2 id="baglan" className="font-display text-3xl font-extrabold tracking-tight">🔌 1 dakikada bağlan</h2>
        <SetupTabs clients={clients} />
      </section>

      <section aria-labelledby="ornekler" className="flex flex-col gap-4">
        <h2 id="ornekler" className="font-display text-3xl font-extrabold tracking-tight">💬 Neler sorabilirsin?</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {EXAMPLES.map((e) => (
            <li key={e.text} className="flex gap-3 rounded-2xl border-2 border-border bg-surface p-4 shadow-pop">
              <span aria-hidden className="text-2xl">{e.emoji}</span>
              <p className="font-medium">&ldquo;{e.text}&rdquo;</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="araclar" className="flex flex-col gap-4">
        <h2 id="araclar" className="font-display text-3xl font-extrabold tracking-tight">🧰 Asistanına kazandırdıkları</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <li key={t.name} className="flex flex-col gap-1 rounded-2xl border-2 border-border bg-surface p-4 shadow-pop">
              <code className="w-fit rounded-md bg-accent-soft px-2 py-0.5 text-sm font-semibold text-accent">{t.name}</code>
              <p className="text-fg-muted">{t.text}</p>
            </li>
          ))}
        </ul>
        <p className="text-fg-muted">
          Şu an <Link href="/kaynaklar" className="font-medium text-fg underline">{sources.length} kaynak</Link> listede. Bildiğin
          bir sayfa eksikse <Link href="/oneri" className="font-medium text-fg underline">öner</Link>.
        </p>
      </section>

      <section aria-labelledby="ilkeler" className="flex flex-col gap-4">
        <h2 id="ilkeler" className="font-display text-3xl font-extrabold tracking-tight">🤝 İlkelerimiz</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          <li className="rounded-2xl border-2 border-border bg-pop-sky p-4 text-pop-fg shadow-pop">
            <p className="font-display font-bold">Her bilgi linkiyle</p>
            <p className="mt-1 text-sm">Asistanın her fırsatı kaynak sayfasının linkiyle verir; tarihi tek tıkla kontrol edebilirsin.</p>
          </li>
          <li className="rounded-2xl border-2 border-border bg-pop-orange p-4 text-pop-fg shadow-pop">
            <p className="font-display font-bold">Sitelerin kurallarına saygı</p>
            <p className="mt-1 text-sm">Otomatik erişimi yasaklayan siteler okunmaz, yalnızca linkleri verilir. Giriş ya da bot koruması aşılmaz.</p>
          </li>
          <li className="rounded-2xl border-2 border-border bg-pop-pink p-4 text-pop-fg shadow-pop">
            <p className="font-display font-bold">Kişisel veri yok</p>
            <p className="mt-1 text-sm">Hesap yok. Sohbetlerin bize gelmez; araçlara yalnızca arama filtreleri ve istersen GitHub kullanıcı adın ulaşır, saklanmaz. Kod açık kaynak.</p>
          </li>
        </ul>
      </section>
    </div>
  );
}
