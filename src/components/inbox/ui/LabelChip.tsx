"use client";

import "./_css/LabelChip.css";

type LabelChipProps = {
  name: string;
  color: string;
  onRemove?: () => void;
};

export default function LabelChip({ name, color, onRemove }: LabelChipProps) {
  return (
    <span className="ev-label-chip">
      <span
        className="ev-label-chip__dot"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="ev-label-chip__name">{name}</span>
      {onRemove && (
        <button
          type="button"
          className="ev-label-chip__remove"
          onClick={onRemove}
          aria-label={`Retirer le libellé ${name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
