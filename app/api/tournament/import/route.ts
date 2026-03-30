import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isOldYftFile, parseOldYfFile } from '@/lib/yfdata/OldYfParsing';
import FileParser from '@/lib/yfdata/FileParsing';
import { collectRefTargets } from '@/lib/yfdata/QbjUtils2';
import type { IQbjTournament } from '@/lib/yfdata/Tournament';
import type { IQbjObject } from '@/lib/yfdata/Interfaces';
import { QbjTypeNames } from '@/lib/yfdata/QbjEnums';
import Tournament from '@/lib/yfdata/Tournament';

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let fileContents: unknown;
  try {
    ({ fileContents } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (typeof fileContents !== 'string' || !fileContents.trim()) {
    return NextResponse.json({ error: 'Expected fileContents string' }, { status: 400 });
  }

  let tournament: Tournament;

  if (isOldYftFile(fileContents)) {
    // v3 format: newline-delimited JSON (6 sections)
    try {
      tournament = parseOldYfFile(fileContents);
    } catch (err) {
      return NextResponse.json(
        { error: `Failed to parse v3 .yft file: ${err instanceof Error ? err.message : 'unknown error'}` },
        { status: 400 },
      );
    }
  } else {
    // v4 format: single QBJ JSON object
    let parsed: unknown;
    try {
      parsed = JSON.parse(fileContents);
    } catch {
      return NextResponse.json({ error: 'File is not valid JSON. Make sure it is a .yft file.' }, { status: 400 });
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Invalid .yft data' }, { status: 400 });
    }
    try {
      // v4 files are either a single tournament object OR a QBJ wrapper { version, objects: [...] }
      let tournObj: IQbjTournament;
      let objectList: IQbjObject[];
      if (
        typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) &&
        'objects' in parsed && Array.isArray((parsed as Record<string, unknown>).objects)
      ) {
        // QBJ multi-object format: { version, objects: [...] }
        objectList = (parsed as { objects: IQbjObject[] }).objects;
        const found = objectList.find((o) => o.type === QbjTypeNames.Tournament) as IQbjTournament | undefined;
        if (!found) throw new Error('No Tournament object found in file');
        tournObj = found;
      } else {
        // Single tournament object (yf-online internal format)
        tournObj = parsed as IQbjTournament;
        objectList = [tournObj as IQbjObject];
      }
      const refTargets = collectRefTargets(objectList);
      const parser = new FileParser(refTargets);
      tournament = parser.parseTournament(tournObj);
    } catch (err) {
      return NextResponse.json(
        { error: `Failed to parse v4 .yft file: ${err instanceof Error ? err.message : 'unknown error'}` },
        { status: 400 },
      );
    }
  }

  const name = tournament.name?.trim() || 'Imported Tournament';
  const data = tournament.toFileObject();

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
