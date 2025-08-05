import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'Photo gallery showcasing Karthik Thyagarajan\'s travels and adventures around the world. Explore images from Costa Rica, Hawaii, Kilimanjaro, Amsterdam, and more.',
  keywords: ['gallery', 'photos', 'travel', 'adventure', 'Costa Rica', 'Hawaii', 'Kilimanjaro', 'Amsterdam', 'Karthik Thyagarajan'],
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
