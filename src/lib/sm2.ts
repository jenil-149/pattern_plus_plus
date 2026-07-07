export interface SM2Input {
  quality: number;
  repetitions: number;
  easinessFactor: number;
  interval: number;
}

export interface SM2Output {
  repetitions: number;
  easinessFactor: number;
  interval: number;
  nextReviewDate: Date;
}

/**
 * Calculates the next repetitions, easiness factor, interval, and next review date
 * using the SuperMemo-2 (SM-2) Spaced Repetition Algorithm.
 * 
 * @param input The current SM-2 status and response quality
 * @returns The updated SM-2 status and calculated next review date
 */
export function calculateSM2({
  quality,
  repetitions,
  easinessFactor,
  interval,
}: SM2Input): SM2Output {
  let nextRepetitions: number;
  let nextInterval: number;

  if (quality >= 3) {
    nextRepetitions = repetitions + 1;
    if (nextRepetitions === 1) {
      nextInterval = 6;
    } else if (nextRepetitions === 2) {
      nextInterval = 10;
    } else {
      nextInterval = Math.round(interval * easinessFactor);
    }
  } else {
    nextRepetitions = 0;
    nextInterval = 1;
  }

  // Update Easiness Factor (EF)
  // Formula: EF' = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  const factorDiff = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  let nextEasinessFactor = easinessFactor + factorDiff;

  // Clamp EF to minimum 1.3
  if (nextEasinessFactor < 1.3) {
    nextEasinessFactor = 1.3;
  }

  // Calculate next review date: current date + interval days
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
  nextReviewDate.setHours(0, 0, 0, 0);

  return {
    repetitions: nextRepetitions,
    easinessFactor: Number(nextEasinessFactor.toFixed(2)),
    interval: nextInterval,
    nextReviewDate,
  };
}
