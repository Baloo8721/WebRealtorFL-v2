import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

# Paths
model_path = "/Users/tylerbelisle/WebRealtorFL-v2/chatbot/model"

# Load model and tokenizer
try:
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForCausalLM.from_pretrained(model_path, use_safetensors=True, torch_dtype=torch.bfloat16, device_map="cpu")
except Exception as e:
    print(f"Error loading model: {e}")
    exit(1)

# Test prompts
prompts = [
    "Hello",
    "How do I buy a house with crypto?",
    "What’s an As Is contract?",
    "Find a Spanish agent",
    "What’s title insurance?",
    "What’s tokenization?"
]

# Generate responses
for prompt in prompts:
    try:
        inputs = tokenizer(f"User: {prompt}\nBot:", return_tensors="pt").input_ids.to("cpu")
        outputs = model.generate(inputs, max_length=80, do_sample=True, top_p=0.95)
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        print(f"Prompt: {prompt}")
        print(f"Response: {response}\n")
    except Exception as e:
        print(f"Error for prompt '{prompt}': {e}")