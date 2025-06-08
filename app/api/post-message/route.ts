import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { transform } from '@swc/wasm-web';
import { Content } from '@/app/type/AIContent';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
function extractJSON(content: string): string {
  content = content.trim()
  const isJson = content.startsWith('[') && content.endsWith("]")
  if (isJson) { return content }
  const startIndex = content.indexOf("[")
  const endIndex = content.indexOf("]")

  return content.slice(startIndex, endIndex)
}
export async function POST(req: Request) {
  const body = await req.json();
  const userPrompt = body.prompt || '';
  const fullPrompt = `
You are a strict code generator. Respond ONLY with a valid JSON object.

Format:
{
  "FileName.ext": {
    "code": "file content with all newlines (\\n) and double quotes (\\") properly escaped"
  }
}

User Request: ${userPrompt}

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
          className="px-4 py-2 bg-red-500 text-white rounded"
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

Respond ONLY with the JSON object.
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
    } catch (err) {
      console.error('❌ Invalid JSON from OpenAI:', err);
      return NextResponse.json({ error: 'AI output is not valid JSON' }, { status: 500 });
    }

    // for (const content of parsedContent) {
    //   console.log(content)
    // }
    // const res = await fetch("https://u64nq44v89.execute-api.us-east-2.amazonaws.com/prod/code", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify(parsedContent)
    // })
    // const result = await res.json(); // ✅ Read once
    // const { url, keys, bucket }: { url: string, keys: string[], bucket: string } = result
    // const s3 = new S3Client({})
    // console.log(result)
    // let file: Record<string, string> = {}
    // for (const key of keys) {
    //   // const command = new GetObjectCommand({
    //   //   Bucket: bucket,
    //   //   Key: key
    //   // })
    //   // const commandRes = await s3.send(command)
    //   // const content = await commandRes.Body?.transformToString()
    //   const contentRes = await fetch(key, {
    //     method: "GET",
    //   })
    //   const text = await contentRes.text()
    //   file[key.slice(key.lastIndexOf("/") + 1)] = text
    // }

    // console.log(file)
    return NextResponse.json({ parsedContent });
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
}
