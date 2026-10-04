export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 leading-relaxed [&_a]:font-medium [&_a]:underline [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-fg-muted [&_li]:text-fg-muted">
      {children}
    </div>
  );
}
