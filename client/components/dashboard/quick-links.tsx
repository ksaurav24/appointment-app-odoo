import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";

import { Card, CardContent } from "@/components/ui/card";

export type QuickLink = {
  href: string;
  label: string;
  description: string;
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
};

export function QuickLinks({ links }: { links: QuickLink[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="group">
          <Card
            size="sm"
            className="h-full gap-2 transition-colors group-hover:border-forest-light"
          >
            <CardContent className="flex h-full flex-col gap-2">
              <div className="flex size-10 items-center justify-center rounded-[10px] bg-forest-pale text-forest">
                <HugeiconsIcon icon={link.icon} className="size-[18px]" />
              </div>
              <p className="text-sm font-semibold text-foreground">{link.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{link.description}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
