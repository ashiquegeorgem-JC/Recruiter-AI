from loader import load_candidates
from scorer import calculate_score

data = load_candidates("../dataset/candidates.jsonl")

results = []

for candidate in data:
    results.append(
        (
            calculate_score(candidate),
            candidate
        )
    )

results.sort(key=lambda x: x[0], reverse=True)

top_candidate = results[0][1]

print("Candidate ID:", top_candidate["candidate_id"])
print("\nPROFILE\n")
print(top_candidate["profile"])

print("\nTOP SKILLS\n")
print(top_candidate["skills"][:10])

print("\nCAREER HISTORY\n")
print(top_candidate["career_history"][0])

print("\nREDROB SIGNALS\n")
print(top_candidate["redrob_signals"])