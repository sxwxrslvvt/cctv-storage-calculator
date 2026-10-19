import { describe, expect, it } from 'vitest';
import { defaults, evaluate, parseNumber, type GroupDraft } from './config';

describe('form boundary', () => {
  it.each(['1.0000000000000001', '0.00000000000000000000000000000001'])('rejects fractional integer fields before number rounding: %s', value => {
    const draft = defaults();
    draft.groups[0].count = value;
    draft.days = value;
    expect(evaluate(draft).errors['1.count']).toBeTruthy();
    expect(evaluate(draft).errors.days).toBeTruthy();
  });
  it.each(['1.0000000000000001', `0.${'0'.repeat(323)}1`])('rejects excessive bitrate precision before rounding or underflow: %s', value => {
    const draft = defaults();
    draft.groups[0].bitrateMbps = value;
    expect(evaluate(draft).errors['1.bitrateMbps']).toBeTruthy();
  });
  it('accepts trailing decimal zeros and valid custom dimensions', () => {
    const draft = defaults();
    draft.groups[0] = { ...draft.groups[0], count: '4.000', bitrateMbps: '4.123000', resolution: 'custom', width: '1', height: '16384' };
    expect(evaluate(draft).result).not.toBeNull();
  });
  it.each(['1.', '1,', '-', '.', ','])('keeps incomplete input %s invalid without throwing', value => {
    const draft = defaults();
    draft.capacity = value;
    expect(evaluate(draft).result).toBeNull();
    expect(evaluate(draft).errors.capacity).toBeTruthy();
  });
  it('rejects unknown modes, codecs and resolution names', () => {
    const draft = defaults();
    draft.groups[0].mode = 'weekly' as GroupDraft['mode'];
    draft.groups[0].codec = 'AV1' as GroupDraft['codec'];
    draft.groups[0].resolution = 'unknown' as GroupDraft['resolution'];
    const evaluation = evaluate(draft);
    expect(evaluation.result).toBeNull();
    expect(evaluation.errors['1.schedule']).toBeTruthy();
    expect(evaluation.errors['1.codec']).toBeTruthy();
    expect(evaluation.errors['1.resolution']).toBeTruthy();
  });
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
