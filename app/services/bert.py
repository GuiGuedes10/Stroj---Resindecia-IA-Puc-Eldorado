import torch
import numpy as np


def chunk_text_by_tokens(text, tokenizer, max_tokens=128, overlap=20):
    tokens = tokenizer.encode(text, add_special_tokens=False)

    if len(tokens) <= max_tokens:
        return [text]

    chunks = []
    stride = max_tokens - overlap
    for i in range(0, len(tokens), stride):
        chunk_tokens = tokens[i : i + max_tokens]
        chunk_text = tokenizer.decode(chunk_tokens, skip_special_tokens=True)
        chunks.append(chunk_text)

    return chunks


def extract_bert_embeddings_with_chunks(
    text_list, bert_model, tokenizer, max_length=512, batch_size=32
):
    device = next(bert_model.parameters()).device

    bert_model.eval()
    document_embeddings = []

    with torch.no_grad():
        for text in text_list:
            text_chunks = chunk_text_by_tokens(
                text, tokenizer, max_tokens=max_length - 2, overlap=20
            )

            chunk_vectors = []
            for i in range(0, len(text_chunks), batch_size):
                batch_chunks = text_chunks[i : i + batch_size]
                inputs = tokenizer(
                    batch_chunks,
                    padding=True,
                    truncation=True,
                    max_length=max_length,
                    return_tensors="pt",
                ).to(device)

                outputs = bert_model(**inputs)
                cls_embeddings = (
                    outputs.last_hidden_state[:, 0, :].cpu().numpy()
                )
                chunk_vectors.append(cls_embeddings)

            all_chunks_matrix = np.vstack(chunk_vectors)
            doc_vector = np.mean(all_chunks_matrix, axis=0)
            document_embeddings.append(doc_vector)

    return np.array(document_embeddings)