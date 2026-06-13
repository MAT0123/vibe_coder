import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { db } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/authMiddleware';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
  }
  if (user.tokenBalance <= 0) {
    return NextResponse.json({ error: 'Insufficient tokens. Please purchase more tokens.' }, { status: 402 });
  }

  try {
    const body = await req.json();
    // `prompt`  = raw user request text
    // `files`   = current project files as Record<filename, code string>
    // `model`   = selected AI model
    const userPrompt: string = body.prompt || '';
    const currentFiles: Record<string, string> = body.files || {};
    const selectedModel: string = body.model || 'o3-mini';

    const allowedModels = ['o3-mini', 'o1', 'gpt-4o', 'gpt-4o-mini'];
    const modelToUse = allowedModels.includes(selectedModel) ? selectedModel : 'o3-mini';

    // Build a code block for every existing file so the AI has full context
    const filesContext = Object.entries(currentFiles)
      .map(([name, code]) => {
        const lang = name.endsWith('.html') ? 'html' : name.endsWith('.css') ? 'css' : 'jsx';
        return `### ${name}\n\`\`\`${lang}\n${code}\n\`\`\``;
      })
      .join('\n\n');

    const hasExistingFiles = Object.keys(currentFiles).length > 0;

    const systemPrompt = `You are an expert React/JSX developer working inside a browser-based live preview sandbox.

## Output format
Respond ONLY with a single valid JSON object.
Format:
{
  "FileName.ext": {
    "code": "string representation of the complete file content"
  }
}

## Environment rules (CRITICAL)
- React 18 and ReactDOM 18 are loaded as UMD globals — NEVER use import statements
- Use React.useState, React.useEffect, React.useRef, etc.
- JSX is compiled by SWC to ES5 — use only ES5-compatible JS (var/let/const, no optional chaining ?., no nullish coalescing ??, no class fields)
- Tailwind CSS is available via CDN — use Tailwind classes for all styling
- index.html must NOT contain a render script (injected automatically) and must NOT include a <script src="App.jsx">
- App.jsx must NOT contain any import statements

## Your task
${hasExistingFiles
  ? `Apply the user's requested change to the existing project files below. Return ALL files (modified and unmodified).

${filesContext}

User's change request: ${userPrompt}`
  : `Create a new project from scratch based on: ${userPrompt}`
}`;

    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [{ role: 'user', content: systemPrompt }],
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '';

    // Strip markdown fences if present
    let clean = raw.trim();
    if (clean.startsWith('```json')) clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    else if (clean.startsWith('```')) clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');

    // Slice to the outermost {} in case there's preamble text
    const first = clean.indexOf('{');
    const last = clean.lastIndexOf('}');
    if (first !== -1 && last !== -1) clean = clean.substring(first, last + 1);

    let parsedContent: Record<string, { code: string }>;
    try {
      parsedContent = JSON.parse(clean);
    } catch (err) {
      console.error('Invalid JSON from AI:', err, '\nRaw:', raw);
      return NextResponse.json({ error: 'AI output is not valid JSON. Please try again.' }, { status: 550 });
    }

    const tokensUsed = completion.usage?.total_tokens as number * 1.10 || 1000;
    const updatedUser = db.updateUserBalance(user.id, -tokensUsed);
    const balance = updatedUser ? updatedUser.tokenBalance : user.tokenBalance - tokensUsed;

    return NextResponse.json({ parsedContent, tokenBalance: balance, tokensUsed });
  } catch (error: any) {
    console.error('fix-code API error:', error);
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
}
