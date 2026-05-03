import { Geist, Geist_Mono, Figtree, Raleway } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils";

const ralewayHeading = Raleway({subsets:['latin'],variable:'--font-heading'});

const figtree = Figtree({subsets:['latin'],variable:'--font-sans'})

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
      className={cn("antialiased", fontMono.variable, "font-sans", figtree.variable, ralewayHeading.variable)}
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
