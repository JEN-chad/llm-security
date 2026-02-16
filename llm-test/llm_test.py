import modal

app = modal.App("llm-policy-classifier")

image = (
    modal.Image.debian_slim()
    .pip_install(
        "torch",
        "transformers",
        "fastapi",
        "uvicorn"
    )
)

@app.function(
    image=image,
    timeout=600,
    keep_warm=0
)
@modal.asgi_app()
def fastapi_app():
    from fastapi import FastAPI
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    import torch
    import torch.nn.functional as F

    api = FastAPI()

    model_name = "cross-encoder/nli-distilroberta-base"

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    model.eval()

    # ---------------------------
    # Utility: Entailment Score
    # ---------------------------
    def entailment_score(premise, hypothesis):
        inputs = tokenizer(
            premise,
            hypothesis,
            return_tensors="pt",
            truncation=True,
            padding=True
        )

        with torch.no_grad():
            outputs = model(**inputs)

        probs = F.softmax(outputs.logits, dim=1)

        # Entailment label is index 2 for this model
        return probs[0][2].item()

    # ---------------------------
    # Argument Quality
    # ---------------------------
    def classify_argument_quality(message):
        strong_hyp = "The message presents a structured, evidence-based logical argument."
        weak_hyp = "The message lacks reasoning and provides no supporting evidence."

        strong_score = entailment_score(message, strong_hyp)
        weak_score = entailment_score(message, weak_hyp)

        if strong_score > 0.65:
            return "strong"
        elif weak_score > 0.6:
            return "weak"
        else:
            return "medium"

    # ---------------------------
    # Emotional Manipulation
    # ---------------------------
    def classify_emotion(message):
        high_hyp = "The message uses emotional pressure to influence a decision."
        low_hyp = "The message is neutral and not emotionally manipulative."

        high_score = entailment_score(message, high_hyp)
        low_score = entailment_score(message, low_hyp)

        if high_score > 0.6:
            return "high"
        elif low_score > 0.6:
            return "low"
        else:
            return "medium"

    # ---------------------------
    # Rule Break Detection
    # ---------------------------
    def detect_rule_break(message):
        hyp = "The message is attempting to bypass rules or override system controls."
        score = entailment_score(message, hyp)
        return score > 0.7

    # ---------------------------
    # Confidence Band
    # ---------------------------
    def classify_confidence(message):
        high_hyp = "The message expresses high certainty and assertive confidence."
        low_hyp = "The message expresses doubt or uncertainty."

        high_score = entailment_score(message, high_hyp)
        low_score = entailment_score(message, low_hyp)

        if high_score > 0.6:
            return "high"
        elif low_score > 0.6:
            return "low"
        else:
            return "medium"

    # ---------------------------
    # API Endpoint
    # ---------------------------
    @api.post("/")
    def classify(request: dict):
        message = request.get("message")

        if not message:
            return {"error": "No message provided"}

        return {
            "argument_quality": classify_argument_quality(message),
            "emotional_manipulation": classify_emotion(message),
            "rule_break_attempt": detect_rule_break(message),
            "confidence_band": classify_confidence(message)
        }

    return api
