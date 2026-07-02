from loader import load_candidates
from scorer import calculate_score

data = load_candidates("../dataset/candidates.jsonl")

candidate = data[0]

score = calculate_score(candidate)

print(candidate["candidate_id"])
print("Score:", score)