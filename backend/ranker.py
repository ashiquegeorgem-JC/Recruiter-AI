from loader import load_candidates
from scorer import calculate_score

print("Loading candidates...")

data = load_candidates("../dataset/candidates.jsonl")

print("Scoring candidates...")

results = []

for candidate in data:

    score = calculate_score(candidate)

    results.append({
        "candidate_id": candidate["candidate_id"],
        "score": score
    })

results.sort(
    key=lambda x: x["score"],
    reverse=True
)

print("\nTOP 20\n")

for rank, candidate in enumerate(results[:20], start=1):
    print(rank, candidate)