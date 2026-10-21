import { useStore } from "../../state/store";
import { downloadCsv, rankingsToCsv } from "../../state/export";
import { Button } from "../primitives/Button";
import { Download, Printer, Table2 } from "../icons";

export function ExportDialog({ onDone }: { onDone: () => void }) {
  const { counties, catalog, lens } = useStore();
  const exportCsv = () => {
    downloadCsv(`insurvas-rankings-${lens}.csv`, rankingsToCsv(counties, catalog, lens));
    onDone();
  };
  return (
    <div className="space-y-2">
      <p className="text-body text-secondary">
        Export the current view. Data is public; keep the source attribution.
      </p>
      <button
        type="button"
        onClick={exportCsv}
        className="flex w-full items-center gap-3 rounded-card border border-subtle px-3 py-3 text-left hover:bg-surface2"
      >
        <Table2 size={20} className="text-accenttext" aria-hidden />
        <span>
          <span className="block text-body text-primary">CSV</span>
          <span className="block text-caption text-tertiary">All counties and metric columns</span>
        </span>
        <Download size={16} className="ml-auto text-tertiary" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="flex w-full items-center gap-3 rounded-card border border-subtle px-3 py-3 text-left hover:bg-surface2"
      >
        <Printer size={20} className="text-accenttext" aria-hidden />
          <span>
            <span className="block text-body text-primary">Print / PDF</span>
            <span className="block text-caption text-tertiary">Light-only market brief layout</span>
          </span>
          <Printer size={16} className="ml-auto text-tertiary" aria-hidden />
      </button>
      <div className="pt-2 text-right">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
