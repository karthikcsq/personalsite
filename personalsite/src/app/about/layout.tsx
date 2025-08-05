import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about Karthik Thyagarajan - Software Engineer, Researcher, and Technology Enthusiast. Discover my background, skills, and journey in computer science.',
  keywords: ['about', 'Karthik Thyagarajan', 'software engineer', 'researcher', 'computer science', 'biography'],
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
