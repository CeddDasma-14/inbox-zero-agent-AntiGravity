
import 'dotenv/config';
import Nylas from 'nylas';
import chalk from 'chalk';

const nylas = new Nylas({
    apiKey: process.env.NYLAS_API_KEY,
    apiUri: process.env.NYLAS_API_URI,
});

async function seedInbox() {
    console.log(chalk.bold.white("\n🌱 Seeding Inbox with Test Emails..."));

    try {
        const grantId = process.env.NYLAS_GRANT_ID;

        // 1. Get User Email (Recipient)
        console.log(chalk.blue("Fetching user details..."));
        const grant = await nylas.grants.find({ grantId });
        const userEmail = grant.data.email;

        console.log(chalk.green(`User found: ${userEmail}`));

        // 2. Define Test Emails
        const testEmails = [
            // --- EMERGENCY KEYWORD OVERRIDES (Test Keyword Logic) ---
            { subject: "CRITICAL: Database Outage", body: "The production database is down. We are losing $500/minute. Fix this now.", title: "EMERGENCY_OVERRIDE" },
            { subject: "incident report: core-api-v1", body: "We found a major vulnerability in the v1 API. Blocker for the release.", title: "EMERGENCY_OVERRIDE" },

            // --- AI CLASSIFICATION: URGENT / ACTION (Test AI Logic) ---
            { subject: "Legal: Contract Signature Required", body: "Please sign the partnership agreement for the new AI project by noon.", title: "URGENT_P0" },
            { subject: "Approval for February Ad Spend", body: "Our marketing team needs your sign-off on the $5k budget increase for Feb.", title: "ACTION_REQUIRED" },
            { subject: "Deliverable sign-off: UX Mockups", body: "The designs for the new dashboard are ready. Can we get your green light?", title: "ACTION_REQUIRED" },

            // --- CALENDAR SYNC (Test Calendar Integration) ---
            { subject: "Availability request: Sync about the demo", body: "I'd love to chat about the demo next week. When are you free for 30 min?", title: "CALENDAR_SYNC" },
            { subject: "Can we reschedule our touch base?", body: "Something came up. Can we meet on Wednesday or Thursday instead?", title: "CALENDAR_SYNC" },

            // --- LOW SIGNAL (Test "Move to Review Later" Logic) ---
            { subject: "Weekly Newsletter: The AI Revolution", body: "Inside: How autonomous agents are changing the workforce in 2026.", title: "LOW_SIGNAL" },
            { subject: "Your Monthly SaaS Insights Digest", body: "Check out your platform usage statistics and efficiency score for January.", title: "LOW_SIGNAL" },
            { subject: "Waitlist: New Developer Tools Beta", body: "You're on the list! We'll notify you when your access is ready.", title: "LOW_SIGNAL" },
            { subject: "Upcoming Webinar: Next.js 16 Preview", body: "Reserve your spot to see the latest features in the Next.js ecosystem.", title: "LOW_SIGNAL" },
            { subject: "Product Roundup: February Updates", body: "We've added 10 new integrations and a sleek dark mode. Read more here.", title: "LOW_SIGNAL" },

            // --- SECURITY & STANDARD ---
            { subject: "SECURITY: Unusual login from Tokyo", body: "Account alert: A new device just logged in from an unrecognized IP in Japan.", title: "SECURITY_RISK" },
            { subject: "Don't forget the team lunch today!", body: "Pizza is arriving at 12:30. See you in the common area!", title: "Standard" },
            { subject: "Question regarding the coffee machine", body: "Hey! Do you know how to descale the office Jura? It's blinking red.", title: "Standard" }
        ];

        // 3. Send Emails
        console.log(`\n--- FINAL VERIFICATION: SENDING ${testEmails.length} TEST EMAILS ---\n`);

        for (const email of testEmails) {
            console.log(chalk.gray(`Sending '${email.title}'...`));

            await nylas.messages.send({
                identifier: grantId,
                requestBody: {
                    to: [{ email: userEmail }],
                    subject: email.subject,
                    body: email.body,
                }
            });

            console.log(chalk.green(`✅ Sent: ${email.subject}`));
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        console.log(chalk.bold.white("\n✅ Seed Complete! Check your inbox (and maybe Spam folder) in a few moments."));

    } catch (error) {
        console.error(chalk.red("❌ Error seeding inbox:"), error);
    }
}

seedInbox();
