'use client';

import { useRef, useState, useCallback } from 'react';
import Tournament from '@/lib/yfdata/Tournament';
import Registration from '@/lib/yfdata/Registration';
import { Team } from '@/lib/yfdata/Team';
import { Player } from '@/lib/yfdata/Player';
import FileParser from '@/lib/yfdata/FileParsing';
import { collectRefTargets } from '@/lib/yfdata/QbjUtils2';
import type { IQbjTournament } from '@/lib/yfdata/Tournament';
import type { IQbjObject } from '@/lib/yfdata/Interfaces';

/** Parse a stored YFT JSON blob into a live Tournament object */
function deserialize(data: unknown): Tournament {
  const obj = data as IQbjTournament;
  const refTargets = collectRefTargets([obj as IQbjObject]);
  const parser = new FileParser(refTargets);
  return parser.parseTournament(obj);
}

/** Serialize a Tournament back to its JSON blob */
function serialize(t: Tournament): unknown {
  return t.toFileObject();
}

export interface TournamentHandle {
  /** Live Tournament DataModel object — read fields directly from this */
  tournament: Tournament;
  /** Apply a mutation to the tournament and mark dirty */
  update: (fn: (t: Tournament) => void) => void;
  /** Serialize the current state to JSON for saving */
  serialize: () => unknown;
  /** Whether there are unsaved changes */
  dirty: boolean;
  /** Clear the dirty flag (call after successful save) */
  clearDirty: () => void;
  /** Bump to force a re-render without a semantic mutation */
  version: number;
}

export function useTournament(initialData: unknown): TournamentHandle {
  const ref = useRef<Tournament | null>(null);
  if (ref.current === null) ref.current = deserialize(initialData);
  const [version, setVersion] = useState(0);
  const [dirty, setDirty] = useState(false);

  const update = useCallback((fn: (t: Tournament) => void) => {
    fn(ref.current!);
    setVersion((v) => v + 1);
    setDirty(true);
  }, []);

  const clearDirty = useCallback(() => setDirty(false), []);

  const serializeFn = useCallback(() => serialize(ref.current!), []);

  return {
    tournament: ref.current!,
    update,
    serialize: serializeFn,
    dirty,
    clearDirty,
    version,
  };
}

// ─── Team/Registration helpers ────────────────────────────────────────────────

export function addTeamToTournament(
  t: Tournament,
  orgName: string,
  teamName: string,
  playerNames: string[],
) {
  const team = new Team(teamName);
  team.players = playerNames
    .filter((n) => n.trim())
    .map((n) => {
      const p = new Player(n.trim());
      return p;
    });

  // Find or create registration for this org
  let reg = t.registrations.find((r) => r.name === orgName);
  if (!reg) {
    reg = new Registration(orgName, team);
    t.addRegistration(reg);
  } else {
    reg.addTeam(team);
  }
}

export function deleteTeamFromTournament(t: Tournament, team: Team) {
  for (const reg of t.registrations) {
    const idx = reg.teams.indexOf(team);
    if (idx !== -1) {
      reg.teams.splice(idx, 1);
      if (reg.teams.length === 0) {
        t.deleteRegistration(reg);
      }
      break;
    }
  }
}
