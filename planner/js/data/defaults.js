export const WEEKDAYS_UA = ["Понеділок","Вівторок","Середа","Четвер","Пʼятниця","Субота","Неділя"];

export function createDefaultState() {
  return {
    activeDayId: "day-1",
    days: [
      {
        id: "day-1",
        weekdayIndex: 0,
        createdAt: new Date().toISOString(),
        tasks: []
      }
    ],
    streak: 0,
    idealMuscles: {
      // пізніше наповниш: bench: { weight: 100, reps: 5 } ...
    }
  };
}
