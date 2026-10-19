import { describe, expect, it } from 'vitest';
import { defaults, evaluate, parseNumber } from './config';

describe('form boundary', () => {
  it.each(['', ' ', '-1', 'NaN', 'Infinity', '1e3', '0x10', '4foo', '.5'])('rejects non-supported input %s', value => {
    expect(() => parseNumber(value)).toThrow();
  });
  it('parses decimal separators without coercing empty input to zero', () => {
    expect(parseNumber('1,25')).toBe(1.25);
    expect(parseNumber('1.25')).toBe(1.25);
    expect(parseNumber('0')).toBe(0);
  });
  it('does not return a stale result when any field is invalid', () => {
    const draft = defaults();
    draft.days = '';
    draft.capacity = '-1';
    draft.groups[0].count = '0.5';
    draft.groups[0].bitrateMbps = '0.0001';
    const evaluation = evaluate(draft);
    expect(evaluation.result).toBeNull();
    expect(Object.keys(evaluation.errors).sort()).toEqual(['1.bitrateMbps', '1.count', 'capacity', 'days']);
  });
  it('rejects unsupported capacity, dimensions and combined byte limit', () => {
    const draft = defaults();
    draft.capacity = '1001';
    expect(evaluate(draft).errors.capacity).toBeTruthy();
    draft.capacity = '1';
    draft.groups[0].width = '0';
    expect(evaluate(draft).errors['1.width']).toBeTruthy();
    draft.groups[0].width = '1920';
    draft.groups[0].count = '10000';
    draft.groups[0].bitrateMbps = '1000';
    expect(evaluate(draft).errors.total).toBeTruthy();
  });
});
