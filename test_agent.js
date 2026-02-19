
import 'dotenv/config';
import { createRequire } from 'module';
import Groq from 'groq-sdk';
import chalk from 'chalk';

// --- Import filter config ---
const require = createRequire(import.meta.url);
const filterConfig = require('./filter_config.json');
const { categories } = filterConfig;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- MOCK EMAIL DATA ---
const dummyEmails = [
    {
        id: 'mock-001',
        subject: 'P0 outage: Payment service is down',
        snippet: 'The payment processing service has been throwing 500 errors for the last 10 minutes. Customers cannot checkout. This is a blocker for all transactions.',
        from: [{ name: 'On-Call Alert', email: 'oncall@company.com' }],
    },
    {
        id: 'mock-002',
        subject: 'Approval needed: Q2 Marketing Budget',
        snippet: 'Hi, we need your sign-off on the Q2 marketing budget before we can move forward with the campaign. Please review and approve by EOD.',
        from: [{ name: 'Marketing Lead', email: 'marketing@company.com' }],
    },
    {
        id: 'mock-003',
        subject: 'Can we sync this week? Re: product roadmap alignment',
        snippet: 'Hey, wanted to touch base on the roadmap. Do you have any availability Thursday or Friday afternoon for a quick alignment call?',
        from: [{ name: 'Product Manager', email: 'pm@company.com' }],
    },
    {
        id: 'mock-004',
        subject: 'Weekly Newsletter: Tech Trends 2026',
        snippet: 'This week in tech: AI agents are taking over, new quantum computing breakthroughs, and the latest Javascript frameworks you need to know.',
        from: [{ name: 'Tech Daily', email: 'newsletter@techdaily.com' }],
    },
    {
        id: 'mock-005',
        subject: 'CONGRATULATIONS! Claim your instant cash prize NOW',
        snippet: 'You have been selected! Verify now to claim your $500 instant cash reward before it expires in 24 hours. Click the link below.',
        from: [{ name: 'Prize Dept', email: 'noreply@spammy.com' }],
    },
];

// ── STEP 0: Hard URGENT_P0 keyword override ──
function checkUrgentP0Override(msg) {
    const p0Keywords = categories.URGENT_P0?.keywords ?? [];
    const searchText = `${msg.subject ?? ''} ${msg.snippet ?? ''}`.toLowerCase();
    for (const keyword of p0Keywords) {
        if (searchText.includes(keyword.toLowerCase())) return keyword;
    }
    return null;
}

// ── Build category guide from config for the AI prompt ──
function buildCategoryGuide() {
    return Object.entries(categories)
        .map(([name, data]) => {
            return `- ${name} (priority ${data.priority}): ${data.intent}\n  Signal keywords: ${data.keywords.join(', ')}`;
        })
        .join('\n');
}

// ── STEP 1: Analyze email with Groq ──
async function analyzeEmail(msg) {
    const categoryNames = Object.keys(categories).join(', ');
    const categoryGuide = buildCategoryGuide();

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            {
                role: 'system',
                content: `You are a high-level Executive Assistant managing a busy executive's inbox.
Your job is to classify each email into ONE of the following categories and return a JSON object.

=== CATEGORY GUIDE ===
${categoryGuide}

=== OUTPUT FORMAT ===
Return strictly a JSON object with these exact fields:
{
  "category": "<one of: ${categoryNames}>",
  "summary": "<1-sentence summary>",
  "suggested_action": "<short action instruction>"
}

Return ONLY valid JSON. No markdown, no explanation.`,
            },
            {
                role: 'user',
                content: `Subject: ${msg.subject}\nFrom: ${msg.from?.[0]?.email ?? 'unknown'}\nSnippet: ${msg.snippet}`,
            },
        ],
        temperature: 0.2,
    });

    const text = completion.choices[0]?.message?.content ?? '';
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString);
}

// ── STEP 2: Generate a reply with Groq ──
async function generateReply(msg, analysis) {
    const categoryIntent = categories[analysis.category]?.intent ?? 'a standard business email';

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            {
                role: 'system',
                content: `You are a professional Executive Assistant writing email replies on behalf of a senior executive.
Write a concise, professional reply appropriate for the email category.
- Emergency / URGENT_P0: Express urgency, confirm immediate action. Short and decisive.
- ACTION_REQUIRED: Acknowledge the request and confirm the decision/approval clearly.
- CALENDAR_SYNC: Confirm or propose a time. Friendly and brief.
Sign off as "The Team". Return ONLY the plain text reply body. No subject, no markdown.`,
            },
            {
                role: 'user',
                content: `Subject: ${msg.subject}\nFrom: ${msg.from?.[0]?.email}\nSnippet: ${msg.snippet}\nCategory: ${analysis.category}\nCategory Intent: ${categoryIntent}\nSummary: ${analysis.summary}`,
            },
        ],
        temperature: 0.5,
    });

    return completion.choices[0]?.message?.content?.trim() ?? '';
}

// ── MOCK: Save Draft (simulated) ──
async function saveDraftMock(msg, replyBody) {
    console.log(chalk.bgYellow.black(`   📝 [SIMULATED] DRAFT SAVED → "Re: ${msg.subject}"`));
    console.log(chalk.gray(`   TO: ${msg.from?.[0]?.email}`));
    console.log(chalk.gray(`   PREVIEW: "${replyBody.substring(0, 120)}..."`));
}

// ── MOCK: Send Reply (simulated) ──
async function sendReplyMock(msg, replyBody) {
    console.log(chalk.bgGreen.black(`   ✉️  [SIMULATED] REPLY SENT → "Re: ${msg.subject}"`));
    console.log(chalk.gray(`   TO: ${msg.from?.[0]?.email}`));
    console.log(chalk.gray(`   PREVIEW: "${replyBody.substring(0, 120)}..."`));
}

// ── Category color map ──
const categoryChalk = {
    URGENT_P0: chalk.bgRed.white,
    Emergency: chalk.bgRed.white,
    ACTION_REQUIRED: chalk.bgYellow.black,
    CALENDAR_SYNC: chalk.bgBlue.white,
    LOW_SIGNAL: chalk.gray,
    SECURITY_RISK: chalk.bgMagenta.white,
};
function logCategory(category) {
    const fn = categoryChalk[category] ?? chalk.white;
    return fn(` ${category} `);
}

// ── MAIN TEST RUNNER ──
async function runTest() {
    try {
        console.log(chalk.bold.white('\n🚀 Inbox Zero Agent (TEST MODE) — Powered by Groq ⚡'));
        console.log(chalk.gray(`📋 Loaded ${Object.keys(categories).length} categories from filter_config.json`));
        console.log(chalk.gray('Using simulated email data. No real emails will be sent.\n'));

        console.log(chalk.bold('--- PROCESSING DUMMY EMAILS ---\n'));

        for (const [i, msg] of dummyEmails.entries()) {
            console.log(chalk.blue(`\n[${i + 1}/${dummyEmails.length}] Processing: "${msg.subject}"`));

            try {
                let analysis;

                // STEP 0: Hard keyword override for URGENT_P0
                const matchedKeyword = checkUrgentP0Override(msg);
                if (matchedKeyword) {
                    console.log(chalk.bgRed.white(`   🚨 EMERGENCY OVERRIDE — keyword detected: "${matchedKeyword}"`));
                    analysis = {
                        category: 'Emergency',
                        summary: `Auto-flagged as Emergency due to keyword "${matchedKeyword}".`,
                        suggested_action: 'Respond immediately — this is a P0 incident.',
                    };
                } else {
                    // STEP 1: AI analysis
                    analysis = await analyzeEmail(msg);
                }

                console.log(`   📧 Category: ${logCategory(analysis.category)}`);
                console.log(chalk.cyan(`   📝 Summary:  ${analysis.summary}`));
                console.log(chalk.magenta(`   💡 Action:   ${analysis.suggested_action}`));

                // STEP 2: Route by category
                if (analysis.category === 'Emergency' || analysis.category === 'URGENT_P0') {
                    console.log(chalk.gray('   → 🚨 Generating URGENT draft reply...'));
                    const replyBody = await generateReply(msg, analysis);
                    await saveDraftMock(msg, replyBody);

                } else if (analysis.category === 'ACTION_REQUIRED') {
                    console.log(chalk.gray('   → ✍️  Generating draft reply...'));
                    const replyBody = await generateReply(msg, analysis);
                    await saveDraftMock(msg, replyBody);

                } else if (analysis.category === 'CALENDAR_SYNC') {
                    console.log(chalk.gray('   → 📅 Auto-sending CALENDAR_SYNC reply...'));
                    const replyBody = await generateReply(msg, analysis);
                    await sendReplyMock(msg, replyBody);

                } else if (analysis.category === 'LOW_SIGNAL') {
                    console.log(chalk.gray('   → 📰 LOW_SIGNAL: No reply needed. Skipping.'));

                } else if (analysis.category === 'SECURITY_RISK') {
                    console.log(chalk.bgMagenta.white('   → 🛡️  SECURITY_RISK: Flagged as phishing/scam. No reply.'));
                }

            } catch (err) {
                console.error(chalk.red(`   ❌ Error on email ${i + 1}:`), err.message);
            }

            console.log(chalk.gray('   ────────────────────────────────────────'));
        }

        console.log(chalk.bold.green('\n✅ Test Complete! In production, drafts save to your inbox and CALENDAR replies send automatically.\n'));

    } catch (error) {
        console.error(chalk.red('❌ Fatal Error:'), error);
    }
}

runTest();
