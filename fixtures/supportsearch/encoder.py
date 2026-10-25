"""SupportSearch reference CUDA worker. Hardware execution is not part of the local demo."""
import torch
import torch.nn.functional as F
from transformers import AutoModel, AutoTokenizer

MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
DEVICE = "cuda"
BATCH_SIZE = 8
MAX_LENGTH = 256

def mean_pool(hidden, attention_mask):
    mask = attention_mask.unsqueeze(-1).expand(hidden.size()).float()
    return (hidden * mask).sum(1) / mask.sum(1).clamp(min=1e-9)

def normalize_vectors(vectors):
    return F.normalize(vectors, p=2, dim=1)

def encode(texts):
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    model = AutoModel.from_pretrained(MODEL_ID).to(DEVICE).eval()
    outputs = []
    with torch.inference_mode():
        for start in range(0, len(texts), BATCH_SIZE):
            batch = texts[start:start + BATCH_SIZE]
            tokens = tokenizer(batch, padding="max_length", truncation=True,
                               max_length=MAX_LENGTH, return_tensors="pt")
            tokens = {key: value.to(DEVICE) for key, value in tokens.items()}
            hidden = model(**tokens).last_hidden_state
            outputs.append(normalize_vectors(mean_pool(hidden, tokens["attention_mask"])).cpu())
    return torch.cat(outputs).tolist() if outputs else []
