/** Título de página no padrão do app (rótulo mono + título). */
export function PageTitle({ eyebrow, title, children }: { index?: string; eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="label-mono">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
      </div>
      {children}
    </div>
  );
}
