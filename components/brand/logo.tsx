import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("font-display-forge text-2xl", className)} aria-label="FORGE — início">
      FORGE<span className="text-orange">.</span>
    </Link>
  );
}
