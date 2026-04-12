"""
Simple BM25 encoder for hybrid search.
Designed to produce sparse vectors compatible with Pinecone,
with a model export format that can be loaded in TypeScript.
"""

import json
import math
import re
from collections import Counter

# Common English stopwords
STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "if", "in",
    "into", "is", "it", "no", "not", "of", "on", "or", "such", "that", "the",
    "their", "then", "there", "these", "they", "this", "to", "was", "will", "with",
    "i", "me", "my", "we", "our", "you", "your", "he", "him", "his", "she", "her",
    "its", "them", "what", "which", "who", "whom", "how", "when", "where", "why",
    "do", "does", "did", "has", "have", "had", "am", "been", "being", "would",
    "could", "should", "can", "may", "might", "shall", "about", "from", "up",
    "out", "so", "than", "too", "very", "just", "also", "more", "some", "any",
    "all", "each", "every", "both", "few", "own", "other", "over", "under",
}


def tokenize(text: str) -> list[str]:
    """Simple tokenizer: lowercase, remove non-alphanumeric, split, remove stopwords and short tokens."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    tokens = text.split()
    return [t for t in tokens if len(t) > 1 and t not in STOPWORDS]


class SimpleBM25:
    def __init__(self, k1: float = 1.2, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.vocab: dict[str, int] = {}       # token -> index
        self.doc_freq: dict[int, int] = {}     # index -> number of docs containing token
        self.idf: dict[int, float] = {}        # index -> IDF score
        self.avgdl: float = 0.0
        self.n_docs: int = 0
        self._next_index: int = 0

    def _get_or_create_index(self, token: str) -> int:
        if token not in self.vocab:
            self.vocab[token] = self._next_index
            self._next_index += 1
        return self.vocab[token]

    def fit(self, corpus: list[str]) -> "SimpleBM25":
        """Fit BM25 on a list of document strings."""
        self.n_docs = len(corpus)
        total_length = 0

        # Count document frequencies
        for text in corpus:
            tokens = tokenize(text)
            total_length += len(tokens)
            seen = set()
            for token in tokens:
                idx = self._get_or_create_index(token)
                if idx not in seen:
                    self.doc_freq[idx] = self.doc_freq.get(idx, 0) + 1
                    seen.add(idx)

        self.avgdl = total_length / max(self.n_docs, 1)

        # Compute IDF for each term
        for idx, df in self.doc_freq.items():
            self.idf[idx] = math.log((self.n_docs - df + 0.5) / (df + 0.5) + 1.0)

        print(f"  BM25 fitted: {len(self.vocab)} terms, {self.n_docs} docs, avgdl={self.avgdl:.1f}")
        return self

    def encode_document(self, text: str) -> dict:
        """Encode a document into a sparse vector using BM25 TF-IDF scoring."""
        tokens = tokenize(text)
        doc_len = len(tokens)
        tf_counts = Counter(tokens)

        indices = []
        values = []
        for token, tf in tf_counts.items():
            if token not in self.vocab:
                continue
            idx = self.vocab[token]
            idf = self.idf.get(idx, 0.0)
            # BM25 TF component
            tf_score = (tf * (self.k1 + 1)) / (tf + self.k1 * (1 - self.b + self.b * doc_len / self.avgdl))
            score = idf * tf_score
            if score > 0:
                indices.append(idx)
                values.append(round(score, 6))

        return {"indices": indices, "values": values}

    def encode_query(self, text: str) -> dict:
        """Encode a query into a sparse vector using IDF-only scoring."""
        tokens = tokenize(text)
        seen = set()
        indices = []
        values = []
        for token in tokens:
            if token not in self.vocab or token in seen:
                continue
            seen.add(token)
            idx = self.vocab[token]
            idf = self.idf.get(idx, 0.0)
            if idf > 0:
                indices.append(idx)
                values.append(round(idf, 6))

        return {"indices": indices, "values": values}

    def save(self, path: str):
        """Save model to JSON for use in TypeScript."""
        # Invert vocab for the export (index -> token, for debugging)
        model = {
            "k1": self.k1,
            "b": self.b,
            "avgdl": self.avgdl,
            "n_docs": self.n_docs,
            "vocab": self.vocab,         # token -> index
            "idf": {str(k): v for k, v in self.idf.items()},  # index -> idf (JSON keys must be strings)
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(model, f)
        print(f"  BM25 model saved to {path} ({len(self.vocab)} terms)")

    @classmethod
    def load(cls, path: str) -> "SimpleBM25":
        """Load model from JSON."""
        with open(path, "r", encoding="utf-8") as f:
            model = json.load(f)
        bm25 = cls(k1=model["k1"], b=model["b"])
        bm25.avgdl = model["avgdl"]
        bm25.n_docs = model["n_docs"]
        bm25.vocab = model["vocab"]
        bm25.idf = {int(k): v for k, v in model["idf"].items()}
        bm25._next_index = max(bm25.vocab.values()) + 1 if bm25.vocab else 0
        return bm25
