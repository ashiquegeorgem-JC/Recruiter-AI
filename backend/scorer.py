AI_KEYWORDS = [
    "llm",
    "embeddings",
    "rag",
    "transformers",
    "fine-tuning",
    "nlp",
    "deep learning",
    "machine learning"
]

RETRIEVAL_KEYWORDS = [
    "retrieval",
    "ranking",
    "recommendation",
    "search",
    "vector",
    "faiss",
    "milvus",
    "pinecone",
    "qdrant",
    "elasticsearch"
]

PRODUCTION_KEYWORDS = [
    "production",
    "deployed",
    "real-time",
    "pipeline",
    "kafka",
    "spark",
    "serving"
]


def calculate_score(candidate):

    score = 0

    # --------------------
    # Skills
    # --------------------

    skills = candidate.get("skills", [])

    for skill in skills:

        name = skill.get("name", "").lower()

        if any(k in name for k in AI_KEYWORDS):
            score += 8

        if any(k in name for k in RETRIEVAL_KEYWORDS):
            score += 10

    # --------------------
    # Career History
    # --------------------

    for job in candidate.get("career_history", []):

        desc = job.get("description", "").lower()

        if any(k in desc for k in AI_KEYWORDS):
            score += 15

        if any(k in desc for k in RETRIEVAL_KEYWORDS):
            score += 20

        if any(k in desc for k in PRODUCTION_KEYWORDS):
            score += 10

    # --------------------
    # Signals
    # --------------------

    signals = candidate.get("redrob_signals", {})

    score += signals.get("github_activity_score", 0) * 2

    score += signals.get("saved_by_recruiters_30d", 0)

    score += signals.get("interview_completion_rate", 0) * 20

    score += signals.get("recruiter_response_rate", 0) * 20

    if signals.get("open_to_work_flag"):
        score += 10

    if signals.get("notice_period_days", 999) <= 60:
        score += 5

    return round(score, 2)