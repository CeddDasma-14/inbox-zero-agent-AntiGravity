import { NextRequest, NextResponse } from 'next/server';
import { nylas, nylasConfig } from '@/lib/nylas';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    try {
        const response = await nylas.auth.exchangeCodeForToken({
            clientId: nylasConfig.clientId,
            clientSecret: process.env.NYLAS_API_KEY!, // Use API Key as secret in v3
            redirectUri: nylasConfig.callbackUrl,
            code,
        });

        const grantId = response.grantId;

        // Store grant ID in a secure cookie
        const cookieStore = await cookies();
        cookieStore.set('nylas_grant_id', grantId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });

        return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch (error: any) {
        console.error('Error exchanging code for token:', error);
        return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
    }
}
