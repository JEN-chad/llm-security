import modal

app = modal.App("llm-policy-flow-test")

image = (
    modal.Image.debian_slim()
    .pip_install(
        "torch",
        "transformers",
        "accelerate",
        "fastapi",
        "uvicorn"
    )
)

@app.function(
    image=image,
    gpu="A10G",
    timeout=900,
    keep_warm=1
)
@modal.asgi_app()
def fastapi_app():
    from fastapi import FastAPI
    from transformers import AutoTokenizer, AutoModelForCausalLM
    import torch
    import json

    api = FastAPI()

    # 🔥 Load model ONCE at container startup
    model_name = "mistralai/Mistral-7B-Instruct-v0.2"

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float16,
        device_map="auto"
    )

    @api.post("/")
    def classify(request: dict):
        user_message = request.get("message")

        if not user_message:
            return {"error": "No message provided"}

        system_prompt = """
You are a financial policy classification engine.
Return STRICT JSON only.

Required schema:
{
  "argument_quality": "strong | medium | weak",
  "emotional_manipulation": "low | medium | high",
  "rule_break_attempt": true | false,
  "confidence_band": "low | medium | high"
}
"""

        prompt = f"{system_prompt}\n\nUser: {user_message}\n\nJSON:"

        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

        output = model.generate(
            **inputs,
            max_new_tokens=150,
            temperature=0.0,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id
        )

        raw_output = tokenizer.decode(output[0], skip_special_tokens=True)

        start = raw_output.find("{")
        end = raw_output.rfind("}")

        if start == -1 or end == -1:
            return {"error": "Invalid model output", "raw": raw_output}

        json_str = raw_output[start:end+1]

        try:
            parsed = json.loads(json_str)
        except:
            return {"error": "Invalid JSON format", "raw": json_str}

        parsed.setdefault("argument_quality", "medium")
        parsed.setdefault("emotional_manipulation", "medium")
        parsed.setdefault("rule_break_attempt", False)
        parsed.setdefault("confidence_band", "medium")

        return parsed

    return api
