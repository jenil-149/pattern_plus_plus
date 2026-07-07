import type { Metadata } from "next";
import { Domine, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import ModalProvider from "@/providers/ModalProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const domine = Domine({
  variable: "--font-domine",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Pattern++",
  description:
    "A smart interview preparation platform combining Pattern Recognition with the SM-2 Spaced Repetition Algorithm.",
  icons: {
    icon: "/images/p++.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${domine.variable} ${poppins.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <TooltipProvider delayDuration={0}>
            <ModalProvider />
            {children}
            <Toaster
              richColors
              position="bottom-right"
              toastOptions={{
                style: {
                  fontFamily: "var(--font-poppins)",
                },
              }}
            />
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
