# SupportSearch migration specimen

This small, purpose-built CUDA embedding worker is the input to the live accelerator preparation demo. It has not been run on a GPU. It uses an existing pretrained model; no model training or real search index is bundled.

Prepare candidate/encoder.py, candidate/runtime.json and candidate/migration.md for a TorchTPU hardware trial. Keep MODEL_ID, MAX_LENGTH, mean_pool and normalize_vectors unchanged. Keep the encode(texts) public function and the API fields unchanged. Set DEVICE to tpu, import torch_tpu to register its backend, and use the requested BATCH_SIZE in the batching loop. Preserve float32 precision. Document the unsupported/unverified operator, shape, tokenizer, model-version and hardware assumptions. Do not claim deployment or measured parity.

Official references, checked October 25, 2026:
- https://github.com/google-pytorch/torch_tpu
- https://huggingface.co/docs/transformers/main/google_tpu

TorchTPU registers the tpu device. Static input shapes help avoid recompilation. Partial batches, operator coverage and this particular model still require validation on real TPU hardware. Do not install model weights or provision cloud resources for this task. You may use Python AST and standard-library checks remotely. Independent local checks inspect source structure only and do not execute your code.
