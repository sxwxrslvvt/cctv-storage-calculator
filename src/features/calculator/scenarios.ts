import { newGroup, type Draft } from './config';

export const scenarios = [
  { id: 'home', name: 'Дом', count: '4', bitrate: '2', days: '14', capacity: '2', mode: 'continuous', start: '08:00', end: '20:00' },
  { id: 'shop', name: 'Магазин', count: '8', bitrate: '4', days: '30', capacity: '8', mode: 'daily', start: '08:00', end: '22:00' },
  { id: 'office', name: 'Офис', count: '12', bitrate: '3', days: '30', capacity: '12', mode: 'continuous', start: '08:00', end: '20:00' },
] as const;

export function scenarioDraft(scenario: typeof scenarios[number], groupId: string): Draft {
  return {
    groups: [{ ...newGroup(groupId), count: scenario.count, bitrateMbps: scenario.bitrate, mode: scenario.mode, start: scenario.start, end: scenario.end }],
    days: scenario.days, capacity: scenario.capacity, unit: 'TB',
  };
}
