// app/layout.tsx
import "./globals.css";
import { JetBrains_Mono } from "next/font/google";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { SolanaProvider } from "./providers/SolanaProvider";
import Navbar from "./components/Nav-Bar";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="bg-background text-foreground font-mono antialiased">
        <SolanaProvider>
          <ConvexClientProvider>
            {/* Full viewport height with flex column */}
            <div className="min-h-screen flex flex-col">
              {/* Subtle animated gradient background */}
              <div
                className="pointer-events-none fixed inset-0 z-0 opacity-50"
                aria-hidden="true"
                style={{
                  background: `
                    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
                    radial-gradient(circle at 80% 20%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
                    linear-gradient(to bottom right, rgba(255,255,255,0.05), transparent, rgba(0,0,0,0.05))
                  `,
                }}
              />

              {/* Navbar (desktop sidebar + mobile header) */}
              <Navbar />

              {/* Main content area — grows to fill space */}
              <main className="flex-1 lg:pl-64">
                <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                  {children}
                </div>
              </main>
            </div>
          </ConvexClientProvider>
        </SolanaProvider>
      </body>
    </html>
  );
}