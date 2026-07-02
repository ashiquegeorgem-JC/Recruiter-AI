from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

# ==========================================================
# APP
# ==========================================================

app = FastAPI(title="Redrob AI Recruiter")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================================
# LOAD DATASET
# ==========================================================

candidates = []

with open("candidates.jsonl", "r", encoding="utf-8") as f:
    for line in f:
        candidates.append(json.loads(line))

print(f"Loaded {len(candidates)} candidates")


# ==========================================================
# REQUEST MODEL
# ==========================================================

class JobRequest(BaseModel):
    job_description: str


# ==========================================================
# ROOT
# ==========================================================

@app.get("/")
def root():
    return {
        "status": "running",
        "project": "Redrob AI Recruiter"
    }


# ==========================================================
# STATS
# ==========================================================

@app.get("/stats")
def stats():
    return {
        "total_candidates": len(candidates),
        "top_candidates": 100
    }


# ==========================================================
# CANDIDATE SCORING
# ==========================================================

def calculate_candidate_score(candidate):

    profile = candidate.get("profile", {})
    signals = candidate.get("redrob_signals", {})

    experience = profile.get(
        "years_of_experience",
        0
    )

    skill_score = 0

    for skill in candidate.get("skills", []):
        skill_score += skill.get(
            "endorsements",
            0
        )

    signal_score = (
        signals.get("endorsements_received", 0) * 0.1
        + signals.get("connection_count", 0) * 0.01
        + signals.get("recruiter_response_rate", 0) * 10
        + signals.get("interview_completion_rate", 0) * 10
    )

    final_score = round(
        experience * 20
        + skill_score
        + signal_score,
        1
    )

    return final_score


# ==========================================================
# TOP100
# ==========================================================

@app.get("/top100")
def get_top100():

    results = []

    for candidate in candidates:

        profile = candidate.get("profile", {})

        results.append({
            "candidate_id":
                candidate["candidate_id"],

            "score":
                calculate_candidate_score(candidate),

            "name":
                profile.get(
                    "anonymized_name",
                    "Unknown"
                ),

            "title":
                profile.get(
                    "current_title",
                    "Unknown"
                )
        })

    results.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    return results[:100]


# ==========================================================
# RANKINGS
# ==========================================================

@app.get("/rankings")
def get_rankings():

    rankings = []

    for idx, candidate in enumerate(candidates):

        profile = candidate.get("profile", {})

        rankings.append({

            "rank": idx + 1,

            "candidate_id":
                candidate["candidate_id"],

            "name":
                profile.get(
                    "anonymized_name",
                    "Unknown"
                ),

            "title":
                profile.get(
                    "current_title",
                    "Unknown"
                ),

            "match_score":
                calculate_candidate_score(candidate),

            "experience":
                profile.get(
                    "years_of_experience",
                    0
                )
        })

    rankings.sort(
        key=lambda x: x["match_score"],
        reverse=True
    )

    for rank, row in enumerate(rankings):
        row["rank"] = rank + 1

    return rankings[:100]


# ==========================================================
# CANDIDATE DETAILS
# ==========================================================

@app.get("/candidate/{candidate_id}")
def get_candidate(candidate_id: str):

    for candidate in candidates:

        if candidate["candidate_id"] == candidate_id:
            return candidate

    return {
        "error": "Candidate not found"
    }


# ==========================================================
# JOB MATCHING
# ==========================================================

@app.post("/match-job")
def match_job(request: JobRequest):

    jd = request.job_description.lower()

    matched = []

    for candidate in candidates:

        profile = candidate.get("profile", {})
        signals = candidate.get("redrob_signals", {})

        score = 0

        experience = profile.get(
            "years_of_experience",
            0
        )

        score += experience * 5

        # Skill matching

        for skill in candidate.get("skills", []):

            skill_name = skill.get(
                "name",
                ""
            ).lower()

            if skill_name in jd:

                score += 20

                proficiency = skill.get(
                    "proficiency",
                    ""
                ).lower()

                if proficiency == "expert":
                    score += 10

                elif proficiency == "advanced":
                    score += 5

        # Behavioral signals

        score += (
            signals.get(
                "endorsements_received",
                0
            ) * 0.1
        )

        score += (
            signals.get(
                "connection_count",
                0
            ) * 0.01
        )

        score += (
            signals.get(
                "recruiter_response_rate",
                0
            ) * 10
        )

        score += (
            signals.get(
                "interview_completion_rate",
                0
            ) * 10
        )

        matched.append({

            "candidate_id":
                candidate["candidate_id"],

            "name":
                profile.get(
                    "anonymized_name",
                    "Unknown"
                ),

            "title":
                profile.get(
                    "current_title",
                    "Unknown"
                ),

            "match_score":
                round(score, 1),

            "experience":
                experience
        })

    matched.sort(
        key=lambda x: x["match_score"],
        reverse=True
    )

    final_results = []

    for rank, candidate in enumerate(
        matched[:100],
        start=1
    ):
        final_results.append({
            "rank": rank,
            **candidate
        })

    return final_results