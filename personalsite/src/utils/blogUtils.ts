import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

// Define the path to your posts directory
const postsDirectory = path.join(process.cwd(), 'blog/posts');

// Define the types for post metadata and post content
export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  summary?: string;
}

export interface Post extends PostMeta {
  contentHtml: string;
}

export function getSortedPosts(): PostMeta[] {
  const fileNames = fs.readdirSync(postsDirectory);

  const posts: PostMeta[] = fileNames.map((fileName) => {
    const slug = fileName.replace(/\.md$/, '');
    const fullPath = path.join(postsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, 'utf8');

    const { data } = matter(fileContents);

    return {
      slug,
      title: data.title,
      date: data.date,
      summary: data.summary ?? '',
    };
  });

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getPostBySlug(slug: string): Promise<Post> {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');

  const { data, content } = matter(fileContents);
  const processedContent = await remark()
  .use(html, { sanitize: false }) // Important: set sanitize to false to allow HTML
  .process(content);
  const contentHtml = processedContent.toString();

  return {
    slug,
    title: data.title,
    date: data.date,
    summary: data.summary ?? '',
    contentHtml,
  };
}
