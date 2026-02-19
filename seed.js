
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
            {
                subject: "URGENT: Q3 Budget Review Needed TODAY",
                body: "Hi Team,\n\nThe budget review meeting has been moved up to 4 PM today. Please review the attached spreadsheet and send me your feedback by 3 PM latest.\n\nThanks,\nBoss",
                title: "Work Email"
            },
            {
                subject: "Tech Weekly: The Future of AI Agents",
                body: "This week's top stories:\n1. How AI Agents are changing productivity.\n2. New advancements in LLMs.\n3. Javascript vs TypeScript in 2026.\n\nRead more at our blog.",
                title: "Newsletter"
            },
            {
                subject: "CONGRATULATIONS! You've won a $1000 Gift Card!",
                body: "You have been selected as our lucky winner! Click the link below to claim your prize immediately before it expires.\n\n[Claim Now]",
                title: "Simulated Spam"
            }
        ];

        // 3. Send Emails
        console.log("\n--- SENDING EMAILS ---\n");

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
            // Small delay to ensure order sometimes helps, but async await is fine.
        }

        console.log(chalk.bold.white("\n✅ Seed Complete! Check your inbox (and maybe Spam folder) in a few moments."));

    } catch (error) {
        console.error(chalk.red("❌ Error seeding inbox:"), error);
    }
}

seedInbox();
