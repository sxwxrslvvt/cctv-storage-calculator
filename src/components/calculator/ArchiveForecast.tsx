import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { ChartNoAxesCombined } from 'lucide-react';
import { fromBytes, UNITS, type calculate, type StorageUnit } from '../../domain/storage/calculator';
import { forecastBytes, forecastFillDay } from '../../features/calculator/forecast';
import { formatNumber as format } from '../../lib/format';
import { ru } from '../../lib/ru';

interface Props { result: ReturnType<typeof calculate>; days: number; availableBytes: number; unit: StorageUnit }
const axisFormat = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumSignificantDigits: 3 });

export function ArchiveForecast({ result, days, availableBytes, unit }: Props) {
  const id = useId();
  const svg = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(608);
  useEffect(() => {
    if (!svg.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const next = entries[0]?.contentRect.width;
      if (next) setWidth(next);
    });
    observer.observe(svg.current);
    return () => observer.disconnect();
  }, []);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const day = Math.min(selectedDay ?? days, days);
  const bytes = forecastBytes(result, days, day);
  const fillDay = forecastFillDay(result, days);
  const max = Math.max(result.totalBytes, availableBytes) || UNITS[unit];
  const right = Math.max(100, width - 24);
  const x = (value: number) => 72 + value / days * (right - 72);
  const y = (value: number) => 218 - value / max * 168;
  const endY = y(result.totalBytes);
  const capacityY = y(availableBytes);
  const text = `${ru.forecastDay} ${format(day, 0)}: ${format(fromBytes(bytes, unit))} ${unit}`;
  const tooltipWidth = Math.min(260, width - 16);
  const tooltipX = Math.max(8, Math.min(width - tooltipWidth - 8, x(day) - tooltipWidth / 2));
  function selectPoint(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = (event.clientX - bounds.left) / bounds.width * width;
    setSelectedDay(Math.round(Math.min(days, Math.max(0, (position - 72) / (right - 72) * days))));
  }
  return <section className="panel forecast-panel" aria-labelledby={`${id}-title`}>
    <div className="analysis-heading"><div><p className="section-kicker">{ru.archivePlanning}</p><h2 id={`${id}-title`}>{ru.forecastTitle}</h2></div><ChartNoAxesCombined size={21} aria-hidden="true" /></div>
    <div className="chart-legend"><span><i className="legend-archive" />{ru.archiveVolume}</span><span><i className="legend-capacity" />{ru.availableHdd}</span><span className="chart-unit">{unit}</span></div>
    <svg ref={svg} className="forecast-svg" viewBox={`0 0 ${width} 264`} role="img" aria-labelledby={`${id}-title ${id}-description`}
      onPointerMove={event => { if (event.pointerType === 'mouse' || event.buttons) selectPoint(event); }} onPointerDown={selectPoint}>
      <desc id={`${id}-description`}>{ru.forecastModel} {ru.archiveFor} {days} {ru.dayUnit}: {format(fromBytes(result.totalBytes, unit))} {unit}. {ru.availableHdd}: {format(fromBytes(availableBytes, unit))} {unit}.</desc>
      <defs><linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".22" /><stop offset="100%" stopColor="currentColor" stopOpacity=".02" /></linearGradient></defs>
      {[0, 0.5, 1].map(fraction => <g key={fraction}><line className="chart-gridline" x1="72" x2={right} y1={y(max * fraction)} y2={y(max * fraction)} /><text className="chart-axis" x="60" y={y(max * fraction) + 4} textAnchor="end">{axisFormat.format(fromBytes(max * fraction, unit))}</text></g>)}
      <path className="chart-area" fill={`url(#${id}-area)`} d={`M72,218 L${right},${endY} L${right},218 Z`} />
      <line key={`capacity-${availableBytes}`} className="chart-capacity" x1="72" x2={right} y1={capacityY} y2={capacityY} data-testid="capacity-line" />
      <path key={`archive-${result.totalBytes}`} className="chart-line" d={`M72,218 L${right},${endY}`} />
      {[0, days / 2, days].map(point => <circle key={point} className="chart-waypoint" cx={x(point)} cy={y(forecastBytes(result, days, point))} r="3" />)}
      {fillDay !== null && <g className="chart-fill-marker" data-testid="fill-marker"><circle cx={x(fillDay)} cy={capacityY} r="6" /><title>{ru.diskFills}: {format(fillDay, 2)} {ru.dayUnit}</title></g>}
      <line className="chart-cursor" x1={x(day)} x2={x(day)} y1="42" y2="218" />
      <circle className="chart-current" cx={x(day)} cy={y(bytes)} r="5" />
      <g aria-hidden="true"><rect className="chart-tooltip" x={tooltipX} y="3" width={tooltipWidth} height="29" rx="7" /><text className="chart-tooltip-text" x={tooltipX + tooltipWidth / 2} y="22" textAnchor="middle">{day} {ru.dayUnit} · ≈{axisFormat.format(fromBytes(bytes, unit))} {unit}</text></g>
      {(width < 360 ? [0, days] : [0, days / 2, days]).map(value => <text key={value} className="chart-axis" x={x(value)} y="246" textAnchor="middle">{format(value, 1)} {ru.dayUnit}</text>)}
    </svg>
    <div className="forecast-readout"><span>{ru.forecastDay} {day}</span><strong data-testid="forecast-volume">{format(fromBytes(bytes, unit))} {unit}</strong></div>
    <label className="forecast-control"><span className="sr-only">{ru.forecastDay}</span><input type="range" min="0" max={days} step="1" value={day} aria-valuetext={text} onChange={event => setSelectedDay(Number(event.target.value))} /></label>
    <p className="forecast-summary" data-testid="forecast-summary">{result.retention.kind === 'unbounded' ? ru.zeroRate : fillDay !== null ? `${ru.diskFills}: ${format(fillDay, 2)} ${ru.dayUnit}` : ru.diskBeyond}</p>
    <p className="helper forecast-model">{ru.forecastModel}</p>
  </section>;
}
