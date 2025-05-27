import json
import os
from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer, DataCollatorForLanguageModeling
from datasets import Dataset
import torch
from accelerate import Accelerator

# Suppress tokenizer parallelism warning
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Paths
dataset_path = "/Users/tylerbelisle/WebRealtorFL-v2/chatbot/data/real_estate_web3_small.json"
model_name = "HuggingFaceTB/SmolLM2-360M-Instruct"
output_dir = "/Users/tylerbelisle/WebRealtorFL-v2/chatbot/model"

# Ensure output directory exists
os.makedirs(output_dir, exist_ok=True)

# Initialize Accelerator
accelerator = Accelerator()

# 1. Load and preprocess dataset
try:
    with open(dataset_path, "r") as f:
        data = json.load(f)
    if not data:
        print(f"Error: Dataset at {dataset_path} is empty")
        exit(1)
except FileNotFoundError:
    print(f"Error: Dataset not found at {dataset_path}")
    exit(1)
except json.JSONDecodeError:
    print(f"Error: Invalid JSON format in {dataset_path}")
    exit(1)

# Convert Q&A pairs to prompt/response format
def make_prompt(pair, tokenizer, max_length=512):
    prompt = f"User: {pair['user']}\nBot: {pair['bot']}"
    tokens = tokenizer(prompt, truncation=True, max_length=max_length, return_tensors="pt")
    return tokenizer.decode(tokens.input_ids[0], skip_special_tokens=True)

# Load tokenizer
try:
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
except Exception as e:
    print(f"Error loading tokenizer: {e}")
    exit(1)

# Create prompts and validate
train_texts = [make_prompt(pair, tokenizer) for pair in data]
if not train_texts:
    print("Error: No valid prompts generated from dataset")
    exit(1)

# Save to text file for debugging
train_file = os.path.join(output_dir, "train.txt")
with open(train_file, "w") as f:
    for line in train_texts:
        f.write(line + "\n")
print(f"Saved {len(train_texts)} prompts to {train_file}")

# Create dataset using Datasets library
def tokenize_function(examples):
    return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=256)

try:
    dataset = Dataset.from_dict({"text": train_texts})
    tokenized_dataset = dataset.map(tokenize_function, batched=True, remove_columns=["text"])
    print(f"Dataset size: {len(tokenized_dataset)} samples")
    if len(tokenized_dataset) == 0:
        print("Error: Tokenized dataset is empty")
        exit(1)
except Exception as e:
    print(f"Error preparing dataset: {e}")
    exit(1)

# 2. Load model
try:
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        trust_remote_code=True,
        torch_dtype=torch.bfloat16,
        low_cpu_mem_usage=True
    )
    model.to(torch.device("cpu"))
except Exception as e:
    print(f"Error loading model: {e}")
    exit(1)

# Prepare model with Accelerator
model = accelerator.prepare(model)

# 3. Data collator
data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

# 4. Set training arguments
training_args = TrainingArguments(
    output_dir=output_dir,
    overwrite_output_dir=True,
    num_train_epochs=3,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    learning_rate=2e-5,
    save_steps=500,
    save_total_limit=1,
    prediction_loss_only=True,
    logging_steps=50,
    use_cpu=True,  # Replace no_cuda
)

# 5. Train
try:
    trainer = Trainer(
        model=model,
        args=training_args,
        data_collator=data_collator,
        train_dataset=tokenized_dataset,
    )
    trainer.train()
except Exception as e:
    print(f"Error during training: {e}")
    exit(1)

# 6. Save the model
try:
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    print(f"Model saved to: {output_dir}")
except Exception as e:
    print(f"Error saving model: {e}")
    exit(1)

# 7. Test the model
inputs = [
    "How do I buy a house with crypto?",
    "What’s an As Is contract?",
    "Tell me a joke"
]
for prompt in inputs:
    try:
        input_ids = tokenizer(f"User: {prompt}\nBot:", return_tensors="pt").input_ids.to(accelerator.device)
        output = model.generate(input_ids, max_length=80, do_sample=True, top_p=0.95)
        print(f"Prompt: {prompt}")
        print(f"Response: {tokenizer.decode(output[0], skip_special_tokens=True)}")
    except Exception as e:
        print(f"Error testing prompt '{prompt}': {e}")