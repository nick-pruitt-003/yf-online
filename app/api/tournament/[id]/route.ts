import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const tournament = await prisma.yfTournament.findUnique({
    where: { id },
    select: { id: true, name: true, data: true, ownerId: true },
  });

  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isOwner = tournament.ownerId === session.user.id;
  const share = await prisma.yfTournamentShare.findUnique({
    where: { tournamentId_userId: { tournamentId: id, userId: session.user.id } },
  });

  if (!isOwner && !share) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.json(tournament);
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const tournament = await prisma.yfTournament.findUnique({
    where: { id },
    select: { ownerId: true },
  });

  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isOwner = tournament.ownerId === session.user.id;
  const share = await prisma.yfTournamentShare.findUnique({
    where: { tournamentId_userId: { tournamentId: id, userId: session.user.id } },
  });

  if (!isOwner && !share?.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let data: unknown;
  let name: unknown;
  try {
    ({ data, name } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (data !== undefined && (typeof data !== 'object' || data === null || Array.isArray(data))) {
    return NextResponse.json({ error: 'Invalid data field' }, { status: 400 });
  }
  if (name !== undefined && typeof name !== 'string') {
    return NextResponse.json({ error: 'Invalid name field' }, { status: 400 });
  }

  const updated = await prisma.yfTournament.update({
    where: { id },
    data: {
      ...(data !== undefined && { data: data as object }),
      ...(name !== undefined && { name }),
    },
    select: { id: true, name: true, updatedAt: true, data: true },
  });

  // Create a snapshot if data changed and last snapshot is >5 min old (or none exists).
  if (data !== undefined) {
    const latest = await prisma.yfTournamentSnapshot.findFirst({
      where: { tournamentId: id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (!latest || latest.createdAt < fiveMinAgo) {
      await prisma.yfTournamentSnapshot.create({
        data: { tournamentId: id, data: updated.data as object },
      });
      // Keep only the 20 most recent snapshots.
      const old = await prisma.yfTournamentSnapshot.findMany({
        where: { tournamentId: id },
        orderBy: { createdAt: 'desc' },
        skip: 20,
        select: { id: true },
      });
      if (old.length > 0) {
        await prisma.yfTournamentSnapshot.deleteMany({
          where: { id: { in: old.map((s) => s.id) } },
        });
      }
    }
  }

  return NextResponse.json({ id: updated.id, name: updated.name, updatedAt: updated.updatedAt });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const tournament = await prisma.yfTournament.findUnique({
    where: { id },
    select: { ownerId: true },
  });

  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (tournament.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.yfTournament.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
