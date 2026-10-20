import { Building2, House, Store, ArrowUpRight } from 'lucide-react';
import { scenarios } from '../../features/calculator/scenarios';

const icons = [House, Store, Building2];

export function ScenarioPresets({ selected, onSelect }: { selected: string | null; onSelect: (scenario: typeof scenarios[number]) => void }) {
  return <section className="scenarios" aria-labelledby="scenarios-title">
    <div className="workspace-intro"><div><p className="section-kicker">ОТ ПРИМЕРА К ВАШЕЙ СИСТЕМЕ</p><h2 id="scenarios-title">Начните со своего сценария</h2></div><p>Примеры заменяют текущие параметры.<br />Битрейт подберите по вашей камере.</p></div>
    <div className="scenario-grid">{scenarios.map((scenario, index) => {
      const Icon = icons[index]!;
      return <button key={scenario.id} type="button" className="scenario-card" aria-pressed={selected === scenario.id} onClick={() => onSelect(scenario)}>
        <span className="scenario-icon"><Icon size={23} aria-hidden="true" /></span><span className="scenario-copy"><strong>{scenario.name}</strong><span>Камер: {scenario.count} · {scenario.bitrate} Mbps · {scenario.days} дн.</span><small>H.265 · 1080p · {scenario.mode === 'continuous' ? '24/7' : `${scenario.start}–${scenario.end}`} · HDD {scenario.capacity} TB</small></span><ArrowUpRight size={18} aria-hidden="true" />
      </button>;
    })}</div>
  </section>;
}
