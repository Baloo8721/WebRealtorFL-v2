let embedPipeline = null;
let convoPipeline = null;
let chatHistory = [];
let cachedEmbeddings = {};

const SYSTEM_PROMPT = `You’re Web3 Realty Bot, a Florida real estate and Web3 expert with a casual, confident vibe. You help with buying, selling, financing, FL laws (As Is contracts, 15-day inspections, 0.83% taxes), and Web3 (Propy, NFT deeds, DeFi loans). Always give crisp (~50-80 words), actionable answers with examples (e.g., ‘Propy’s $653k condo sold with Bitcoin’). For vague/off-topic queries, use humor and pivot to real estate/Web3.

Examples:
User: How to buy a house?
Bot: Buying a home? Get pre-approved, budget 28% income, drop 1-3% earnest money. FL’s As Is contract gives 15 days to inspect. Crypto via Propy’s an option! What’s your budget?

User: What’s blockchain?
Bot: Blockchain’s a secure ledger for deals—like Propy’s $653k Bitcoin condo sale. Cuts fraud, speeds closings. Wanna use it for a home buy?

User: Tell me a joke
Bot: Why’d the condo mint an NFT? To flex its title! 😎 Wanna talk homes or crypto?

Current conversation:
{{context}}
Bot:`;

const marketData = {
  fl_avg_home_price: 450000,
  miami_condo_price: 600000,
  btc_price: 60000,
  defi_loan_rate: 4.5
};

async function loadModels(attempt = 1, maxAttempts = 3) {
  try {
    if (!embedPipeline || !convoPipeline) {
      embedPipeline = await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      convoPipeline = await transformers.pipeline('text-generation', 'Xenova/phi-2');
      localStorage.setItem('modelsLoaded', 'true');
    }
    document.getElementById('loader').style.display = 'none';
    document.getElementById('welcomeMsg').style.display = 'block';
    await cacheKeywordEmbeddings();
  } catch (err) {
    console.error(`Model load attempt ${attempt} failed:`, err);
    if (attempt < maxAttempts) {
      console.log(`Retrying... (${attempt + 1}/${maxAttempts})`);
      setTimeout(() => loadModels(attempt + 1, maxAttempts), 3000);
    } else {
      console.log('Models failed, using keyword fallback.');
      document.getElementById('loader').style.display = 'none';
      document.getElementById('welcomeMsg').style.display = 'block';
    }
  }
}

async function cacheKeywordEmbeddings() {
  if (!embedPipeline) return;
  const priorityIntents = ['greeting', 'home_buying_process_steps', 'tokenized_real_estate_platforms', 'defi_mortgage_protocols'];
  const priorityKeywords = responseMap
    .filter(r => priorityIntents.includes(r.intent))
    .flatMap(r => r.keywords);
  for (const keyword of priorityKeywords) {
    if (!cachedEmbeddings[keyword]) {
      const embedding = await embedPipeline(keyword, { pooling: 'mean', normalize: true });
      cachedEmbeddings[keyword] = embedding.data;
    }
  }
}

loadModels();

// Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/chatbot/sw.js').catch(err => console.error('Service Worker registration failed:', err));
}

const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clear-btn');
const chatBody = document.getElementById('chatBody');
const chatContainer = document.querySelector('.chat-container');
const mortgageCalculator = document.getElementById('mortgageCalculator');

function handleSend(e) {
  e.preventDefault();
  sendMessage();
  chatInput.focus();
}

sendBtn.addEventListener('click', handleSend);

chatInput.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
    chatInput.focus();
  }
});

chatInput.addEventListener('focus', function () {
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    chatBody.scrollTop = chatBody.scrollHeight;
    chatInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 300);
});

chatInput.addEventListener('blur', function () {
  document.body.style.overflow = '';
  setTimeout(() => {
    chatBody.scrollTop = chatBody.scrollHeight;
  }, 200);
});

clearBtn.addEventListener('click', function () {
  chatBody.innerHTML = '<div class="message bot fade-in">New chat, fresh vibes! Homes, crypto, or something wild? What’s up?</div>';
  chatInput.value = '';
  chatHistory = [];
  chatBody.scrollTop = chatBody.scrollHeight;
  mortgageCalculator.style.display = 'none';
});

document.getElementById('close-btn').addEventListener('click', () => window.close());

document.getElementById('calculateMortgage').addEventListener('click', () => {
  const amount = parseFloat(document.getElementById('loanAmount').value);
  const rate = parseFloat(document.getElementById('interestRate').value) / 100 / 12;
  const term = parseInt(document.getElementById('loanTerm').value) * 12;
  if (isNaN(amount) || isNaN(rate) || isNaN(term)) {
    document.getElementById('monthlyPayment').textContent = 'Please enter valid numbers.';
    return;
  }
  const monthlyPayment = (amount * rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);
  document.getElementById('monthlyPayment').textContent = `Monthly Payment: $${monthlyPayment.toFixed(2)}`;
});

function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;
  if (message.length < 2) {
    const botMsg = document.createElement('div');
    botMsg.className = 'message bot fade-in';
    botMsg.textContent = 'Too short! Try “buy a house” or “what’s Web3?” to get going!';
    chatBody.appendChild(botMsg);
    chatInput.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;
    return;
  }

  const userMsg = document.createElement('div');
  userMsg.className = 'message user fade-in';
  userMsg.textContent = message;
  chatBody.appendChild(userMsg);

  chatInput.value = '';
  chatHistory.push({ role: 'user', content: message });
  if (chatHistory.length > 6) chatHistory.shift();

  if (message.toLowerCase().includes('calculate mortgage')) {
    mortgageCalculator.style.display = 'block';
    const botMsg = document.createElement('div');
    botMsg.className = 'message bot fade-in';
    botMsg.textContent = 'Check out the mortgage calculator below! Enter your loan details.';
    chatBody.appendChild(botMsg);
    chatBody.scrollTop = chatBody.scrollHeight;
    return;
  }

  getBotResponse(message);

  setTimeout(() => {
    chatBody.scrollTop = chatBody.scrollHeight;
    chatContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  return normA && normB ? dotProduct / (normA * normB) : 0;
}

function fuzzyMatch(input, target, isSensitive = false) {
  input = input.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  target = target.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const matrix = Array(target.length + 1).fill().map(() => Array(input.length + 1).fill(0));
  for (let i = 0; i <= input.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= target.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= target.length; j++) {
    for (let i = 1; i <= input.length; i++) {
      const cost = input[i - 1] === target[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,
        matrix[j][i - 1] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  const distance = matrix[target.length][input.length];
  const maxLen = Math.max(input.length, target.length);
  return 1 - distance / maxLen;
}

function normalizeInput(input) {
  const typos = {
    'blokchain': 'blockchain',
    'morgage': 'mortgage',
    'proppy': 'propy',
    'nft ded': 'nft deed',
    'bitcon': 'bitcoin',
    'ethreum': 'ethereum',
    'realestate': 'real estate',
    'closng': 'closing',
    'financng': 'financing',
    'hous': 'house',
    'buyin': 'buying',
    'seling': 'selling',
    'miammi': 'miami',
    'florda': 'florida',
    'contarct': 'contract',
    'appraisl': 'appraisal',
    'taxs': 'taxes',
    'stabelcoin': 'stablecoin',
    'defie': 'defi',
    'daao': 'dao',
    'tooken': 'token',
    'helo': 'hello',
    'hii': 'hi',
    'hlp': 'help'
  };
  let clean = input.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  return Object.entries(typos).reduce((str, [wrong, correct]) => 
    str.replace(new RegExp(`\\b${wrong}\\b`, 'g'), correct), clean);
}

function findClosestIntent(input, responseMap) {
  let bestMatch = null;
  let highestScore = 0;
  const cleanInput = normalizeInput(input);
  for (const response of responseMap) {
    const isSensitive = response.intent.includes('legal') || response.intent.includes('compliance');
    for (const keyword of response.keywords) {
      const score = fuzzyMatch(cleanInput, keyword, isSensitive);
      const threshold = isSensitive ? 0.75 : 0.5;
      if (score > highestScore && score > threshold) {
        highestScore = score;
        bestMatch = response;
      }
    }
  }
  return bestMatch;
}

const responseMap = [
  {
    intent: 'greeting',
    keywords: ['hello', 'hi', 'hey', 'yo', 'sup', 'howdy', 'hola', 'wassup', 'greetings'],
    reply: 'Yo! I’m Web3 Realty Bot, your pro for homes, crypto deals, and more. Wanna buy a house, dive into Web3, or just vibe? 🏡💸'
  },
  {
    intent: 'farewell',
    keywords: ['bye', 'goodbye', 'see you later', 'take care', 'ttyl', 'later'],
    reply: 'Catch you later! Ping me for real estate or crypto tips anytime.'
  },
  {
    intent: 'gratitude',
    keywords: ['thanks', 'thank you', 'appreciate it', 'thx'],
    reply: 'You got it! Happy to help—what’s next?'
  },
  {
    intent: 'user_needs_help',
    keywords: ['help', 'I need help', 'can you help', 'assist', 'support', 'please'],
    reply: 'I’m here! What’s up—buying, selling, or something Web3?'
  },
  {
    intent: 'small_talk',
    keywords: ['how are you', 'what’s up', 'how’s it going', 'cool', 'awesome', 'lol'],
    reply: 'Just vibing in the blockchain! What’s new with you?'
  },
  {
    intent: 'bot_capabilities',
    keywords: ['what can you do', 'who are you', 'your purpose', 'what do you know'],
    reply: 'I’m Web3 Realty Bot! I cover FL real estate, crypto deals, NFT deeds, DeFi loans. Ask me anything!'
  },
  {
    intent: 'user_confusion',
    keywords: ['confused', 'what do you mean', 'don’t understand', 'explain'],
    reply: 'No worries—let’s break it down. What’s tripping you up?'
  },
  {
    intent: 'property_valuation_request',
    keywords: ['how much is my house worth', 'property valuation', 'home value', 'appraisal'],
    reply: `Wanna know your home’s worth? Appraisals check comps—FL homes average $${marketData.fl_avg_home_price}. Blockchain appraisals via Chainlink are hot! Got a property in mind?`
  },
  {
    intent: 'home_buying_process_steps',
    keywords: ['how to buy a house', 'buy a home', 'buying home', 'purchase house'],
    reply: 'Buying a home? Get pre-approved, budget 28% income, drop 1-3% earnest money. FL’s As Is contract gives 15 days to inspect. Crypto via Propy’s an option! What’s your budget?'
  },
  {
    intent: 'home_selling_process_steps',
    keywords: ['how to sell a house', 'sell home', 'selling home', 'list house'],
    reply: 'Selling a home? Price with comps, stage it clean, list—Propy’s Web3 option slaps. FL homes staged right fetch 10% more. When you looking to sell?'
  },
  {
    intent: 'rental_agreement_terms',
    keywords: ['rental agreement', 'lease terms', 'rental contract', 'lease agreement'],
    reply: 'Rental agreements in FL? Typically 12 months, $1k-$3k rent, security deposit one month. Blockchain leases via Propy lock it tight! Got a rental in mind?'
  },
  {
    intent: 'market_trend_analysis',
    keywords: ['housing market', 'market trends', 'fl market', 'miami market'],
    reply: `FL’s 2025 market’s fire—prices around $${marketData.fl_avg_home_price}, Miami condos hit $${marketData.miami_condo_price}. Crypto deals spiking! Wanna buy or watch the vibe?`
  },
  {
    intent: 'mortgage_pre_approval_steps',
    keywords: ['pre-approval', 'mortgage preapproval', 'loan preapproval'],
    reply: 'Pre-approval’s your ticket! Lenders check credit, income—aim for 700+ FICO. Takes 1-3 days, crypto loans via Milo flex fast. Ready to lock one in?'
  },
  {
    intent: 'refinancing_options',
    keywords: ['refinance', 'refinancing', 'home refinance', 'defi mortgage'],
    reply: `Refinancing? Swap for lower rates—${marketData.defi_loan_rate}% now—or cash out equity. Blockchain platforms like Aave offer DeFi refi. Got a rate in mind?`
  },
  {
    intent: 'home_inspection_checklist',
    keywords: ['home inspection', 'inspection checklist', 'property inspection'],
    reply: 'Inspection’s clutch—FL’s As Is gives 15 days. Check roof, pipes, HVAC, mold. Blockchain-verified inspectors are rising! Wanna prep for one?'
  },
  {
    intent: 'closing_cost_breakdown',
    keywords: ['closing costs', 'closing fees', 'cost to close'],
    reply: 'Closing costs in FL? 2-5%—title, taxes, escrow. Crypto deals via Propy cut some fees. Need a full breakdown?'
  },
  {
    intent: 'property_tax_calculation',
    keywords: ['property taxes', 'fl property tax', 'home taxes'],
    reply: 'FL taxes rock—0.83% of value, so $2k-$5k/year on a $300k home. Got a property to calc?'
  },
  {
    intent: 'tokenized_real_estate_platforms',
    keywords: ['tokenize property', 'real estate tokens', 'tokenization', 'rwa'],
    reply: 'Tokenizing property? RealT lets you sell $100 slices, Propy handles full homes. A Miami condo went for $653k in Bitcoin! Wanna tokenize?'
  },
  {
    intent: 'defi_mortgage_protocols',
    keywords: ['defi mortgage', 'blockchain mortgage', 'crypto loan home'],
    reply: `DeFi mortgages? Aave and Milo offer ~${marketData.defi_loan_rate}% loans, no bank BS. A Tampa deal closed in days! Curious?`
  },
  {
    intent: 'nft_property_deed_verification',
    keywords: ['nft deed', 'nft title', 'verify nft deed'],
    reply: 'NFT deeds? Verify on Etherscan—Propy’s $653k condo deal was bulletproof. Got one to check?'
  },
  {
    intent: 'stablecoin_payments',
    keywords: ['stablecoin payment', 'usdc payment', 'usdt payment'],
    reply: `Stablecoin payments? Use USDC or USDT for homes—Propy supports ‘em. No volatility, fast deals! Wanna pay with $${marketData.btc_price} BTC instead?`
  },
  {
    intent: 'metaverse_property_investment',
    keywords: ['metaverse property', 'virtual real estate', 'decentraland'],
    reply: 'Metaverse property? Buy land in Decentraland or Sandbox—some plots hit $10k! Wanna dive into virtual investing?'
  },
  {
    intent: 'off_topic_joke',
    keywords: ['tell me a joke', 'joke', 'funny'],
    reply: 'Why’d the condo mint an NFT? To flex its title! 😎 Wanna talk homes or crypto next?'
  },
  {
    intent: 'off_topic_random',
    keywords: ['random', 'something else', 'anything'],
    reply: 'Feeling random? I’m down—homes, Web3, or go wild! What’s the vibe?'
  }
];

async function getBotResponse(message) {
  const typingMsg = document.createElement('div');
  typingMsg.className = 'message bot typing';
  typingMsg.textContent = 'Typing...';
  chatBody.appendChild(typingMsg);
  chatBody.scrollTop = chatBody.scrollHeight;

  let reply = 'Hmm, didn’t catch that—house hunt, crypto deal, or something wild?';
  let didYouMean = null;

  const normalized = normalizeInput(message);
  const lastTurns = chatHistory.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Bot'}: ${m.content}`).join('\n');
  const contextInput = lastTurns ? `${lastTurns}\nUser: ${normalized}` : `User: ${normalized}`;

  let modelFailed = false;
  if (convoPipeline) {
    try {
      const prompt = SYSTEM_PROMPT.replace('{{context}}', contextInput);
      const result = await convoPipeline(prompt, {
        max_new_tokens: 150,
        do_sample: true,
        temperature: 0.9,
        top_p: 0.9
      });
      let generated = result[0].generated_text;
      if (generated.includes('Bot:')) {
        generated = generated.split('Bot:').pop().trim();
      }
      reply = generated;
    } catch (err) {
      console.error('Text generation failed:', err);
      modelFailed = true;
    }
  }

  const fallbackPhrases = ['', 'not sure', 'i don’t know', 'cannot help'];
  const isFallback = modelFailed || fallbackPhrases.some(phrase => reply.toLowerCase().includes(phrase));
  if (isFallback) {
    const closest = findClosestIntent(contextInput, responseMap);
    if (closest && fuzzyMatch(normalized, closest.keywords.join(' ')) > 0.5) {
      reply = closest.reply;
      didYouMean = `<span class="suggestion">Did you mean "${closest.intent.replace(/_/g, ' ')}"?</span>`;
    } else if (embedPipeline) {
      try {
        const inputEmbedding = await embedPipeline(contextInput, { pooling: 'mean', normalize: true });
        let maxSimilarity = -1;
        let bestReply = reply;
        for (const response of responseMap) {
          for (const keyword of response.keywords) {
            if (cachedEmbeddings[keyword]) {
              const similarity = cosineSimilarity(inputEmbedding.data, cachedEmbeddings[keyword]);
              if (similarity > maxSimilarity && similarity > 0.35) {
                maxSimilarity = similarity;
                bestReply = response.reply;
              }
            }
          }
        }
        if (bestReply !== reply) {
          reply = bestReply;
        } else if (closest) {
          didYouMean = `<span class="suggestion">Did you mean "${closest.intent.replace(/_/g, ' ')}"?</span> ${closest.reply}`;
          reply = closest.reply;
        }
      } catch (err) {
        console.error('Embedding generation failed:', err);
      }
    }
  }

  if (isFallback && !didYouMean) {
    reply += '<div class="quick-replies">' +
      '<button onclick="sendQuickReply(\'buy a home\')">Buy a home</button>' +
      '<button onclick="sendQuickReply(\'crypto deals\')">Crypto deals</button>' +
      '<button onclick="sendQuickReply(\'market trends\')">Market trends</button>' +
      '</div>';
  }

  chatBody.removeChild(typingMsg);
  const botMsg = document.createElement('div');
  botMsg.className = 'message bot fade-in';
  botMsg.innerHTML = didYouMean ? `${didYouMean} ${reply}` : reply;
  chatBody.appendChild(botMsg);
  chatHistory.push({ role: 'bot', content: reply });
  if (chatHistory.length > 6) chatHistory.shift();
  chatBody.scrollTop = chatBody.scrollHeight;
}

function sendQuickReply(text) {
  chatInput.value = text;
  sendMessage();
}