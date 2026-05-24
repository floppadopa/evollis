"use client";

import "./_css/InboxSearch.css";

type InboxSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function InboxSearch({
  value,
  onChange,
  placeholder = "Rechercher une conversation…",
}: InboxSearchProps) {
  return (
    <div className="inbox-search">
      {/* Magnifier icon */}
      <span className="inbox-search__icon" aria-hidden="true">
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="6.5"
            cy="6.5"
            r="5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <line
            x1="10.354"
            y1="10.354"
            x2="14.5"
            y2="14.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <input
        className="inbox-search__input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />

      {value && (
        <button
          className="inbox-search__clear"
          type="button"
          aria-label="Effacer la recherche"
          onClick={() => onChange("")}
        >
          ×
        </button>
      )}
    </div>
  );
}
