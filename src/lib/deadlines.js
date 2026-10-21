/**
 * Response deadlines.
 * SPDI Rules 2011, Rule 5(9) (in force): the Grievance Officer redresses grievances
 * "within one month from the date of receipt". DPDP Rules 2025, Rule 14(3) (from about
 * May 2027): a published period of at most 90 days.
 */

/** Same day next calendar month; clamps to the last day (31 Jan → 28/29 Feb). */
export const oneMonthAfter = (date) => {
  const result = new Date(date.getTime());
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
};

/** Grievance due date: the earlier of `days` days and one calendar month after receipt. */
export const grievanceDueDate = (receivedAt, days) => {
  const byDays = new Date(receivedAt.getTime() + days * 24 * 60 * 60 * 1000);
  const byMonth = oneMonthAfter(receivedAt);
  return byDays < byMonth ? byDays : byMonth;
};
