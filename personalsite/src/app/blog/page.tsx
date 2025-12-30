import Link from 'next/link';
import { getSortedPosts } from '@/utils/blogUtils';
import { Metadata } from 'next';
import { BookOpen, Calendar, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Read about Karthik Thyagarajan\'s thoughts on technology, research, and personal experiences. Insights from a software engineer and researcher.',
  keywords: ['blog', 'technology', 'research', 'software engineering', 'Karthik Thyagarajan'],
};

export default async function BlogIndex() {
  const posts = getSortedPosts();

  return (
    <section className="relative flex flex-col min-h-screen text-white overflow-hidden">

      <div className="max-w-5xl mx-auto w-full px-6 sm:px-8 pt-32 pb-20 relative" style={{ zIndex: 10 }}>
        {/* Header */}
        <div className="mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
            <BookOpen className="w-4 h-4 text-white" />
            <span className="text-xs font-host-grotesk font-medium text-white tracking-wide uppercase">Writing & Thoughts</span>
          </div>

          <h1 className="font-host-grotesk text-5xl sm:text-6xl font-light tracking-tight text-white mb-4">Blog</h1>
          <div className="h-0.5 w-16 bg-gradient-to-r from-blue-500 to-transparent mb-6"></div>
          <p className="font-host-grotesk text-lg text-gray-400 max-w-2xl">
            Exploring ideas at the intersection of technology, AI, and innovation
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-host-grotesk text-lg">No posts available yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post, index) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block"
                style={{
                  animation: 'fadeIn 0.6s ease-out forwards',
                  animationDelay: `${index * 0.1}s`,
                  opacity: 0
                }}
              >
                <article className="relative overflow-hidden bg-white/[0.02] border border-white/10 hover:border-blue-500/30 p-8 rounded-xl backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.04] hover:scale-[1.01] shadow-lg hover:shadow-blue-500/10">
                  {/* Hover gradient effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="relative z-10">
                    {/* Date Badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <time className="text-sm text-gray-500 font-host-grotesk font-light tracking-wide">
                        {post.date}
                      </time>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl sm:text-3xl font-host-grotesk font-medium text-white mb-4 group-hover:text-blue-400 transition-colors duration-300">
                      {post.title}
                    </h2>

                    {/* Summary */}
                    {post.summary && (
                      <p className="text-gray-400 font-host-grotesk font-light leading-relaxed mb-6 line-clamp-2">
                        {post.summary}
                      </p>
                    )}

                    {/* Read More Link */}
                    <div className="flex items-center gap-2 text-white font-host-grotesk font-medium text-sm group-hover:gap-3 transition-all duration-300">
                      <span>Read Article</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>

                  {/* Corner accent */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-bl-full" />
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>

    </section>
  );
}
