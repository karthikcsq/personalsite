import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

// Define the path to your posts directory
const postsDirectory = path.join(process.cwd(), 'blog/posts');

const WORDS_PER_MINUTE = 230;

// Define the types for post metadata and post content
export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  summary?: string;
  readingMinutes: number;
}

export interface PostHeading {
  id: string;
  text: string;
}

export interface Post extends PostMeta {
  contentHtml: string;
  headings: PostHeading[];
}

// Frontmatter dates are bare `YYYY-MM-DD`. Formatting in UTC keeps the day
// from slipping backwards when the build machine sits west of Greenwich.
export function formatPostDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function postMetaLine(post: Pick<PostMeta, 'date' | 'readingMinutes'>): string {
  return `${formatPostDate(post.date)} · ${post.readingMinutes} min read`;
}

function readingMinutes(markdown: string): number {
  const words = markdown
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

// remark-html emits headings without ids. Give every h2–h4 a stable anchor so
// the table of contents and shared links can point at a section, and collect
// the h2s as the contents list.
function anchorHeadings(contentHtml: string): { contentHtml: string; headings: PostHeading[] } {
  const headings: PostHeading[] = [];
  const used = new Map<string, number>();
  const withIds = contentHtml.replace(
    /<h([2-4])>([\s\S]*?)<\/h\1>/g,
    (_match, level: string, inner: string) => {
      const text = stripTags(inner);
      const base = slugify(text) || 'section';
      const count = used.get(base) ?? 0;
      used.set(base, count + 1);
      const id = count ? `${base}-${count + 1}` : base;
      if (level === '2') headings.push({ id, text });
      return `<h${level} id="${id}">${inner}</h${level}>`;
    },
  );
  return { contentHtml: withIds, headings };
}

export function getSortedPosts(): PostMeta[] {
  const fileNames = fs.readdirSync(postsDirectory);

  const posts: PostMeta[] = fileNames.map((fileName) => {
    const slug = fileName.replace(/\.md$/, '');
    const fullPath = path.join(postsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, 'utf8');

    const { data, content } = matter(fileContents);

    return {
      slug,
      title: data.title,
      date: data.date,
      summary: data.summary ?? '',
      readingMinutes: readingMinutes(content),
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
  const { contentHtml, headings } = anchorHeadings(processedContent.toString());

  return {
    slug,
    title: data.title,
    date: data.date,
    summary: data.summary ?? '',
    readingMinutes: readingMinutes(content),
    contentHtml,
    headings,
  };
}
