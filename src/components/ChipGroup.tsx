"use client";

/** 1つだけ選べるチップ。選択中をもう一度押すと解除 */
export function SingleChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <div className="row">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          className="chip"
          aria-pressed={value === o}
          onClick={() => onChange(value === o ? null : o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** 複数選べるチップ */
export function MultiChips({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="row">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            type="button"
            key={o}
            className="chip"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
