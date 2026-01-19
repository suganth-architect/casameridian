
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { admin, error, status } = await verifyAdmin(req, 'staff');

    if (error) {
        return NextResponse.json({ error }, { status });
    }

    return NextResponse.json({ admin });
}
