import { IQbjObject, IYftDataModelObject, IYftFileObject } from './Interfaces';
 
import { Match } from './Match';
 
import { IQbjPoolTeam, PoolTeam } from './PoolTeam';
import { QbjTypeNames } from './QbjEnums';
import { Team } from './Team';

/** How do we rank teams to determine who goes where in the next phase?
 *  This isn't used right now.
 */
enum AutoQualificationRankRules {
  /** Break ties at the buzzer if same record */
  RecordThenTB = 'RecordThenTB',
  /** Use PPG as tiebreaker, then break PPG ties at the buzzer */
  RecordThenPPGThenTB = 'RecordThenPPGThenTB',
  /** Use PPG as tiebreaker. If same PPG, use something other than TB games (powers, coin flip, etc.) */
  RecordThenPPGThenOther = 'RecordThenPPGThenOther',
}

const defaultAutoQualRankRule = AutoQualificationRankRules.RecordThenPPGThenOther;

/** One tier of the next phase that teams in a pool might advance to. */
interface AdvancementOpportunity {
  /** Which tier (pool position) in the next phase do we move teams to? */
  tier: number;
  /** Which rankings within the pool advance to the given tier? */
  ranksThatAdvance: number[];
  /** How do we rank teams to determine who goes where in the next phase? */
  rankingRule: AutoQualificationRankRules;
}

/** A group of teams, e.g. a single prelim bracket */
export interface IQbjPool extends IQbjObject {
  /** name of the pool */
  name: string;
  /** Further info about the pool */
  description?: string;
  /** The position/rank/tier of this Pool among all Pool objects used for its Phase. Need not be unique (e.g. in the case of parallel pools) */
  position?: number;
  /** The assignments of teams to pools for this phase */
  poolTeams?: IQbjPoolTeam[];
}

/** Pool object as written to a .yft file */
export interface IYftFilePool extends IQbjPool, IYftFileObject {
  YfData: IPoolExtraData;
}

/** Additional info not in qbj but needed for a .yft file */
interface IPoolExtraData {
  size: number;
  roundRobins: number;
  seeds: number[];
  hasCarryover: boolean;
  feederPools?: IQbjPool;
  autoAdvanceRules: AdvancementOpportunity[];
}

export class Pool implements IQbjPool, IYftDataModelObject {
  name: string = '';

  description: string = '';

  position: number;

  poolTeams: PoolTeam[] = [];

  /** The number of teams this pool is supposed to have. poolTeams might have fewer than this if
   * the user hasn't entered all teams yet */
  size: number;

  /** How many round robins does this pool play? This should usually be 1, but can be more.
   *  0 means we don't expect every team to play every other team, e.g. a consolation bracket
   *  with an unusual number of teams playing arbitrary matchups. If teams need to carry over
   *  games from the previous phase to complete the round robin, it still counts as a round robin.
   */
  roundRobins: number = 1;

  /** Numbered seeds this bracket contains, in ascending order. e.g. a 16-team tournament might have
   *  [1, 4, 5, 8, 9, 12, 13, 16] as the seeds of one of its prelim pools.
   */
  seeds: number[] = [];

  /** Does this pool carry over games from the previous phase? */
  hasCarryover: boolean = false;

  /** Which ranks automatically go to which tiers in the next phase?
   *  Wild card situations are specified at the Phase level, not here.
   */
  autoAdvanceRules: AdvancementOpportunity[] = [];

  sizeValidationError: string = '';

  get id(): string {
    return `Pool_${this.name}`;
  }

  constructor(
    size: number,
    position: number,
    name?: string,
    hasCarryOver?: boolean,
    firstSeed?: number,
    lastSeed?: number,
  ) {
    this.position = position;
    this.size = size;
    this.hasCarryover = hasCarryOver ?? false;
    if (name) this.name = name;
    if (firstSeed && lastSeed) this.setSeedRange(firstSeed, lastSeed);
  }

  toFileObject(qbjOnly = false, isTopLevel = false, isReferenced = false): IQbjPool {
    const qbjObject: IQbjPool = {
      name: this.name,
      description: this.description || undefined,
      position: this.position,
      poolTeams: this.poolTeams.map((pt) => pt.toFileObject(qbjOnly)),
    };
    if (isTopLevel) qbjObject.type = QbjTypeNames.Pool;
    if (isReferenced) qbjObject.id = this.id;

    if (qbjOnly) return qbjObject;

    // TODO: feeder pools?
    const yfData: IPoolExtraData = {
      size: this.size,
      roundRobins: this.roundRobins,
      seeds: this.seeds,
      hasCarryover: this.hasCarryover,
      autoAdvanceRules: this.autoAdvanceRules,
    };
    const yftFileObj = { YfData: yfData, ...qbjObject };

    return yftFileObj;
  }

  /** Set this pool's seeds to the given range of numbers */
  setSeedRange(firstSeed: number, lastSeed: number) {
    if (firstSeed > lastSeed) return;
    this.seeds = [];
    for (let i = firstSeed; i <= lastSeed; i++) {
      this.seeds.push(i);
    }
  }

  hasAnyTeams() {
    return this.poolTeams.length > 0;
  }

  addTeam(team: Team) {
    this.poolTeams.push(new PoolTeam(team));
    this.validateSize();
  }

  removeTeam(team: Team) {
    this.poolTeams = this.poolTeams.filter((pt) => pt.team !== team);
    this.validateSize();
  }

  clearTeams() {
    this.poolTeams = [];
    this.validateSize();
  }

  validateSize() {
    if (this.poolTeams.length > this.size) {
      this.sizeValidationError = `This pool's size exceeds its expected size of ${this.size}. You must correct this error before entering games.`;
      return;
    }
    this.sizeValidationError = '';
  }

  /** Is this team in this pool? */
  includesTeam(team: Team) {
    return !!this.getPoolTeam(team);
  }

  getPoolTeam(team: Team) {
    return this.poolTeams.find((pt) => pt.team === team);
  }

  /** Given a rank, which numbered tier does that rank advance tom if any? Returns undefined if
   *  the rank advances based on wild card rules.
   */
  getTierThatRankAdvancesTo(rank: number): number | undefined {
    const aoWithRank = this.autoAdvanceRules.find((ao) => ao.ranksThatAdvance.includes(rank));
    if (!aoWithRank) return undefined;
    return aoWithRank.tier;
  }

  /** The 1-indexed seed number assigned to a team of this rank within the pool. Return -1 if the
   * rank is out of bounds (including if the rank advances based on wild card rules)
   */
  getSeedForRank(rank: number): number | undefined {
    return this.seeds[rank - 1] ?? undefined;
  }

  /** Is at least one of the match's teams in this pool? */
  matchIsRelevant(match: Match) {
    const leftTeam = match.leftTeam.team;
    const rightTeam = match.rightTeam.team;
    if (leftTeam && this.includesTeam(leftTeam)) return true;
    if (rightTeam && this.includesTeam(rightTeam)) return true;
    return false;
  }

  /** Discard information that we only want to track if we're using a schedule template */
  unlockCustomSchedule() {
    this.seeds = [];
    this.autoAdvanceRules = [];
  }
}

export function setAutoAdvanceRules(pool: Pool, autoQualChunks: number[]) {
  pool.autoAdvanceRules = [];
  let tier = 0;
  let curRank = 1;
  for (const c of autoQualChunks) {
    tier++;
    if (c === 0) continue;

    const ranksThatAdvance = [];
    for (let j = 1; j <= c; j++) {
      ranksThatAdvance.push(curRank);
      curRank++;
    }
    pool.autoAdvanceRules.push({
      tier,
      ranksThatAdvance,
      rankingRule: defaultAutoQualRankRule,
    });
  }
}

