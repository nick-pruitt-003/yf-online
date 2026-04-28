/** Unicode/ASCII code for uppercase 'A' */
const unicodeA = 65;

/** Unicode/ASCII code for uppercase 'Z' */
const unicodeZ = 90;

/** Add up the numbers in an array */
export function sumReduce(ary: number[]): number {
  return ary.reduce((sumSoFar, currVal) => sumSoFar + currVal, 0);
}

/** Get the nth letter of the alphabet (uppercase) */
export function getAlphabetLetter(num: number) {
  return String.fromCharCode(unicodeA + num - 1);
}

/** Split team name into org name + letter if possible, e.g. "Riverview A" -> ["Riverview", "A"] */
export function teamGetNameAndLetter(rawName: string): [string, string] {
  const lastIdx = rawName.length - 1;
  const penultimate = rawName.charAt(lastIdx - 1);
  if (penultimate !== ' ') {
    return [rawName, ''];
  }
  const letter = rawName.substring(lastIdx).toLocaleUpperCase();
  if (!isNormalTeamLetter(letter)) {
    return [rawName, ''];
  }
  const orgName = rawName.substring(0, lastIdx).trim();
  return [orgName, letter];
}

/** Is this a normal team designator? (A, B, C, etc.) */
function isNormalTeamLetter(letter: string) {
  if (letter.length !== 1) return false;
  const ascii = letter.charCodeAt(0);
  return ascii >= unicodeA && ascii <= unicodeZ;
}

/**
 * Is version a less than version b? Versions are 3-piece dot-delimited, e.g. '1.2.3'
 * @param  a    version string
 * @param  b    version string
 * @param  type precision to use for the comparison. Default: 'patch' (third piece)
 * @return      true if a is less than b
 */
export function versionLt(a: string, b: string, type?: 'major' | 'minor' | 'patch'): boolean {
  const aSplit = getVersionNumbers(a);
  const bSplit = getVersionNumbers(b);
  if (aSplit[0] !== bSplit[0]) {
    return aSplit[0] < bSplit[0];
  }
  if (type === 'major') {
    return false;
  }
  if (aSplit[1] !== bSplit[1]) {
    return aSplit[1] < bSplit[1];
  }
  if (type === 'minor') {
    return false;
  }
  return aSplit[2] < bSplit[2];
}

/** Convert a version string like '1.2.3' to an array of numbers */
function getVersionNumbers(versionString: string) {
  return versionString.split('.').map((val) => parseInt(val, 10));
}

/** Truncate a string to a desired length, appending an ellipsis if truncation was done */
export function trunc(s: string, size: number) {
  if (s.length <= size) return s;
  return `${s.substring(0, size).trim()}...`;
}
