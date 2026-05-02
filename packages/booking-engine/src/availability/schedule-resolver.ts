import type {
  ResolvedScheduleDay,
  ScheduleDefinition,
  ScheduleRule,
} from '../domain/models.ts';
import type { ISODate, LocalTimeWindow } from '../domain/value-objects.ts';
import {
  getDayOfWeek,
  mergeLocalWindows,
  parseTimeOfDay,
  subtractLocalWindows,
} from '../shared/time.ts';

export function resolveScheduleDay(
  schedule: ScheduleDefinition,
  date: ISODate,
  timezoneOverride?: string,
): ResolvedScheduleDay {
  const dayOfWeek = getDayOfWeek(date);
  const timezone = timezoneOverride ?? schedule.timezone;

  const weeklyAvailable = selectRuleWindows(
    schedule.rules.filter(
      (rule) => rule.dayOfWeek === dayOfWeek && rule.isAvailable,
    ),
  );
  const weeklyUnavailable = selectRuleWindows(
    schedule.rules.filter(
      (rule) => rule.dayOfWeek === dayOfWeek && !rule.isAvailable,
    ),
  );

  const baseWindows = subtractLocalWindows(weeklyAvailable, weeklyUnavailable);

  const specificAvailable = selectRuleWindows(
    schedule.rules.filter(
      (rule) => rule.specificDate === date && rule.isAvailable,
    ),
  );
  const specificUnavailable = selectRuleWindows(
    schedule.rules.filter(
      (rule) => rule.specificDate === date && !rule.isAvailable,
    ),
  );

  const withSpecificAdds = mergeLocalWindows([
    ...baseWindows,
    ...specificAvailable,
  ]);
  const resolvedWindows = subtractLocalWindows(
    withSpecificAdds,
    specificUnavailable,
  );

  return {
    appointmentTypeId: schedule.appointmentTypeId,
    date,
    timezone,
    windows: resolvedWindows,
  };
}

function selectRuleWindows(rules: readonly ScheduleRule[]): LocalTimeWindow[] {
  return rules.flatMap((rule) => {
    const startMinutes = parseTimeOfDay(rule.startTime);
    const endMinutes = parseTimeOfDay(rule.endTime);

    if (endMinutes <= startMinutes) {
      return [];
    }

    return [{ startMinutes, endMinutes }];
  });
}
