import { describe, expect, it } from 'vitest';
import { evaluate } from './config';
import { scenarioDraft, scenarios } from './scenarios';

describe('example scenarios', () => {
  it.each([
    [0, 4n, 2000000n, 86400n, 14n],
    [1, 8n, 4000000n, 50400n, 30n],
    [2, 12n, 3000000n, 86400n, 30n],
  ] as const)('scenario %i agrees with an independent byte calculation', (index, count, bitrate, seconds, days) => {
    const draft = scenarioDraft(scenarios[index]!, 'example');
    const { result, errors } = evaluate(draft);
    expect(errors).toEqual({});
    expect(result?.totalBytes).toBe(Number(count * bitrate * seconds * days / 8n));
    expect(result?.cameraCount).toBe(Number(count));
    expect(draft.groups[0]?.id).toBe('example');
  });
});
