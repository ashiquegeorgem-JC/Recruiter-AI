from loader import load_candidates

data = load_candidates("../dataset/candidates.jsonl")

candidate = data[0]

print("\nCAREER HISTORY:\n")
print(candidate["career_history"][0])

print("\nREDROB SIGNALS:\n")
print(candidate["redrob_signals"])