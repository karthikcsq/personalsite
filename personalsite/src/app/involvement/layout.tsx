import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Involvement',
  description: "Karthik Thyagarajan's community and leadership involvement, including buildpurdue, the campus accelerator he co-founded and runs at Purdue.",
  keywords: ['involvement', 'leadership', 'buildpurdue', 'accelerator', 'entrepreneurship', 'Purdue', 'Karthik Thyagarajan'],
};

export default function InvolvementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
