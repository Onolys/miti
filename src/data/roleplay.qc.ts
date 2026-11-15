import { summarize, type GlobalKey } from '../lib/miti';
import { roleplay } from './roleplay';

export interface QcData {
  coderGlobals: Record<GlobalKey, 1 | 2 | 3 | 4 | 5>;
  coderCRCount: number;
  coderExtraCR: number[];
  flags: QcFlag[];
}

export interface QcFlag {
  id: string;
  kind: 'global' | 'code';
  label: string;
  coder: number;
  supported: number;
  status: 'flagged';
  note: string;
  cites: number[];
  range?: [number, number];
  missed?: number[];
}

const summary = summarize(roleplay);
const empathy = roleplay.globals.find(({ key }) => key === 'EMPATHY');
const missedConcern = empathy?.missedLines?.[0];
if (!empathy || missedConcern === undefined) {
  throw new Error('The QC example requires an Empathy rating and a missed concern.');
}

const previousCR = Math.max(...summary.linesByCode.CR.filter((n) => n < missedConcern));
const nextCR = Math.min(...summary.linesByCode.CR.filter((n) => n > missedConcern));
if (!Number.isFinite(previousCR) || !Number.isFinite(nextCR)) {
  throw new Error('The QC example requires complex reflections around the missed concern.');
}
const range: [number, number] = [previousCR + 1, nextCR - 1];
const coderGlobals: QcData['coderGlobals'] = { CCT: 3, SST: 4, PARTNERSHIP: 4, EMPATHY: 5 };
const coderCRCount = 7;
const coderExtraCR = [59];

// These invented coder scores are checked against the shared fictional session.
// Supported values and evidence text follow that session's actual data.
export const qcData: QcData = {
  coderGlobals,
  coderCRCount,
  coderExtraCR,
  flags: [
    {
      id: 'empathy',
      kind: 'global',
      label: 'Empathy',
      coder: coderGlobals.EMPATHY,
      supported: empathy.score,
      status: 'flagged',
      note: `No complex reflections at lines ${range[0]}-${range[1]}; line ${missedConcern} concern missed.`,
      cites: roleplay.lines.filter(({ n }) => n >= range[0] && n <= range[1]).map(({ n }) => n),
      range,
      missed: [missedConcern],
    },
    {
      id: 'complex-reflections',
      kind: 'code',
      label: 'Complex reflections',
      coder: coderCRCount,
      supported: summary.counts.CR,
      status: 'flagged',
      note: `Line ${coderExtraCR[0]} counted as a complex reflection; the session shows none there.`,
      cites: [...coderExtraCR],
    },
  ],
};
