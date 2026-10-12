import { Eyebrow } from "@/components/brand/eyebrow";

export function PageTitle({ index, eyebrow, title, children }: {
  index: string;
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-3">
        <Eyebrow index={index}>{eyebrow}</Eyebrow>
        <h1 className="font-display-forge text-4xl md:text-5xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}
