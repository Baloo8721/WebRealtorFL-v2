import json
import os
from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer, TextDataset, DataCollatorForLanguageModeling
import torch

# Suppress tokenizer parallelism warning
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Paths
dataset_path = "/Users/tylerbelisle/WebRealtorFL-v2/chatbot/data/real_estate_web3_small.json"
model_name = "microsoft/phi-2"
output_dir = "/Users/tylerbelisle/WebRealtorFL-v2/chatbot/model"

# Ensure output directory exists
os.makedirs(output_dir, exist_ok=True)

# 1. Load and preprocess dataset
try:
    with open(dataset_path, "r") as f:
        data = json.load(f)
except FileNotFoundError:
    print(f"Error: Dataset not found at {dataset_path}")
    exit(1)

# Convert Q&A pairs to prompt/response format and truncate
def make_prompt(pair, tokenizer, max_length=2048):
    prompt = f"User: {pair['user']}\nBot: {pair['bot']}"
    tokens = tokenizer(prompt, truncation=True, max_length=max_length, return_tensors="pt")
    return tokenizer.decode(tokens.input_ids[0], skip_special_tokens=True)

# Load tokenizer early for truncation
try:
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
except Exception as e:
    print(f"Error loading tokenizer: {e}")
    exit(1)

train_texts = [make_prompt(pair, tokenizer) for pair in data]

# Save as a text file for TextDataset
train_file = os.path.join(output_dir, "train.txt")
with open(train_file, "w") as f:
    for line in train_texts:
        f.write(line + "\n")

# 2. Load model
try:
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        trust_remote_code=True,
        device_map="mps" if torch.backends.mps.is_available() else "cpu"
    )
except Exception as e:
    print(f"Error loading model: {e}")
    exit(1)

# 3. Prepare dataset and data collator
try:
    train_dataset = TextDataset(
        tokenizer=tokenizer,
        file_path=train_file,
        block_size=512
    )
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer, mlm=False
    )
except Exception as e:
    print(f"Error preparing dataset: {e}")
    exit(1)

# 4. Set training arguments
training_args = TrainingArguments(
    output_dir=output_dir,
    overwrite_output_dir=True,
    num_train_epochs=3,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=2,
    learning_rate=2e-5,
    save_steps=500,
    save_total_limit=1,
    prediction_loss_only=True,
    logging_steps=50
)

# 5. Train
try:
    trainer = Trainer(
        model=model,
        args=training_args,
        data_collator=data_collator,
        train_dataset=train_dataset,
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
        input_ids = tokenizer(f"User: {prompt}\nBot:", return_tensors="pt").input_ids.to(model.device)
        output = model.generate(input_ids, max_length=80, do_sample=True, top_p=0.95)
        print(f"Prompt: {prompt}")
        print(f"Response: {tokenizer.decode(output[0], skip_special_tokens=True)}")
    except Exception as e:
        print(f"Error testing prompt '{prompt}': {e}")