import { NextResponse } from 'next/server';
import { nylas, nylasConfig } from '@/lib/nylas';

export async function GET() {
    const authUrl = nylas.auth.urlForOAuth2({
        clientId: nylasConfig.clientId,
        redirectUri: nylasConfig.callbackUrl,
    });

    return NextResponse.redirect(authUrl);
}
