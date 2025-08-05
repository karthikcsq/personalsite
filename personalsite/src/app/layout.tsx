import "@/app/globals.css"; // Ensures Tailwind styles are applied
import Navbar from "@/app/components/navbar";
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Karthik Thyagarajan',
    default: 'Karthik Thyagarajan - Software Engineer & Researcher'
  },
  description: 'Personal website of Karthik Thyagarajan - Software Engineer, Researcher, and Technology Enthusiast. Explore my projects, research, and professional journey.',
  keywords: ['Karthik Thyagarajan', 'Software Engineer', 'Researcher', 'Portfolio', 'Projects', 'Technology'],
  authors: [{ name: 'Karthik Thyagarajan' }],
  creator: 'Karthik Thyagarajan',
  metadataBase: new URL('https://karthikthyagarajan.com'), // Replace with your actual domain
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.karthikthyagarajan.com', // Replace with your actual domain
    title: 'Karthik Thyagarajan - Software Engineer & Researcher',
    description: 'Personal website of Karthik Thyagarajan - Software Engineer, Researcher, and Technology Enthusiast.',
    siteName: 'Karthik Thyagarajan',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

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