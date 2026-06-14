import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { db } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/authMiddleware';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const GENERATION_SYSTEM_PROMPT = `You are a strict code generator. Respond ONLY with a valid JSON object.

Format:
{
  "FileName.ext": {
    "code": "string representation of the complete file content"
  }
}

CRITICAL Requirements:
- Use React with functional components and hooks
- Write MODERN JSX syntax with proper formatting
- React and ReactDOM are loaded via CDN - they are GLOBAL variables
- DO NOT use any import statements
- Use React.useState, React.useEffect, etc. for hooks (React is global)
- Use Tailwind CSS classes for styling
- Write clean, readable JSX with proper indentation

File Structure:
- index.html: Complete HTML page with React CDN links and Tailwind CDN (NO RENDER SCRIPT)
- App.jsx: Main React component using modern JSX syntax (NO IMPORTS)

CORRECT App.jsx example:
function App() {
  const [count, setCount] = React.useState(0);
  
  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Counter App</h1>
      <div className="flex gap-2">
        <button 
          onClick={() => setCount(count - 1)}
          className="px-4 py-2 bg-red-505 text-white rounded"
        >
          -
        </button>
        <span className="px-4 py-2 border">{count}</span>
        <button 
          onClick={() => setCount(count + 1)}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          +
        </button>
      </div>
    </div>
  );
}

CORRECT index.html (NO render script - added automatically):
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
</body>
</html>

WRONG (do NOT include):
- import React from 'react'
- <script src="App.jsx"></script>
- <script>const root = ReactDOM.createRoot...</script>

Focus on:
- Clean JSX syntax with proper formatting
- Responsive Tailwind classes
- Semantic HTML structure
- Proper event handlers
- Clear component logic

Respond ONLY with the JSON object.`;

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
  }

  if (user.tokenBalance <= 0) {
    return NextResponse.json({ error: "Insufficient tokens. Please purchase more tokens." }, { status: 402 });
  }

  try {
    const body = await req.json();
    const userPrompt = body.prompt || '';
    const selectedModel = body.model || 'o3-mini';

    const allowedModels = [
      'o3-mini', 'o1', 'gpt-4o', 'gpt-4o-mini',
      'gpt-5', 'gpt-5-pro', 'gpt-5.5', 'gpt-5.5-pro'
    ];
    const modelToUse = allowedModels.includes(selectedModel) ? selectedModel : 'o3-mini';

    const fullPrompt = `${GENERATION_SYSTEM_PROMPT}\n\nUser Request: ${userPrompt}`;

    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '';
    
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const firstBrace = cleanContent.indexOf('{');
    const lastBrace = cleanContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(cleanContent);
    } catch (err) {
      console.error('❌ Invalid JSON from OpenAI:', err, 'Raw content:', content);
      return NextResponse.json({ error: 'AI output is not valid JSON' }, { status: 550 });
    }

    const tokensUsed = Math.round((completion.usage?.total_tokens || 1000) * 1.50);
    
    // Update balance via custom JSON database
    const updatedUser = await db.updateUserBalance(user.id, -tokensUsed);
    const balance = updatedUser ? updatedUser.tokenBalance : user.tokenBalance - tokensUsed;

    return NextResponse.json({ 
      parsedContent, 
      tokenBalance: balance, 
      tokensUsed 
    });
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
}
