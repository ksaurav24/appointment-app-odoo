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
            className="h-full gap-2 transition-colors group-hover:bg-accent/40"
          >
            <CardContent className="flex h-full flex-col gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <HugeiconsIcon icon={link.icon} className="size-4" />
              </div>
              <p className="font-medium">{link.label}</p>
              <p className="text-xs text-muted-foreground">{link.description}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
