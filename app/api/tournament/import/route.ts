import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // body should be the raw .yft file contents (a JSON object)
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid .yft data' }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Imported Tournament';

  let record: { id: string };
  try {
    record = await prisma.yfTournament.create({
      data: {
        name,
        ownerId: session.user.id,
        data: data as object,
      },
      select: { id: true },
    });
  } catch (err) {
    console.error('Failed to import tournament:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to import tournament' }, { status: 500 });
  }

  return NextResponse.json({ id: record.id }, { status: 201 });
}
