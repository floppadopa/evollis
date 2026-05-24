# BERTopic classifier service

A free, local, semantic classifier that assigns a conversation to one of the
three categories (`BILLING` / `TECHNICAL` / `GENERAL`, else `UNKNOWN`). It is the
production-grade alternative to the OpenAI classifier: no per-message API cost
and it scales, because classification is just an embedding + a vector-distance
lookup.

It is **shipped but disabled by default**. The Next.js app uses it only when
`CLASSIFIER_PROVIDER=bertopic`; otherwise the OpenAI provider runs and this
service can stay off.

> ⚠️ **About accuracy.** The cluster boundaries are fit on a small, illustrative
> corpus in [`seed_data.py`](./seed_data.py). That stands in for the proprietary
> data you'd use in production — a large set of real, ideally labelled, customer
> questions. The pipeline and serving are production-shaped; only the training
> corpus is a placeholder. With a real corpus (≈1k–5k examples) the inter-cluster
> distances become meaningful and the abstention threshold (`CONFIDENCE_THRESHOLD`
> in [`classifier.py`](./classifier.py)) can be tuned from the distance
> distribution.

## How it works

1. **Embed** the conversation transcript with a multilingual
   sentence-transformer (`paraphrase-multilingual-MiniLM-L12-v2`).
2. **Cluster** the labelled seed corpus into 3 groups with BERTopic (guided by
   per-category seed keywords; KMeans forces exactly 3 clusters, which is robust
   on little data). Each cluster is mapped to a category by majority vote.
3. **Classify** a new message: BERTopic assigns it to a cluster → category, and
   the cosine similarity to that category's centroid gives a confidence. Below
   `CONFIDENCE_THRESHOLD` it returns `UNKNOWN` instead of guessing.

## Run it

From `ml/bertopic/`:

```bash
# 1. Create + activate a virtualenv (Python 3.9+)
python -m venv .venv
# Windows:        .venv\Scripts\activate
# macOS / Linux:  source .venv/bin/activate

# 2. Install (downloads PyTorch + the embedding model on first run — a few hundred MB)
pip install -r requirements.txt

# 3. (optional) smoke-test the classifier directly
python classifier.py

# 4. Serve it
uvicorn server:app --host 127.0.0.1 --port 8000
```

Then point the app at it (in the repo-root `.env`):

```
CLASSIFIER_PROVIDER="bertopic"
BERTOPIC_SERVICE_URL="http://127.0.0.1:8000"
```

Restart `npm run dev`. New customer messages are now categorised by this service
instead of OpenAI. (Reply generation still uses OpenAI in both modes.)

## API

- `GET /health` → `{ "status": "ok" }`
- `POST /classify` with `{ "text": "<conversation transcript>" }`
  → `{ "category": "BILLING" | "TECHNICAL" | "GENERAL" | "UNKNOWN", "confidence": 0.0–1.0 }`

If the service is unreachable, the Node side logs the error and falls back to
`UNKNOWN` so a send never fails.
