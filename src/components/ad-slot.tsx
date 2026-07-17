// Slot de publicidad reservado (PLAN.md §5). En el MVP se renderiza como
// placeholder discreto; cuando haya anunciantes se reemplaza el contenido.
const SIZES = {
  leaderboard: "h-[90px] max-w-[728px]",
  mpu: "h-[250px] max-w-[300px]",
  banner: "h-[100px] max-w-full",
} as const;

export function AdSlot({ format = "banner" }: { format?: keyof typeof SIZES }) {
  return (
    <div
      aria-hidden
      className={`mx-auto flex w-full items-center justify-center rounded-lg border border-dashed border-borde text-[11px] uppercase tracking-widest text-muted/60 ${SIZES[format]}`}
    >
      Publicidad
    </div>
  );
}
