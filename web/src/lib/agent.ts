import { nylas } from './nylas';
import Groq from 'groq-sdk';
import filterConfig from './filter_config.json';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const { categories } = filterConfig;

export async function runSweep(grantId: string) {
    const results = [];
    try {
        const messagesResponse = await nylas.messages.list({
            identifier: grantId,
            queryParams: { limit: 20 },
        });

        console.log(`🚀 Starting Sweep for ${messagesResponse.data.length} messages...`);

        for (const msg of messagesResponse.data) {
            try {
                console.log(`🔎 Analyzing: "${msg.subject}" (ID: ${msg.id})`);
                const { analysis } = await processEmail(grantId, msg.id);
                const category = analysis.category;
                console.log(`   📊 Category Identified: ${category}`);

                // --- EXECUTE ACTIONS BASED ON CATEGORY ---
                // 1. Communications (Urgent, Action, Calendar) -> Save Draft
                if (['Emergency', 'URGENT_P0', 'ACTION_REQUIRED', 'CALENDAR_SYNC'].includes(category)) {
                    console.log(`   🛠️ Routing to DRAFT for: ${category}`);
                    const replyBody = await generateReply(msg, analysis);
                    await saveDraft(grantId, msg, replyBody);
                    console.log(`   ✅ ACTION: Draft saved for: ${msg.subject}`);
                }
                // 2. Low Signal or Security Risk -> Archive
                else if (['LOW_SIGNAL', 'SECURITY_RISK'].includes(category) || category.toLowerCase().includes('newsletter')) {
                    console.log(`   🛠️ Routing to ARCHIVE for: ${category}`);
                    await archiveEmail(grantId, msg.id);
                    console.log(`   ✅ ACTION: Archived from Inbox: ${msg.subject}`);
                }
                // 4. Default -> No Action
                else {
                    console.log(`   ℹ️ No specific action defined for category: ${category}`);
                }

                results.push({ subject: msg.subject, analysis, success: true });
            } catch (innerError: any) {
                console.error(`   ❌ Failed to process message "${msg.subject}":`, innerError.message);
                results.push({ subject: msg.subject, error: innerError.message, success: false });
            }
        }
        return results;
    } catch (error) {
        console.error('Sweep failed:', error);
        throw error;
    }
}

export async function processEmail(grantId: string, messageId: string) {
    try {
        const messageResponse = await nylas.messages.find({
            identifier: grantId,
            messageId: messageId,
        });

        const msg = messageResponse.data;

        // 1. Check Keyword Overrides for ALL categories
        const matchedOverride = checkAllKeywordOverrides(msg);
        let analysis;

        if (matchedOverride) {
            console.log(`   ✨ Keyword Match: "${matchedOverride.keyword}" -> ${matchedOverride.category}`);
            analysis = {
                category: matchedOverride.category,
                summary: `Auto-categorized based on keyword "${matchedOverride.keyword}".`,
                suggested_action: (categories as any)[matchedOverride.category]?.intent ?? 'Standard action.'
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

function checkAllKeywordOverrides(msg: any) {
    const searchText = `${msg.subject ?? ''} ${msg.snippet ?? ''}`.toLowerCase();

    // Check in order of priority (lower number = higher priority)
    const sortedCategories = Object.entries(categories).sort((a, b) => (a[1] as any).priority - (b[1] as any).priority);

    for (const [catName, catData] of sortedCategories) {
        const keywords = (catData as any).keywords ?? [];
        for (const kw of keywords) {
            if (searchText.includes(kw.toLowerCase())) {
                return { category: catName, keyword: kw };
            }
        }
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
async function generateReply(msg: any, analysis: any) {
    const categoryIntent = (categories as any)[analysis.category]?.intent ?? 'a standard business email';
    let availabilityContext = '';

    if (analysis.category === 'CALENDAR_SYNC') {
        const slots = await checkAvailability(process.env.NYLAS_GRANT_ID!); // Using default grant for now
        availabilityContext = `=== REAL-TIME AVAILABILITY (Next 3 Days) ===\n${slots}\n\nBased on the above, suggest a few 30-min slots during business hours (9am-5pm).`;
    }

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            {
                role: 'system',
                content: `You are a highly efficient, senior Executive Assistant. 
Tone: Professional, brief, trusted colleague.
${availabilityContext}
Instructions:
- Emergency/P0: Decisive, immediate acknowledgement.
- Action: Clear confirmation.
- Calendar: Suggest 2-3 specific options from availability.
Sign off as "The Team". Return ONLY plain text.`,
            },
            {
                role: 'user',
                content: `Subject: ${msg.subject}\nCategory: ${analysis.category}\nSummary: ${analysis.summary}`,
            },
        ],
    });

    return completion.choices[0]?.message?.content?.trim() ?? '';
}

async function checkAvailability(grantId: string) {
    try {
        const now = new Date();
        const threeDaysLater = new Date();
        threeDaysLater.setDate(now.getDate() + 3);

        const availability = await (nylas.calendars as any).getFreeBusy({
            identifier: grantId,
            requestBody: {
                startTime: Math.floor(now.getTime() / 1000),
                endTime: Math.floor(threeDaysLater.getTime() / 1000),
                emails: [process.env.USER_EMAIL || 'me'],
            }
        });
        return JSON.stringify(availability.data[0]?.timeSlots ?? []);
    } catch (err) {
        return 'Availability data unavailable.';
    }
}

async function saveDraft(grantId: string, msg: any, body: string) {
    const senderEmail = msg.from?.[0]?.email;
    if (!senderEmail) return;

    await nylas.drafts.create({
        identifier: grantId,
        requestBody: {
            to: [{ email: senderEmail, name: msg.from?.[0]?.name }],
            subject: `Re: ${msg.subject}`,
            body,
            replyToMessageId: msg.id,
        },
    });
}

async function sendReply(grantId: string, msg: any, body: string) {
    const senderEmail = msg.from?.[0]?.email;
    if (!senderEmail) return;

    await (nylas.messages as any).send({
        identifier: grantId,
        requestBody: {
            to: [{ email: senderEmail, name: msg.from?.[0]?.name }],
            subject: `Re: ${msg.subject}`,
            body,
            replyToMessageId: msg.id,
        },
    });
}

async function archiveEmail(grantId: string, msgId: string) {
    try {
        const foldersResponse = await nylas.folders.list({ identifier: grantId });
        const folders = foldersResponse.data;

        // Find INBOX folder/label ID
        let inboxFolder = folders.find(f => f.name.toUpperCase() === 'INBOX' || f.name === 'INBOX');

        if (!inboxFolder) {
            console.error('   ❌ Inbox folder not found. Cannot archive.');
            return;
        }

        // Get current message to check its labels/folders
        const currentMsg = await nylas.messages.find({ identifier: grantId, messageId: msgId });

        // Gmail uses labels, other providers use folders.
        const msgData = currentMsg.data as any;
        const useLabels = !!msgData.labels;

        const currentItems: string[] = (useLabels ? msgData.labels : msgData.folders) || [];

        // ARCHIVING: Simply remove from Inbox. 
        // If it has other labels (like "Sent", "Reviews", etc.), they stay. 
        // If it ONLY had Inbox, it moves to "All Mail".
        const updatedItems = currentItems.filter(id => id !== inboxFolder?.id);

        console.log(`   📤 Archiving: "${msgData.subject}" (Removing Inbox ID: ${inboxFolder.id})`);

        await nylas.messages.update({
            identifier: grantId,
            messageId: msgId,
            requestBody: (useLabels ? { labels: updatedItems } : { folders: updatedItems }) as any,
        });

        console.log(`   ✅ Successful archive for ID: ${msgId}`);
    } catch (err) {
        console.error('   ❌ Critical Archive failure:', err);
    }
}
