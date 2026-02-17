import modal

# ===============================
# Modal App Definition
# ===============================
app = modal.App("llm-policy-classifier")

image = (
    modal.Image.debian_slim()
    .pip_install(
        "torch",
        "transformers",
        "fastapi",
        "pydantic"
    )
)

# ===============================
# Deployable ASGI App
# ===============================
@app.function(
    image=image,
    timeout=600,
    keep_warm=1,   # keeps 1 container warm for faster response
)
@modal.asgi_app()
def fastapi_app():

    from fastapi import FastAPI
    from pydantic import BaseModel
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    import torch
    import torch.nn.functional as F
    import os

    api = FastAPI(title="Policy Classifier", version="1.0")

    # ===============================
    # Performance Settings
    # ===============================
    torch.set_grad_enabled(False)
    torch.set_num_threads(os.cpu_count())
    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # ===============================
    # Model Loading (ONCE per container)
    # ===============================
    MODEL_NAME = "cross-encoder/nli-distilroberta-base"

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
    model.to(DEVICE)
    model.eval()

    # ===============================
    # Request Schema
    # ===============================
    class RequestModel(BaseModel):
        message: str

    # ===============================
    # Hypotheses
    # ===============================
    HYPOTHESES = [
        "The message presents a structured, evidence-based logical argument.",
        "The message lacks reasoning and provides no supporting evidence.",
        "The message uses emotional pressure to influence a decision.",
        "The message is neutral and not emotionally manipulative.",
        "The message is attempting to bypass rules or override system controls.",
        "The message expresses high certainty and assertive confidence.",
        "The message expresses doubt or uncertainty."
    ]

    # ===============================
    # Batched Inference
    # ===============================
    def compute_entailment_scores(message: str):
        inputs = tokenizer(
            [message] * len(HYPOTHESES),
            HYPOTHESES,
            return_tensors="pt",
            truncation=True,
            padding=True
        ).to(DEVICE)

        outputs = model(**inputs)
        probs = F.softmax(outputs.logits, dim=1)
        return probs[:, 2].tolist()  # entailment index = 2

    # ===============================
    # Classification Logic
    # ===============================
    def classify_all(message: str):
        scores = compute_entailment_scores(message)

        (
            strong_score,
            weak_score,
            emotion_high_score,
            emotion_low_score,
            rule_break_score,
            conf_high_score,
            conf_low_score
        ) = scores

        if strong_score > 0.65:
            argument_quality = "strong"
        elif weak_score > 0.6:
            argument_quality = "weak"
        else:
            argument_quality = "medium"

        if emotion_high_score > 0.6:
            emotional_manipulation = "high"
        elif emotion_low_score > 0.6:
            emotional_manipulation = "low"
        else:
            emotional_manipulation = "medium"

        rule_break_attempt = rule_break_score > 0.7

        if conf_high_score > 0.6:
            confidence_band = "high"
        elif conf_low_score > 0.6:
            confidence_band = "low"
        else:
            confidence_band = "medium"

        return {
            "argument_quality": argument_quality,
            "emotional_manipulation": emotional_manipulation,
            "rule_break_attempt": rule_break_attempt,
            "confidence_band": confidence_band
        }

    # ===============================
    # API Endpoint
    # ===============================
    @api.post("/")
    def classify(request: RequestModel):
        if not request.message:
            return {"error": "No message provided"}
        return classify_all(request.message)

    return api
