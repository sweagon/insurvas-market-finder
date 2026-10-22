import { CONFIG, scoreMatrix } from "./score";
import type { WorkerRequest, WorkerResponse } from "./workerProtocol";

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse, transfer?: Transferable[]) => void;
};

let data: { fips: string[]; columns: Record<string, Float64Array>; pop60: Float64Array } | null =
  null;

ctx.onmessage = (event) => {
  const message = event.data;
  if (message.type === "init") {
    data = { fips: message.fips, columns: message.columns, pop60: message.pop60 };
    ctx.postMessage({ type: "ready" });
    return;
  }
  if (!data) {
    ctx.postMessage({ type: "error", message: "Scoring worker was not initialised" });
    return;
  }
  try {
    const lens = CONFIG.lenses[message.lensId];
    const scored = scoreMatrix({
      fips: data.fips,
      columns: data.columns,
      config: {
        ...CONFIG,
        lenses: {
          ...CONFIG.lenses,
          [message.lensId]: { ...lens, weights: message.weights },
        },
      },
      lensId: message.lensId,
      eligibilityPop: data.pop60,
    });
    const total = scored.total.slice();
    ctx.postMessage(
      {
        type: "result",
        requestId: message.requestId,
        total,
        eligibility: scored.eligibility,
      },
      [total.buffer],
    );
  } catch (error) {
    ctx.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Scoring failed",
    });
  }
};
