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

  const { data, name } = await req.json();

  const updated = await prisma.yfTournament.update({
    where: { id },
    data: {
      ...(data !== undefined && { data: data as object }),
      ...(name !== undefined && { name: String(name) }),
    },
    select: { id: true, name: true, updatedAt: true },
  });

  return NextResponse.json(updated);
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
