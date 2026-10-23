import { useRef } from "react";
import { Modal } from "./Modal";

export interface BriefPreviewProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fips: string | null;
  lens?: string;
  areaName?: string;
}

/**
 * Brief preview (D.5): the print layout in a modal, with Print and a
 * save-as-PDF path through the browser print dialog. The iframe keeps print
 * styles isolated from the app shell.
 */
export function BriefPreview({ open, onOpenChange, fips, lens, areaName }: BriefPreviewProps) {
  const frame = useRef<HTMLIFrameElement>(null);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={areaName ? `Brief preview — ${areaName}` : "Brief preview"}
      className="w-[min(900px,94vw)]"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-caption text-tertiary">Light only · A4 and Letter · provenance included</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => frame.current?.contentWindow?.print()}
              className="rounded-control bg-accent px-3 py-1.5 text-body-sm text-onaccent"
            >
              Print
            </button>
            <button
              type="button"
              onClick={() => frame.current?.contentWindow?.print()}
              className="rounded-control border border-default px-3 py-1.5 text-body-sm text-secondary hover:text-primary"
            >
              Save as PDF
            </button>
          </div>
        </div>
      }
    >
      {fips ? (
        <iframe
          ref={frame}
          src={`/print/${fips}${lens ? `?lens=${lens}` : ""}`}
          title="Print brief preview"
          className="h-[65vh] w-full rounded-control border border-subtle bg-white"
        />
      ) : (
        <p className="text-body-sm text-secondary">Select an area to preview its brief.</p>
      )}
    </Modal>
  );
}
