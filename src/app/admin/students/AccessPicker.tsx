'use client';

export type AccessGroup = { label: string; items: { id: string; title: string }[] };

export default function AccessPicker({
  groups,
  selected,
  onToggle,
  disabled,
}: {
  groups: AccessGroup[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  const visible = groups.filter((g) => g.items.length > 0);

  if (visible.length === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground">
        No recordings, materials or live classes uploaded yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {visible.map((g) => (
        <fieldset key={g.label}>
          <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{g.label}</legend>
          <div className="space-y-2">
            {g.items.map((item) => (
              <label key={item.id} className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => onToggle(item.id)}
                  disabled={disabled}
                  className="size-4 rounded border-input accent-primary"
                />
                {item.title}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}