import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import JSZip from 'jszip';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import FileParser from '@/lib/yfdata/FileParsing';
import { collectRefTargets } from '@/lib/yfdata/QbjUtils2';
import type { IQbjTournament } from '@/lib/yfdata/Tournament';
import type { IQbjObject } from '@/lib/yfdata/Interfaces';
import { StatReportFileNames, StatReportPages } from '@/lib/Enums';

const PAGE_GENERATORS: Record<string, [StatReportPages, (t: Awaited<ReturnType<typeof buildTournament>>) => Promise<string>]> = {
  standings:    [StatReportPages.Standings,     (t) => t.makeHtmlStandings()],
  individuals:  [StatReportPages.Individuals,   (t) => t.makeHtmlIndividuals()],
  games:        [StatReportPages.Scoreboard,    (t) => t.makeHtmlScoreboard()],
  teamdetail:   [StatReportPages.TeamDetails,   (t) => t.makeHtmlTeamDetail()],
  playerdetail: [StatReportPages.PlayerDetails, (t) => t.makeHtmlPlayerDetail()],
  rounds:       [StatReportPages.RoundReport,   (t) => t.makeHtmlRoundReport()],
};

async function buildTournament(data: object) {
  const obj = data as unknown as IQbjTournament;
  const refTargets = collectRefTargets([obj as IQbjObject]);
  const parser = new FileParser(refTargets);
  const tournament = parser.parseTournament(obj);
  tournament.compileStats(true);
  return tournament;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const record = await prisma.yfTournament.findUnique({
    where: { id },
    select: {
      name: true,
      data: true,
      ownerId: true,
      shares: { where: { userId: session.user.id }, select: { canEdit: true } },
    },
  });

  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isOwner = record.ownerId === session.user.id;
  const share = record.shares[0];
  if (!isOwner && !share) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (typeof record.data !== 'object' || record.data === null || Array.isArray(record.data)) {
    return NextResponse.json({ error: 'Invalid tournament data' }, { status: 400 });
  }

  // Build a safe file prefix from the tournament name
  const safeName = (record.name || 'tournament')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  // Parse & compile tournament
  let tournament;
  try {
    tournament = await buildTournament(record.data as object);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to parse tournament: ${err instanceof Error ? err.message : 'unknown error'}` },
      { status: 500 },
    );
  }

  await tournament.setHtmlFilePrefix(safeName);

  // Single-page download: ?page=standings|individuals|games|teamdetail|playerdetail|rounds
  const pageKey = req.nextUrl.searchParams.get('page');
  if (pageKey) {
    const entry = PAGE_GENERATORS[pageKey];
    if (!entry) return NextResponse.json({ error: 'Unknown page' }, { status: 400 });
    const [pageEnum, generate] = entry;
    const html = await generate(tournament);
    const filename = `${safeName}_${StatReportFileNames[pageEnum]}`;
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // ZIP of all 6 pages
  const pages: [StatReportPages, () => Promise<string>][] = [
    [StatReportPages.Standings,     () => tournament.makeHtmlStandings()],
    [StatReportPages.Individuals,   () => tournament.makeHtmlIndividuals()],
    [StatReportPages.Scoreboard,    () => tournament.makeHtmlScoreboard()],
    [StatReportPages.TeamDetails,   () => tournament.makeHtmlTeamDetail()],
    [StatReportPages.PlayerDetails, () => tournament.makeHtmlPlayerDetail()],
    [StatReportPages.RoundReport,   () => tournament.makeHtmlRoundReport()],
  ];

  const zip = new JSZip();
  for (const [page, generate] of pages) {
    const html = await generate();
    zip.file(`${safeName}_${StatReportFileNames[page]}`, html);
  }

  const zipUint8 = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  const zipBuffer = Buffer.from(zipUint8);

  return new NextResponse(zipBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}_reports.zip"`,
    },
  });
}
