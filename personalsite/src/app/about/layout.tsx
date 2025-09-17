import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about Karthik Thyagarajan - Machine Learning Engineer, Researcher, and Technology Enthusiast. Discover my background, skills, and journey in computer science and AI.',
  keywords: ['about', 'Karthik Thyagarajan', 'machine learning', 'software engineer', 'researcher', 'computer science', 'biography'],
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
