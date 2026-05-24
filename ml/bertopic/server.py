"""
FastAPI wrapper around the BERTopic classifier.

The Next.js app talks to this service over HTTP when CLASSIFIER_PROVIDER=bertopic
(see src/server/ai/classify.ts). Run it with:

    uvicorn server:app --host 127.0.0.1 --port 8000

The embedding model is loaded once on startup and kept warm in memory, so
classification calls are fast and incur no API cost.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel

from classifier import get_classifier


class ClassifyRequest(BaseModel):
    # The whole conversation transcript (built by the Node side).
    text: str


class ClassifyResponse(BaseModel):
    category: str  # BILLING | TECHNICAL | GENERAL | UNKNOWN
    confidence: float


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Warm the model (fit on the seed corpus) before serving requests.
    get_classifier()
    yield


app = FastAPI(title="Evollis BERTopic classifier", lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/classify", response_model=ClassifyResponse)
def classify(req: ClassifyRequest) -> ClassifyResponse:
    pred = get_classifier().classify(req.text)
    return ClassifyResponse(category=pred.category, confidence=pred.confidence)
