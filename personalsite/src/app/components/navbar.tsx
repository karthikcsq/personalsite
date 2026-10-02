"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "./SiteHeader";
import { CORPUS_NAV_ITEMS, destinationForPath } from "./CorpusNavigation";
import styles from "./navbar.module.css";

// The in-chat menu uses the same destinations while opening them in new tabs.
export const NAV_ITEMS = CORPUS_NAV_ITEMS.map(({ href, label }) => ({ href, label }));

export default function Navbar() {
  const pathname = usePathname() ?? "";

  return (
    <div className={styles.shell}>
      <SiteHeader current={destinationForPath(pathname)} />
    </div>
  );
}
