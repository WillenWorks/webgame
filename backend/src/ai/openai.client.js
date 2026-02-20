import OpenAI from 'openai';
import env from '../config/env.js';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: Number(env.OPENAI_TIMEOUT || 10000),
});

export async function callOpenAI({ system, user, options = {} }) {
  const messages = [];
  if (typeof system === 'string' && system.trim().length > 0) {
    messages.push({ role: 'system', content: system });
  }
  if (typeof user === 'string' && user.trim().length > 0) {
    messages.push({ role: 'user', content: user });
  }
  if (messages.length === 0) {
    throw new Error('callOpenAI: system e user estão ausentes ou inválidos');
  }

  // Retries simples para robustez contra respostas vazias/transientes
  const maxRetries = 2;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: env.OPENAI_MODEL || 'gpt-4.1-mini',
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 350,
        response_format: options.json ? { type: "json_object" } : undefined
      });

      const text = completion?.choices?.[0]?.message?.content;
      if (text && text.trim().length >= 3) {
        return text.trim();
      }
      lastError = new Error('OpenAI retornou resposta vazia');
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Falha ao obter resposta da IA');
}
