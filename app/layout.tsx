import type { Metadata } from "next";
import { Courier_Prime, Special_Elite } from "next/font/google";
import { cookies } from "next/headers";
import { APP_NAME, TAGLINE } from "@/lib/brand";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import "./globals.css";

const typeFont = Courier_Prime({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext"],
  variable: "--nf-type",
});

const displayFont = Special_Elite({
  weight: "400",
  subsets: ["latin"],
  variable: "--nf-display",
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: TAGLINE,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html
      lang="en"
      data-palette={theme.palette}
      data-mode={theme.mode}
      className={`${typeFont.variable} ${displayFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full">{children}</body>
    </html>
  );
}
