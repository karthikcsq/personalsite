import Link from "next/link";
import CorpusArticle from "./components/CorpusArticle";

export default function NotFound() {
  return (
    <CorpusArticle category="writing" title="This page isn’t here." summary="Follow another branch.">
      <Link href="/">Return home →</Link>
    </CorpusArticle>
  );
}
