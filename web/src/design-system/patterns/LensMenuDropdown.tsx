import { useStore } from "../../state/store";
import { LENS_COLOR, LENS_ORDER } from "../../state/lensMeta";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../primitives/dropdownMenu";
import { ChevronsUpDown } from "../icons";

/**
 * Radix-backed bailout menu for the lens switcher. Kept in its own module so
 * the App shell does not pull the Radix menu tree into the initial bundle.
 */
export function LensMenuDropdown() {
  const { lens, setLens, catalog } = useStore();
  const current = catalog?.lenses[lens]?.label ?? lens;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Strategy lens: ${current}. Change lens`}
        className="inline-flex h-control max-w-44 items-center gap-1.5 rounded-control border border-default bg-surface2 px-2.5 text-body-sm text-primary"
      >
        <span className="h-2 shrink-0 rounded-pill" style={{ background: LENS_COLOR[lens] }} aria-hidden />
        <span className="truncate">{current}</span>
        <ChevronsUpDown size={13} aria-hidden className="shrink-0 text-tertiary" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Strategy lens</DropdownMenuLabel>
        {LENS_ORDER.map((id) => (
          <DropdownMenuItem
            key={id}
            aria-checked={id === lens}
            role="menuitemradio"
            onClick={() => setLens(id)}
          >
            <span className="h-2 w-2 shrink-0 rounded-pill" style={{ background: LENS_COLOR[id] }} aria-hidden />
            <span className="truncate">{catalog?.lenses[id]?.label ?? id}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
