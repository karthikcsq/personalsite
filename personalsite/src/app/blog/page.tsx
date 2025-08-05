import Link from 'next/link';
import { getSortedPosts } from '@/utils/blogUtils';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Read about Karthik Thyagarajan\'s thoughts on technology, research, and personal experiences. Insights from a software engineer and researcher.',
  keywords: ['blog', 'technology', 'research', 'software engineering', 'Karthik Thyagarajan'],
};

export default async function BlogIndex() {
  const posts = getSortedPosts();

  return (
    <section className="relative flex flex-col min-h-screen text-white overflow-hidden">      
      <div className="max-w-4xl mx-auto w-full p-4 pt-28 pb-16">
        {/* Blog Posts Container */}
        <div 
          className="rounded-lg backdrop-blur-sm p-8"
          style={{ 
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            boxShadow: "0 0 10px rgba(255, 255, 255, 0.6), 0 0 20px rgba(255, 255, 255, 0.4)"
          }}
        >
          <h1 className="font-quicksand text-4xl font-bold mb-6">Blog</h1>
          
          {posts.length === 0 ? (
            <p className="text-center text-lg my-12">No posts available yet.</p>
          ) : (
            <ul className="space-y-6">
              {posts.map((post) => (
                <li key={post.slug} className="border-b border-white/20 pb-4 last:border-0">
                  <Link href={`/blog/${post.slug}`} className="block hover:bg-white/5 p-3 rounded-md transition-colors">
                    <div className="text-xl text-white font-semibold font-quicksand hover:text-blue-300 transition-colors">
                      {post.title}
                    </div>
                    <div className="text-sm text-gray-300 mt-1">{post.date}</div>
                    {post.summary && (
                      <p className="text-gray-200 mt-2 line-clamp-2">{post.summary}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}