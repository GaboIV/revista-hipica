// Número del ejemplar con el color estándar de su manta (ver globals.css).
export function Gualdrapa({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`gualdrapa ${className}`} data-n={Math.min(n, 16)}>
      {n}
    </span>
  );
}
