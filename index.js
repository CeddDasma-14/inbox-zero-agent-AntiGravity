
import 'dotenv/config';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import Nylas from 'nylas';
import Groq from 'groq-sdk';
import chalk from 'chalk';

// --- Import filter config (JSON import via createRequire for ES modules) ---
const require = createRequire(import.meta.url);
const filterConfig = require('./filter_config.json');
const { categories } = filterConfig;

// --- Retry helper with exponential backoff ---
async function withRetry(fn, retries = 4, delayMs = 5000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            const isRateLimit = err?.message?.includes('429') || err?.message?.includes('quota');
            if (isRateLimit && attempt < retries) {
                const wait = delayMs * attempt;
                console.log(chalk.yellow(`   ⏳ Rate limit hit. Retrying in ${wait / 1000}s (attempt ${attempt}/${retries - 1})...`));
                await new Promise(res => setTimeout(res, wait));
            } else {
                throw err;
            }
        }
    }
}

const nylas = new Nylas({
    apiKey: process.env.NYLAS_API_KEY,
    apiUri: process.env.NYLAS_API_URI,
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- Folder Management ---
let reviewLaterFolderId = null;
const REVIEW_LATER_NAME = 'Review Later';

async function ensureReviewLaterFolder() {
    if (reviewLaterFolderId) return reviewLaterFolderId;

    try {
        const folders = await nylas.folders.list({
            identifier: process.env.NYLAS_GRANT_ID,
        });

        const existing = folders.data.find(f => f.name.toLowerCase() === REVIEW_LATER_NAME.toLowerCase());
        if (existing) {
            reviewLaterFolderId = existing.id;
            return existing.id;
        }

        // Create it if not found
        console.log(chalk.gray(`   📂 Creating "${REVIEW_LATER_NAME}" folder...`));
        const created = await nylas.folders.create({
            identifier: process.env.NYLAS_GRANT_ID,
            requestBody: {
                name: REVIEW_LATER_NAME,
            },
        });
        reviewLaterFolderId = created.data.id;
        return created.data.id;
    } catch (err) {
        console.error(chalk.red('   ❌ Failed to manage folders:'), err.message);
        return null;
    }
}

async function moveToLater(msgId) {
    const folderId = await ensureReviewLaterFolder();
    if (!folderId) return;

    try {
        await nylas.messages.update({
            identifier: process.env.NYLAS_GRANT_ID,
            messageId: msgId,
            requestBody: {
                folderId: folderId,
            },
        });
        console.log(chalk.bgCyan.black(`   📦 MOVED TO "${REVIEW_LATER_NAME}"`));
    } catch (err) {
        console.error(chalk.red('   ❌ Failed to move message:'), err.message);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 0: Hard keyword override — check URGENT_P0 keywords BEFORE calling AI
// If a match is found in the subject or snippet, skip AI entirely.
// ─────────────────────────────────────────────────────────────────────────────
function checkUrgentP0Override(msg) {
    const p0Keywords = categories.URGENT_P0?.keywords ?? [];
    const searchText = `${msg.subject ?? ''} ${msg.snippet ?? ''}`.toLowerCase();

    for (const keyword of p0Keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
            return keyword; // Return the matched keyword for logging
        }
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Build the category reference block from filter_config.json
// This is injected into the Gemini prompt so it knows *exactly* what each
// category means, along with signal keywords.
// ─────────────────────────────────────────────────────────────────────────────
function buildCategoryGuide() {
    return Object.entries(categories)
        .map(([name, data]) => {
            const keywords = data.keywords.join(', ');
            return `- ${name} (priority ${data.priority}): ${data.intent}\n  Signal keywords: ${keywords}`;
        })
        .join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Analyze the email with Groq using config-driven categories
// ─────────────────────────────────────────────────────────────────────────────
async function analyzeEmail(msg) {
    const categoryNames = Object.keys(categories).join(', ');
    const categoryGuide = buildCategoryGuide();

    const completion = await withRetry(() => groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            {
                role: 'system',
                content: `You are a high-level Executive Assistant managing a busy executive's inbox.
Classify each email into ONE category and return a JSON object.

=== CATEGORY GUIDE ===
${categoryGuide}

=== OUTPUT FORMAT ===
Return strictly a JSON object:
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
    }));

    const text = completion.choices[0]?.message?.content ?? '';
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString);
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5.5: Check Real Calendar Availability
// Fetches free slots for the next 3 days from the primary calendar.
// ─────────────────────────────────────────────────────────────────────────────
async function checkAvailability() {
    try {
        const now = new Date();
        const threeDaysLater = new Date();
        threeDaysLater.setDate(now.getDate() + 3);

        const availability = await nylas.calendars.getFreeBusy({
            identifier: process.env.NYLAS_GRANT_ID,
            requestBody: {
                startTime: Math.floor(now.getTime() / 1000),
                endTime: Math.floor(threeDaysLater.getTime() / 1000),
                emails: [process.env.USER_EMAIL || 'me'], // Assumes grant email if not set
            }
        });

        // Simply returns the raw free/busy data for the LLM to interpret
        return JSON.stringify(availability.data[0]?.timeSlots ?? []);
    } catch (err) {
        console.log(chalk.yellow('   ⚠️  Calendar check failed, falling back to generic reply.'));
        return 'Availability data unavailable.';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: Generate a reply with Groq
// ─────────────────────────────────────────────────────────────────────────────
async function generateReply(msg, analysis) {
    const categoryIntent = categories[analysis.category]?.intent ?? 'a standard business email';

    // Fetch real calendar data if it's a calendar request
    let availabilityContext = '';
    if (analysis.category === 'CALENDAR_SYNC') {
        const slots = await checkAvailability();
        availabilityContext = `=== REAL-TIME AVAILABILITY (Next 3 Days) ===\n${slots}\n\nBased on the above, suggest a few 30-min slots during business hours (9am-5pm).`;
    }

    const completion = await withRetry(() => groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            {
                role: 'system',
                content: `You are a highly efficient, senior Executive Assistant. 
Your tone is professional, decisive, and warm but brief. 
Never sound like an "AI assistant" – sound like a trusted colleague.

${availabilityContext}

=== INSTRUCTIONS ===
Write a concise reply:
- Emergency/URGENT_P0: Decisive, immediate acknowledgement.
- ACTION_REQUIRED: Clear confirmation of approval or next steps.
- CALENDAR_SYNC: Use the provided availability to suggest 2-3 specific options.

Sign off as "The Team". Return ONLY plain text.`,
            },
            {
                role: 'user',
                content: `Original: ${msg.subject}\nFrom: ${msg.from?.[0]?.email}\nCategory: ${analysis.category}\nIntent: ${categoryIntent}\nSummary: ${analysis.summary}`,
            },
        ],
        temperature: 0.5,
    }));

    return completion.choices[0]?.message?.content?.trim() ?? '';
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4: Save as Draft
// ─────────────────────────────────────────────────────────────────────────────
async function saveDraft(msg, replyBody) {
    const senderEmail = msg.from?.[0]?.email;
    const senderName = msg.from?.[0]?.name ?? senderEmail;

    if (!senderEmail) {
        console.log(chalk.yellow('   ⚠️  Could not determine sender email, skipping draft.'));
        return;
    }

    await nylas.drafts.create({
        identifier: process.env.NYLAS_GRANT_ID,
        requestBody: {
            to: [{ name: senderName, email: senderEmail }],
            subject: `Re: ${msg.subject}`,
            body: replyBody,
            replyToMessageId: msg.id,
        },
    });

    console.log(chalk.bgYellow.black(`   📝 DRAFT SAVED → "Re: ${msg.subject}"`));
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5: Auto-send reply
// ─────────────────────────────────────────────────────────────────────────────
async function sendReply(msg, replyBody) {
    const senderEmail = msg.from?.[0]?.email;
    const senderName = msg.from?.[0]?.name ?? senderEmail;

    if (!senderEmail) {
        console.log(chalk.yellow('   ⚠️  Could not determine sender email, skipping send.'));
        return;
    }

    await nylas.messages.send({
        identifier: process.env.NYLAS_GRANT_ID,
        requestBody: {
            to: [{ name: senderName, email: senderEmail }],
            subject: `Re: ${msg.subject}`,
            body: replyBody,
            replyToMessageId: msg.id,
        },
    });

    console.log(chalk.bgGreen.black(`   ✉️  REPLY SENT → "Re: ${msg.subject}"`));
}

// ─────────────────────────────────────────────────────────────────────────────
// Category color map (matches filter_config.json colors)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6: Consolidated TODO.md Manager
// Keep track of all ACTION_REQUIRED or URGENT items in a markdown file.
// ─────────────────────────────────────────────────────────────────────────────
function updateTodoList(analysis, subject) {
    const todoPath = path.join(process.cwd(), 'TODO.md');
    const timestamp = new Date().toLocaleString();
    const entry = `- [ ] **${analysis.category}**: ${subject}\n  - *Summary*: ${analysis.summary}\n  - *Action*: ${analysis.suggested_action}\n  - *Added*: ${timestamp}\n\n`;

    try {
        if (!fs.existsSync(todoPath)) {
            fs.writeFileSync(todoPath, `# 📬 Inbox Zero - Action Items\n\nGenerated by your AI Agent.\n\n${entry}`);
        } else {
            // Check if already exists to avoid duplicates (loose check by subject)
            const content = fs.readFileSync(todoPath, 'utf8');
            if (!content.includes(subject)) {
                fs.appendFileSync(todoPath, entry);
            }
        }
    } catch (err) {
        console.error(chalk.red('   ❌ Failed to update TODO.md:'), err.message);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN AGENT LOGIC
// ─────────────────────────────────────────────────────────────────────────────
async function runAgentStep() {
    try {
        console.log(chalk.bold.white('\n' + '═'.repeat(50)));
        console.log(chalk.bold.white(`🚀 Run started at: ${new Date().toLocaleTimeString()}`));

        const messages = await nylas.messages.list({
            identifier: process.env.NYLAS_GRANT_ID,
            queryParams: { limit: 5 },
        });

        const model = 'llama-3.3-70b-versatile';

        for (const [i, msg] of messages.data.entries()) {
            // [Previous processing logic remains same inside this loop...]

            try {
                let analysis;

                // ── STEP 0: Hard keyword override for URGENT_P0 ──
                const matchedKeyword = checkUrgentP0Override(msg);
                if (matchedKeyword) {
                    console.log(chalk.bgRed.white(`   🚨 EMERGENCY OVERRIDE triggered by keyword: "${matchedKeyword}"`));
                    analysis = {
                        category: 'Emergency',
                        summary: `Auto-flagged as Emergency due to keyword "${matchedKeyword}" detected in subject/snippet.`,
                        suggested_action: 'Respond immediately — this is a P0 incident.',
                    };
                } else {
                    // ── STEP 1: AI Analysis using config categories ──
                    analysis = await analyzeEmail(msg);
                }

                console.log(`   📧 Category: ${logCategory(analysis.category)}`);
                console.log(chalk.cyan(`   📝 Summary:  ${analysis.summary}`));
                console.log(chalk.magenta(`   💡 Action:   ${analysis.suggested_action}`));

                // ── STEP 2: Route based on category ──
                if (analysis.category === 'Emergency' || analysis.category === 'URGENT_P0' || analysis.category === 'ACTION_REQUIRED') {
                    // Update TODO list for all action items
                    updateTodoList(analysis, msg.subject);

                    const logMsg = analysis.category === 'ACTION_REQUIRED' ? '✍️  Generating draft reply...' : '🚨 Generating URGENT draft reply...';
                    console.log(chalk.gray(`   → ${logMsg}`));

                    const replyBody = await generateReply(msg, analysis);
                    await saveDraft(msg, replyBody);

                } else if (analysis.category === 'CALENDAR_SYNC') {
                    console.log(chalk.gray('   → 📅 Auto-sending CALENDAR_SYNC reply...'));
                    const replyBody = await generateReply(msg, analysis);
                    await sendReply(msg, replyBody);

                } else if (analysis.category === 'LOW_SIGNAL') {
                    console.log(chalk.gray('   → 📰 LOW_SIGNAL: Moving to "Review Later" folder...'));
                    await moveToLater(msg.id);

                } else if (analysis.category === 'SECURITY_RISK') {
                    console.log(chalk.bgMagenta.white('   → 🛡️  SECURITY_RISK: Flagged as phishing/scam. No reply.'));
                }

            } catch (aiError) {
                console.error(chalk.red(`   ❌ Error processing email ${i + 1}:`), aiError.message);
            }

            console.log(chalk.gray('   ────────────────────────────────────────'));
        }

    } catch (error) {
        console.error(chalk.red('❌ Run Error:'), error);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTINUOUS MONITORING LOOP
// Runs immediately, then every 5 minutes.
// ─────────────────────────────────────────────────────────────────────────────
const FIVE_MINUTES = 5 * 60 * 1000;

async function startAgent() {
    console.log(chalk.bold.green('\n✅ Inbox Zero Agent Service Started'));
    console.log(chalk.gray(`📋 Config: 5 categories | Polling: Every 5 minutes\n`));

    // Initial run
    await runAgentStep();

    // Loop
    setInterval(async () => {
        await runAgentStep();
    }, FIVE_MINUTES);
}

startAgent();