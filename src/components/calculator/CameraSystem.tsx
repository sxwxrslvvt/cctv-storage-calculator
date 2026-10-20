import { Camera, Database, ArrowUpRight } from 'lucide-react';
import { type GroupDraft } from '../../features/calculator/config';

export function CameraSystem({ groups, selectedId, onSelect }: { groups: GroupDraft[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return <section className="panel camera-system" aria-labelledby="camera-system-title">
    <div className="analysis-heading"><div><p className="section-kicker">КОНФИГУРАЦИЯ В ОБЗОРЕ</p><h2 id="camera-system-title">Ваша система камер</h2></div><Camera size={22} aria-hidden="true" /></div>
    <div className="system-hub"><span><Database size={21} aria-hidden="true" /></span><div><strong>Видеоархив</strong><small>Групп: {groups.length} · выберите для настройки</small></div></div>
    <ul className="system-nodes" aria-label="Схема групп камер">{groups.map((group, index) => <li key={group.id}>
      <button type="button" className="system-node" aria-pressed={selectedId === group.id} onClick={() => {
        onSelect(group.id);
      }}><span className="node-camera"><svg viewBox="0 0 64 48" aria-hidden="true"><path d="M9 13h32l12 9-7 13H14L9 13Z" /><path d="m20 35-2 7H9M41 14l4-7h10M14 20h15" /><circle cx="40" cy="25" r="5" /></svg><b>×{group.count || '—'}</b></span><span className="node-caption"><strong>Группа {index + 1}</strong><small>{group.bitrateMbps || '—'} Mbps · {group.codec} · {group.resolution === 'custom' ? `${group.width}×${group.height}` : group.resolution}</small><small>{group.mode === 'continuous' ? '24/7' : `${group.start}–${group.end}`}</small></span><ArrowUpRight size={16} aria-hidden="true" /></button>
    </li>)}</ul>
    <p className="helper system-note">Схема параметров, не карта сети. Одна пиктограмма обозначает группу; количество указано рядом.</p>
  </section>;
}
