import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = Number(process.env.PORT || 8080);
const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'AI_BASE_URL', 'AI_API_KEY', 'AI_MODEL'];
for (const key of required) {
  if (!process.env[key]) console.warn(`Missing environment variable: ${key}`);
}
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: process.env.APP_ORIGIN === '*' ? true : (process.env.APP_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean),
  methods: ['GET', 'POST'],
  allowedHeaders: ['Authorization', 'Content-Type']
}));
app.use(express.json({ limit: '256kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }));

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !supabase) return res.status(401).json({ error: 'Sign in is required.' });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'Invalid or expired session.' });
  req.user = data.user;
  next();
}

app.get('/health', (_req, res) => res.json({ ok: true, service: 'forge-ai-server' }));

app.post('/v1/chat', authenticate, async (req, res) => {
  const { messages, personality } = req.body || {};
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 30) {
    return res.status(400).json({ error: 'Send between 1 and 30 chat messages.' });
  }
  const validMessages = messages.every(m =>
    m && ['user', 'assistant'].includes(m.role) &&
    typeof m.content === 'string' && m.content.length <= 12000
  );
  if (!validMessages) return res.status(400).json({ error: 'Invalid message format.' });

  const settings = personality && typeof personality === 'object' ? personality : {};
  const systemPrompt = [
    'You are Forge, a helpful AI assistant. Be clear, capable, and honest about limitations.',
    `Personality style: ${String(settings.personality || 'balanced').slice(0, 120)}`,
    `Humor preference: ${String(settings.humor || 'moderate').slice(0, 60)}`,
    `Response detail: ${String(settings.detail || 'balanced').slice(0, 60)}`,`Instruction-following preference: ${Math.max(0, Math.min(100, Number(settings.instructionFollowing ?? 80)))} out of 100. Follow valid user instructions carefully while respecting safety and system constraints.`,
    'Do not claim to have feelings or capabilities you do not have.'
  ].join('\n');

  try {
    const upstream = await fetch(`${process.env.AI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: Math.min(Number(process.env.MAX_OUTPUT_TOKENS || 800), 2000),
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(60_000)
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('AI provider returned status', upstream.status);
      return res.status(502).json({ error: 'The AI provider could not complete the request.' });
    }
    const reply = payload?.choices?.[0]?.message?.content;
    if (typeof reply !== 'string') return res.status(502).json({ error: 'Unexpected AI provider response.' });
    return res.json({ reply, model: process.env.AI_MODEL });
  } catch (e) {
    console.error('AI request failed:', e?.name || 'Error');
    return res.status(502).json({ error: 'AI service is temporarily unavailable.' });
  }
});

app.listen(port, '0.0.0.0', () => console.log(`Forge API listening on ${port}`));
