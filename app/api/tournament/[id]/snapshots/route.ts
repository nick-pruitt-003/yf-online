import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getAccess(tournamentId: string, userId: string) {
  const tournament = await prisma.yfTournament.findUnique({
    where: { id: tournamentId },
    select: { ownerId: true, data: true },
  });
  if (!tournament) return null;
  const isOwner = tournament.ownerId === userId;
  const share = await prisma.yfTournamentShare.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  });
  if (!isOwner && !share) return null;
  return { isOwner, canEdit: isOwner || (share?.canEdit ?? false), currentData: tournament.data };
}

// GET /api/tournament/[id]/snapshots — list snapshot metadata (no data payload)
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const access = await getAccess(id, session.user.id);
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const snapshots = await prisma.yfTournamentSnapshot.findMany({
    where: { tournamentId: id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json(snapshots);
}

// POST /api/tournament/[id]/snapshots — restore a snapshot { snapshotId }
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const access = await getAccess(id, session.user.id);
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { snapshotId } = await req.json();
  if (typeof snapshotId !== 'string') {
    return NextResponse.json({ error: 'Invalid snapshotId' }, { status: 400 });
  }

  const snapshot = await prisma.yfTournamentSnapshot.findUnique({
    where: { id: snapshotId },
    select: { tournamentId: true, data: true },
  });
  if (!snapshot || snapshot.tournamentId !== id) {
    return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
  }

  // Snapshot the current state before restoring so the user can undo the restore.
  await prisma.yfTournamentSnapshot.create({
    data: { tournamentId: id, data: access.currentData as object },
  });

  const updated = await prisma.yfTournament.update({
    where: { id },
    data: { data: snapshot.data as object },
    select: { id: true, name: true, data: true, updatedAt: true },
  });

  return NextResponse.json(updated);
}
