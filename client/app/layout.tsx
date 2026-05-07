import { DM_Sans, DM_Serif_Display, Geist_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils";

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600'],
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: '400',
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, dmSans.variable, dmSerifDisplay.variable)}
    >
      <body>
        <QueryProvider>
          <ThemeProvider>
            {children}
            <Toaster richColors position="top-right" closeButton duration={3000} />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
