export type BillingInterval = 'MONTHLY' | 'YEARLY';

/**
 * Calculates the next renewal date given a start/current period date and billing interval.
 * Safely handles month boundary overflows (e.g. Jan 31 -> Feb 28).
 */
export function calculateNextRenewalDate(
  startDate: Date,
  interval: BillingInterval
): Date {
  const result = new Date(startDate.getTime());

  if (interval === 'MONTHLY') {
    const currentMonth = result.getMonth();
    const currentDay = result.getDate();

    // Advance month
    result.setMonth(currentMonth + 1);

    // If month jumped ahead by more than 1 (e.g. Jan 31 -> Mar 2/3), adjust to last day of target month
    if (result.getMonth() !== (currentMonth + 1) % 12) {
      result.setDate(0); // Sets to last day of previous month
    } else {
      // Ensure date didn't overflow
      const maxDaysInNewMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
      if (currentDay > maxDaysInNewMonth) {
        result.setDate(maxDaysInNewMonth);
      }
    }
  } else if (interval === 'YEARLY') {
    result.setFullYear(result.getFullYear() + 1);
  }

  return result;
}

/**
 * Checks whether a period has passed current time.
 */
export function isSubscriptionExpired(periodEnd: Date): boolean {
  return Date.now() > periodEnd.getTime();
}

/**
 * Computes live subscription status based on current date.
 */
export function computeSubscriptionStatus(sub: {
  status: string;
  currentPeriodEnd: Date;
}): string {
  if (sub.status === 'ACTIVE' && isSubscriptionExpired(sub.currentPeriodEnd)) {
    return 'EXPIRED';
  }
  return sub.status;
}
