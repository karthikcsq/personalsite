import styles from "./rss-link.module.css";

export default function RssLink() {
  return (
    <a className={styles.link} href="/feed.xml" type="application/rss+xml">
      <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="4" cy="16" r="1.2" fill="currentColor" stroke="none" />
        <path d="M3 9a8 8 0 0 1 8 8M3 3a14 14 0 0 1 14 14" />
      </svg>
      <span>Subscribe via RSS</span>
    </a>
  );
}
