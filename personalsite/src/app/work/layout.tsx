import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Work Experience',
  description: 'Discover Karthik Thyagarajan\'s professional journey including roles at Peraton Labs, Memories.ai, and other technology companies. Machine learning research and software engineering experience.',
  keywords: ['work experience', 'career', 'machine learning', 'research', 'internships', 'Peraton Labs', 'Karthik Thyagarajan'],
};

export default function WorkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
