import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Tournament from '@/lib/yfdata/Tournament';
import TournamentSite from '@/lib/yfdata/TournamentSite';

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, siteName, date } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  // Build an empty YellowFruit tournament using the DataModel
  const tournament = new Tournament();
  tournament.name = name.trim();
  if (siteName?.trim()) {
    tournament.tournamentSite = new TournamentSite();
    tournament.tournamentSite.name = siteName.trim();
  }
  if (date) tournament.startDate = date;

  const data = tournament.toFileObject();

  const record = await prisma.yfTournament.create({
    data: {
      name: name.trim(),
      ownerId: session.user.id,
      data: data as object,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: record.id }, { status: 201 });
}
