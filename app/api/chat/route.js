import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { messages, apiKey: clientApiKey } = await req.json();
    const apiKey = clientApiKey || process.env.DEEPSEEK_API_KEY;

    if (!apiKey || apiKey === 'your_deepseek_api_key_here' || apiKey.trim() === '') {
      return NextResponse.json({ 
        error: 'API Key DeepSeek tidak ditemukan. Silakan isi API Key di file .env.local atau di panel Pengaturan web ya!~' 
      }, { status: 400 });
    }

    // Add specialized system prompt to make AI act like a cute anime companion
    const formattedMessages = [
      {
        role: 'system',
        content: 'You are Siti-Chan, a cute 18-year-old anime girl virtual AI assistant. Your personality is cheerful, friendly, helpful, and you speak in a cute anime girl English style (using expressions like tildes ~). Keep your answers short and sweet (maximum 2-3 sentences) so it is comfortable to listen to in voice chat.'
      },
      ...messages
    ];

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json({ error: `DeepSeek API error: ${errorData}` }, { status: response.status });
    }

    const data = await response.json();
    const textResponse = data.choices[0].message.content;

    return NextResponse.json({ text: textResponse });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
