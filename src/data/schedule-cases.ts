import { WEEKDAY, type WeekdayName } from '../helpers/dates';

/**
 * The example habits include two weekday-only ones ("Two hours of focused work or study" and
 * "No procrastinating on the main task"). So Saturday and Sunday show fewer habits.
 */
export const SCHEDULE_CASES: ReadonlyArray<{
  day: WeekdayName;
  weekday: number;
  dos: number;
  donts: number;
  hidden: number;
}> = [
  { day: 'Mon', weekday: WEEKDAY.Mon, dos: 6, donts: 4, hidden: 0 },
  { day: 'Wed', weekday: WEEKDAY.Wed, dos: 6, donts: 4, hidden: 0 },
  { day: 'Fri', weekday: WEEKDAY.Fri, dos: 6, donts: 4, hidden: 0 },
  { day: 'Sat', weekday: WEEKDAY.Sat, dos: 5, donts: 3, hidden: 2 },
  { day: 'Sun', weekday: WEEKDAY.Sun, dos: 5, donts: 3, hidden: 2 },
];
