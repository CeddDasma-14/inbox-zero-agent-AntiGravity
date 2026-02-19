import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { runSweep } from '@/lib/agent';

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const grantId = cookieStore.get('nylas_grant_id')?.value;

    if (!grantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const results = await runSweep(grantId);
        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
