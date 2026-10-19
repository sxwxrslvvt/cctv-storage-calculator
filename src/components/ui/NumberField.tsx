interface Props {
  id: string; label: string; value: string; onChange: (value: string) => void;
  error?: string; hint?: string; integer?: boolean;
}
export function NumberField({ id, label, value, onChange, error, hint, integer }: Props) {
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <input id={id} type="text" inputMode={integer ? 'numeric' : 'decimal'} value={value}
      onChange={e => onChange(e.target.value)} autoComplete="off" spellCheck={false}
      aria-invalid={!!error} aria-describedby={error || hint ? `${id}-help` : undefined} />
    {(error || hint) && <span id={`${id}-help`} className={error ? 'error' : 'helper'} role={error ? 'alert' : undefined}>{error || hint}</span>}
  </div>;
}
