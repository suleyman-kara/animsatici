/** Kampüs30 logosu: kelime + eğik "30" çıkartması. */
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const big = size === "lg";
  return (
    <span className={`inline-flex items-center gap-1 font-display font-extrabold tracking-tight ${big ? "text-4xl" : "text-xl"}`}>
      Kampüs
      <span
        className={`inline-grid -rotate-6 place-items-center rounded-lg border-2 border-border bg-pop-yellow text-pop-fg shadow-pop-sm transition-transform hover:rotate-3 ${
          big ? "px-2 text-4xl" : "px-1.5 text-lg leading-tight"
        }`}
      >
        30
      </span>
    </span>
  );
}
