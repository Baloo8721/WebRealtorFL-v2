import json
import os
from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer, TextDataset, DataCollatorForLanguageModeling
import torch
from optimum.onnxruntime import ORTModelForCausalLM
import shutil

# Paths
dataset_path = "/Users/tylerbelisle/WebRealtorFL-v2/chatbot/data/real_estate_web3.json"
model_name = "Xenova/phi-2"
output_dir = "/Users/tylerbelisle/WebRealtorFL-v2/chatbot/model"
onnx_path = os.path.join(output_dir, "fine_tuned_phi2.onnx")

# Ensure output directory exists
os.makedirs(output_dir, exist_ok=True)

# 1. Load and preprocess dataset
try:
    with open(dataset_path, "r") as f:
        data = json.load(f)
except FileNotFoundError:
    print(f"Error: Dataset not found at {dataset_path}")
    exit(1)

# Convert Q&A pairs to prompt/response format
def make_prompt(pair):
    return f"User: {pair['user']}\nBot: {pair['bot']}"

train_texts = [make_prompt(pair) for pair in data]

# Save as a text file for TextDataset
train_file = os.path.join(output_dir, "train.txt")
with open(train_file, "w") as f:
    for line in train_texts:
        f.write(line + "\n")

# 2. Load tokenizer and model
try:
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name)
except Exception as e:
    print(f"Error loading model/tokenizer: {e}")
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
    per_device_train_batch_size=4,
    learning_rate=2e-5,
    save_steps=1000,
    save_total_limit=1,
    prediction_loss_only=True,
    logging_steps=100
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

# 6. Export to ONNX
try:
    onnx_model = ORTModelForCausalLM.from_pretrained(output_dir, export=True)
    onnx_model.save_pretrained(output_dir)
    shutil.move(os.path.join(output_dir, "model.onnx"), onnx_path)
    print(f"ONNX model exported to: {onnx_path}")
except Exception as e:
    print(f"Error exporting to ONNX: {e}")
    exit(1)

# 7. Test the model
inputs = [
    "How do I buy a house with crypto?",
    "What’s blockchain in real estate?",
    "Tell me a joke"
]
for prompt in inputs:
    try:
        input_ids = tokenizer(f"User: {prompt}\nBot:", return_tensors="pt").input_ids
        output = model.generate(input_ids, max_length=80, do_sample=True, top_p=0.95)
        print(f"Prompt: {prompt}")
        print(f"Response: {tokenizer.decode(output[0], skip_special_tokens=True)}")
    except Exception as e:
        print(f"Error testing prompt '{prompt}': {e}")