import Nylas from 'nylas';

export const nylas = new Nylas({
    apiKey: process.env.NYLAS_API_KEY!,
    apiUri: process.env.NYLAS_API_URI || 'https://api.us.nylas.com',
});

export const nylasConfig = {
    clientId: process.env.NYLAS_CLIENT_ID!,
    callbackUrl: process.env.NYLAS_CALLBACK_URL || 'http://localhost:3000/api/auth/callback',
};
