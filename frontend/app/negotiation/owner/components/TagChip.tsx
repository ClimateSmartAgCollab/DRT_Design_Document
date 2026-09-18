"use client";

export function nextTagSelection(selected: string[], tag: string): string[] {
  return selected.includes(tag)
    ? selected.filter((value) => value !== tag)
    : [...selected, tag];
}

const CHIP_BASE =
  "inline-block text-xs font-semibold px-2 py-0.5 rounded-full border border-[rgb(55,125,28)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[rgb(70,160,35)] focus:ring-offset-1";

export function TagChip({
  tag,
  pressed,
  onToggle,
}: {
  tag: string;
  pressed: boolean;
  onToggle: (tag: string) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={`${pressed ? "Remove" : "Add"} tag filter ${tag}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle(tag);
      }}
      className={
        pressed
          ? `${CHIP_BASE} bg-[rgb(70,160,35)] text-white`
          : `${CHIP_BASE} bg-[rgba(180,230,160,0.3)] text-[rgb(55,125,28)] hover:bg-[rgba(180,230,160,0.55)]`
      }
    >
      {tag}
    </button>
  );
}
