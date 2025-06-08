import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { transform } from '@swc/wasm-web';
import { Content } from '@/app/type/AIContent';
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    const body = await req.json();
    const userPrompt = body.prompt || '';
    const fullPrompt = `
You are a strict code fixer. Respond ONLY with a valid JSON object containing the FIXED code.

Format:
{
  "FileName.ext": {
    "code": "fixed file content with all newlines (\\n) and double quotes (\\") properly escaped"
  }
}

ORIGINAL CODE TO FIX:
${userPrompt}

Your task: Fix any issues in the provided code and improve it.

CRITICAL Requirements:
- Fix syntax errors, logic bugs, and runtime issues
- Improve code quality and best practices
- Use React with functional components and hooks
- React and ReactDOM are loaded via CDN - they are GLOBAL variables
- DO NOT use any import statements
- Use React.useState, React.useEffect, etc. for hooks (React is global)
- Use Tailwind CSS classes for styling
- Ensure proper JSX syntax and formatting

Common fixes to apply:
- Fix undefined variables or functions
- Correct event handler syntax
- Fix state management issues
- Improve component structure
- Add missing dependencies to useEffect
- Fix className syntax
- Ensure proper React patterns

File Structure (maintain existing structure):
- index.html: Complete HTML page with React CDN links and Tailwind CDN (NO RENDER SCRIPT)
- App.jsx: Main React component using modern JSX syntax (NO IMPORTS)
- Additional components as needed

WRONG patterns to fix:
- import React from 'react' → Remove imports
- <script src="App.jsx"></script> → Remove from HTML
- <script>const root = ReactDOM.createRoot...</script> → Remove render scripts
- Incorrect event handlers → Fix onClick, onChange, etc.
- Missing state initialization → Add proper useState
- Broken component syntax → Fix JSX structure

Focus on:
- Fixing actual bugs and errors
- Improving code readability
- Ensuring browser compatibility
- Maintaining modern React patterns
- Keeping responsive Tailwind design

Respond ONLY with the JSON object containing the fixed code.
`;


    try {
        const completion = await openai.chat.completions.create({
            model: 'o3-mini',
            messages: [
                {
                    role: 'user',
                    content: fullPrompt,
                },
            ],
            // temperature: 0.7,
        });

        const content = completion.choices[0]?.message?.content || '';
        let cleanContent = content.trim()
        if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        let parsedContent: Content;
        try {
            parsedContent = JSON.parse(cleanContent) as Content;
            console.log(parsedContent)
        } catch (err) {
            console.error('❌ Invalid JSON from OpenAI:', err);
            return NextResponse.json({ error: 'AI output is not valid JSON' }, { status: 500 });
        }

        return NextResponse.json({ parsedContent });
    } catch (error: any) {
        console.error('OpenAI API Error:', error);
        return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 });
    }
}
