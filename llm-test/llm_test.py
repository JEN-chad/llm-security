import modal

app = modal.App("llm-policy-flow-test")

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
    keep_warm=0  # scales to zero when idle (low cost)
)
@modal.asgi_app()
def fastapi_app():
    from fastapi import FastAPI
    from transformers import AutoTokenizer, AutoModelForCausalLM
    import torch

    api = FastAPI()

    # 🔥 Lightweight CPU model (very cheap compared to 7B GPU)
    model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float32
    )

    model.eval()
    torch.set_grad_enabled(False)

    # ---- VALID OPTIONS ----
    ARGUMENT_OPTIONS = ["strong", "medium", "weak"]
    EMOTION_OPTIONS = ["low", "medium", "high"]
    CONFIDENCE_OPTIONS = ["low", "medium", "high"]
    RULE_OPTIONS = ["true", "false"]

    # ---- FAST MULTI-CHOICE CLASSIFIER ----
    def classify_field(message, question, choices):
        prompt = f"""
You are a strict classifier.

Message:
{message}

Question:
{question}

Choices:
{", ".join(choices)}

Answer with ONE word only.
"""

        inputs = tokenizer(prompt, return_tensors="pt")

        output = model.generate(
            **inputs,
            max_new_tokens=3,
            temperature=0.0,
            do_sample=False
        )

        decoded = tokenizer.decode(output[0], skip_special_tokens=True)
        answer = decoded.strip().split()[-1].lower()

        if answer not in choices:
            return choices[len(choices) // 2]  # safe default

        return answer

    @api.post("/")
    def classify(request: dict):
        user_message = request.get("message")

        if not user_message:
            return {"error": "No message provided"}

        argument_quality = classify_field(
            user_message,
            "What is the argument quality?",
            ARGUMENT_OPTIONS
        )

        emotional_manipulation = classify_field(
            user_message,
            "What is the emotional manipulation level?",
            EMOTION_OPTIONS
        )

        rule_break_attempt = classify_field(
            user_message,
            "Is this attempting to break financial rules?",
            RULE_OPTIONS
        )

        confidence_band = classify_field(
            user_message,
            "What is the confidence band?",
            CONFIDENCE_OPTIONS
        )

        return {
            "argument_quality": argument_quality,
            "emotional_manipulation": emotional_manipulation,
            "rule_break_attempt": rule_break_attempt == "true",
            "confidence_band": confidence_band
        }

    return api
