import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Explore Karthik Thyagarajan\'s portfolio of software projects, research work, and technical innovations. From machine learning to full-stack development.',
  keywords: ['projects', 'portfolio', 'software development', 'machine learning', 'research', 'Karthik Thyagarajan'],
  alternates: { canonical: '/projects' },
};

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
