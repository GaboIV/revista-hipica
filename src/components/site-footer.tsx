export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-borde bg-surface-2">
      <div className="mx-auto max-w-6xl px-4 py-8 text-center text-sm text-muted">
        <p className="font-display text-base font-semibold text-foreground">
          Revista Hípica de Venezuela
        </p>
        <p className="mt-1">
          Hipódromo La Rinconada · Caracas · © {new Date().getFullYear()}
        </p>
        <p className="mt-3 text-xs">
          Datos oficiales del INH. Pronósticos propios — juegue con responsabilidad.
        </p>
      </div>
    </footer>
  );
}
