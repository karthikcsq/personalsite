import { getPostBySlug, getSortedPosts } from '@/utils/blogUtils';
import { Metadata } from 'next';

// Fix: Make both params and searchParams Promise types
type Props = {
  params: Promise<{ slug: string }>,
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

// Generate metadata for SEO
export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getPostBySlug(resolvedParams.slug);
  return {
    title: post.title,
    description: post.summary || `Read Karthik Thyagarajan's blog post: ${post.title}`,
    keywords: ['blog', 'Karthik Thyagarajan', 'technology', 'research', post.title],
    authors: [{ name: 'Karthik Thyagarajan' }],
    openGraph: {
      title: post.title,
      description: post.summary || `Read Karthik Thyagarajan's blog post: ${post.title}`,
      type: 'article',
      publishedTime: post.date,
      authors: ['Karthik Thyagarajan'],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.summary || `Read Karthik Thyagarajan's blog post: ${post.title}`,
    },
  };
}

// Generate static paths for all blog slugs
export async function generateStaticParams(): Promise<
  { slug: string }[]
> {
  const posts = getSortedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

// Remove searchParams from the parameters since you're not using it
export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  
  const post = await getPostBySlug(resolvedParams.slug);

  return (
    <section className="relative flex flex-col min-h-screen text-white overflow-hidden">     
      <div className="max-w-4xl mx-auto w-full p-4 pt-28 pb-16">
        {/* Blog Post Container */}
        <div 
          className="rounded-lg backdrop-blur-sm p-8"
          style={{ 
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            boxShadow: "0 0 10px rgba(255, 255, 255, 0.6), 0 0 20px rgba(255, 255, 255, 0.4)"
          }}
        >
          <h1 className="font-quicksand text-4xl font-bold mb-2 text-white">{post.title}</h1>
          <div className="text-sm text-gray-300 mb-6 font-quicksand">{post.date}</div>
          
          <article
            className="prose prose-invert"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
        </div>
      </div>
    </section>
  );
}