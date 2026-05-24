"""
BERTopic-based conversation classifier.

This is the "real solution to deploy" described in the delivery notes: a free,
local, semantic classifier with no per-message API cost. It embeds the text
with a multilingual sentence-transformer and assigns the conversation to one of
three category clusters that BERTopic discovers, then maps that cluster to the
matching `IntentCategory`.

Why it is shipped but NOT the default provider
-----------------------------------------------
The cluster boundaries are fit on a tiny, illustrative corpus (`seed_data.py`).
To be production-grade, BERTopic must be fit on a large corpus of real, ideally
labelled, customer questions (the proprietary data) — that is what makes the
inter-cluster vector distances reliable. So the pipeline, serving and wiring are
production-shaped, but the *training corpus* is a placeholder. Until that data
exists, the app defaults to the OpenAI provider (see CLASSIFIER_PROVIDER).
"""

from __future__ import annotations

import threading
from collections import Counter
from dataclasses import dataclass
from typing import Optional

import numpy as np
from bertopic import BERTopic
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity
from umap import UMAP

from seed_data import CATEGORY_SEED_KEYWORDS, LABELLED_EXAMPLES

# Must match the Prisma `IntentCategory` enum. Order matters: it aligns the
# seed-keyword lists passed to BERTopic.
CATEGORIES = ["BILLING", "TECHNICAL", "GENERAL"]
UNKNOWN = "UNKNOWN"

# A multilingual model — the customer base writes in French.
EMBEDDING_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"

# Below this cosine similarity to the assigned category centroid we abstain
# (return UNKNOWN) rather than guess. This is the "limite à xx %" that, on real
# data, would be tuned from the inter-cluster distance distribution.
CONFIDENCE_THRESHOLD = 0.30


@dataclass
class Prediction:
    category: str
    confidence: float


class BertopicClassifier:
    """Fits once on import; thread-safe singleton via `get_classifier()`."""

    def __init__(self) -> None:
        docs = [ex["text"] for ex in LABELLED_EXAMPLES]
        labels = [ex["category"] for ex in LABELLED_EXAMPLES]
        n_docs = len(docs)

        self._embedder = SentenceTransformer(EMBEDDING_MODEL)
        embeddings = np.asarray(
            self._embedder.encode(docs, show_progress_bar=False)
        )

        # Force exactly three clusters (one per category). KMeans is robust on a
        # small corpus, deterministic with a fixed seed, and never yields
        # "outlier" topics — unlike the default HDBSCAN, which needs far more
        # data. UMAP params are scaled down to fit the small corpus.
        umap_model = UMAP(
            n_neighbors=min(15, max(2, n_docs - 1)),
            n_components=5,
            min_dist=0.0,
            metric="cosine",
            random_state=42,
        )
        self._topic_model = BERTopic(
            embedding_model=self._embedder,
            umap_model=umap_model,
            hdbscan_model=KMeans(n_clusters=3, random_state=42, n_init=10),
            # Guided modelling: steer topics toward each category's vocabulary.
            seed_topic_list=[CATEGORY_SEED_KEYWORDS[c] for c in CATEGORIES],
            calculate_probabilities=False,
            verbose=False,
        )
        topics, _ = self._topic_model.fit_transform(docs, embeddings)

        # Map each discovered topic id -> category by majority vote of the
        # labelled docs that landed in it.
        self._topic_to_category: dict[int, str] = {}
        for topic_id in set(topics):
            members = [labels[i] for i, t in enumerate(topics) if t == topic_id]
            self._topic_to_category[topic_id] = Counter(members).most_common(1)[0][0]

        # Per-category centroid embeddings — used for the confidence score and as
        # a nearest-centroid fallback when a topic can't be mapped.
        self._centroids: dict[str, np.ndarray] = {}
        for cat in CATEGORIES:
            idx = [i for i, lab in enumerate(labels) if lab == cat]
            self._centroids[cat] = embeddings[idx].mean(axis=0)

    def classify(self, text: str) -> Prediction:
        text = (text or "").strip()
        if not text:
            return Prediction(UNKNOWN, 0.0)

        emb = np.asarray(self._embedder.encode([text], show_progress_bar=False))

        # Primary assignment comes from BERTopic.
        topics, _ = self._topic_model.transform([text], emb)
        category: Optional[str] = self._topic_to_category.get(int(topics[0]))

        # Similarity of the text to every category centroid (vector distance).
        sims = {
            cat: float(cosine_similarity(emb, centroid.reshape(1, -1))[0][0])
            for cat, centroid in self._centroids.items()
        }
        # Fall back to the nearest centroid if the topic couldn't be mapped.
        if category is None:
            category = max(sims, key=lambda c: sims[c])

        confidence = sims.get(category, 0.0)
        if confidence < CONFIDENCE_THRESHOLD:
            return Prediction(UNKNOWN, round(confidence, 4))
        return Prediction(category, round(confidence, 4))


_lock = threading.Lock()
_instance: Optional[BertopicClassifier] = None


def get_classifier() -> BertopicClassifier:
    """Lazily build and cache the classifier (loads the embedding model once)."""
    global _instance
    if _instance is None:
        with _lock:
            if _instance is None:
                _instance = BertopicClassifier()
    return _instance


if __name__ == "__main__":
    # Quick manual smoke test: `python classifier.py`
    clf = get_classifier()
    for sample in [
        "On m'a prélevé deux fois, je veux un remboursement.",
        "Mon écran est cassé et l'appareil ne s'allume plus.",
        "Quel est le délai de livraison après souscription ?",
        "Bonjour, j'aurais une question.",
    ]:
        pred = clf.classify(sample)
        print(f"{pred.category:9s} ({pred.confidence:.3f})  <- {sample}")
