const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5';

// Generic helper — sends a system prompt + user message, returns plain text.
// Every AI feature in this app (chatbot, invoice writing, predictions)
// goes through this one function, so if you ever swap providers
// (e.g. to OpenAI), this is the ONLY file you need to change.
async function askAI(systemPrompt, userMessage) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  });

  return response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');
}

// --- Feature 1: Chatbot assistant ---
// Answers questions about the business using live data passed in as context.
async function chatWithAssistant(userMessage, businessContext) {
  const systemPrompt = `You are a helpful business assistant for a shop's internal dashboard.
Use ONLY the business data provided below to answer. If the answer isn't in the data,
say you don't have that information rather than guessing.

BUSINESS DATA:
${JSON.stringify(businessContext, null, 2)}`;

  return askAI(systemPrompt, userMessage);
}

// --- Feature 2: AI invoice generation ---
// Given raw sale/line-item data, writes a clean, professional invoice summary.
async function generateInvoiceSummary(saleData) {
  const systemPrompt = `You write short, professional invoice summaries for a small business.
Given the sale details as JSON, write a 2-3 sentence summary suitable for the top of a receipt
(e.g. mention item count, standout items, and total). Do not repeat every line item verbatim.`;

  return askAI(systemPrompt, JSON.stringify(saleData));
}

// --- Feature 3: Sales prediction ---
// Given historical daily/weekly totals, asks the AI for a short trend-based forecast.
async function predictSales(historicalData) {
  const systemPrompt = `You are a sales forecasting assistant. Given historical sales totals
(as JSON, ordered oldest to newest), provide:
1. A predicted total for the next period (same granularity as the input)
2. A one-sentence explanation of the trend you see
Respond in JSON only, format: {"predictedTotal": number, "trend": "up"|"down"|"stable", "explanation": "..."}`;

  const raw = await askAI(systemPrompt, JSON.stringify(historicalData));
  try {
    return JSON.parse(raw);
  } catch {
    // If the model doesn't return clean JSON, fall back to raw text
    return { predictedTotal: null, trend: 'unknown', explanation: raw };
  }
}

// --- Feature 4: Voice command interpretation ---
// Converts a transcribed voice command into a structured action the backend can execute.
async function interpretVoiceCommand(transcript) {
  const systemPrompt = `You convert spoken commands from a shop dashboard into structured actions.
Respond in JSON ONLY, one of these shapes:
{"action": "add_customer", "name": "...", "phone": "..."}
{"action": "search_product", "query": "..."}
{"action": "show_analytics", "period": "today"|"week"|"month"}
{"action": "unknown", "reason": "..."}
If the command doesn't clearly match a known action, use "unknown".`;

  const raw = await askAI(systemPrompt, transcript);
  try {
    return JSON.parse(raw);
  } catch {
    return { action: 'unknown', reason: 'Could not parse AI response' };
  }
}

module.exports = {
  chatWithAssistant,
  generateInvoiceSummary,
  predictSales,
  interpretVoiceCommand
};
