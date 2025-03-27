import "@/app/globals.css"; // Ensures Tailwind styles are applied
import Navbar from "@/app/components/navbar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full text-white m-0 p-0">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}