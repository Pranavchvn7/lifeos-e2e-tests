/**
 * Data-driven scoring cases for the example habits on a weekday (6 do's, 4 don'ts).
 * Score = average of (do's done / 6) and (don'ts avoided / 4), rounded to a whole percent.
 */
export const SCORE_CASES = [
  { dos: 0, donts: 0, expected: '0%' },
  { dos: 3, donts: 2, expected: '50%' },
  { dos: 4, donts: 4, expected: '83%' },
  { dos: 5, donts: 3, expected: '79%' },
  { dos: 6, donts: 3, expected: '88%' },
  { dos: 6, donts: 4, expected: '100%' },
] as const;
