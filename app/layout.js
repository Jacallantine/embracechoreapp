import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";
import Navbar from "./components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Embrace Chores — Weekly Chore Rotation",
  description: "Manage and rotate weekly chores for Embrace Alabama Kids scholars",
  icons: {
    icon: "/embrace-logo.svg",
    shortcut: "/embrace-logo.svg",
    apple: "/embrace-logo.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
