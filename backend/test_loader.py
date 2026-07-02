from loader import load_candidates

data = load_candidates("../dataset/candidates.jsonl")

print("Total Candidates:", len(data))
print(data[0].keys())