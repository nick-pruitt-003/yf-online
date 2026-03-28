import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/tournament/:id/shares — list shares (owner only) */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const tournament = await prisma.yfTournament.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (tournament.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const shares = await prisma.yfTournamentShare.findMany({
    where: { tournamentId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(shares);
}

/** POST /api/tournament/:id/shares — add a share by email */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const tournament = await prisma.yfTournament.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (tournament.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let email: unknown;
  let canEdit: unknown;
  try {
    ({ email, canEdit } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  // Can't share with yourself
  if (email.trim().toLowerCase() === session.user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Cannot share with yourself' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, name: true, email: true },
  });
  if (!target) return NextResponse.json({ error: 'No account found for that email' }, { status: 404 });

  const share = await prisma.yfTournamentShare.upsert({
    where: { tournamentId_userId: { tournamentId: id, userId: target.id } },
    create: { tournamentId: id, userId: target.id, canEdit: canEdit === true },
    update: { canEdit: canEdit === true },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(share, { status: 201 });
}

/** DELETE /api/tournament/:id/shares?userId=xxx — remove a share */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const tournament = await prisma.yfTournament.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (tournament.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId query param required' }, { status: 400 });

  await prisma.yfTournamentShare.deleteMany({
    where: { tournamentId: id, userId },
  });

  return NextResponse.json({ ok: true });
}
