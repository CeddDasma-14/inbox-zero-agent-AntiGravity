import { nylas } from './nylas';
import Groq from 'groq-sdk';
import filterConfig from './filter_config.json';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const { categories } = filterConfig;

export async function processEmail(grantId: string, messageId: string) {
    try {
        const messageResponse = await nylas.messages.find({
            identifier: grantId,
            messageId: messageId,
        });

        const msg = messageResponse.data;

        // Check Keyword Override
        const matchedKeyword = checkUrgentP0Override(msg);
        let analysis;

        if (matchedKeyword) {
            analysis = {
                category: 'Emergency',
                summary: `Auto-flagged as Emergency due to keyword "${matchedKeyword}" detected.`,
                suggested_action: 'Respond immediately — this is a P0 incident.',
            };
        } else {
            analysis = await analyzeWithAI(msg);
        }

        return { message: msg, analysis };
    } catch (error) {
        console.error('Agent process error:', error);
        throw error;
    }
}

function checkUrgentP0Override(msg: any) {
    const p0Keywords = (categories as any).URGENT_P0?.keywords ?? [];
    const searchText = `${msg.subject ?? ''} ${msg.snippet ?? ''}`.toLowerCase();
    for (const keyword of p0Keywords) {
        if (searchText.includes(keyword.toLowerCase())) return keyword;
    }
    return null;
}

async function analyzeWithAI(msg: any) {
    const categoryNames = Object.keys(categories).join(', ');
    const categoryGuide = Object.entries(categories)
        .map(([name, data]: [string, any]) => `- ${name}: ${data.intent}`)
        .join('\n');

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            {
                role: 'system',
                content: `Classify the email into ONE: ${categoryNames}.\nGuide:\n${categoryGuide}\nReturn JSON: { "category": "...", "summary": "...", "suggested_action": "..." }`,
            },
            {
                role: 'user',
                content: `Subject: ${msg.subject}\nSnippet: ${msg.snippet}`,
            },
        ],
        response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0]?.message?.content || '{}');
}
