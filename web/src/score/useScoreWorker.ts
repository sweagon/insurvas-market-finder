import { useEffect, useMemo, useRef, useState } from "react";
import { CONFIG } from "./score";
import type { CountyRow, LensId } from "../data/types";
import type { SubScoreWeights } from "../state/store";
import type { WorkerRequest, WorkerResponse } from "./workerProtocol";

export interface ScoreWorkerState {
  total: Float64Array | null;
  eligibility: boolean[] | null;
  pending: boolean;
  error: string | null;
}

/**
 * Scores every eligible county off the main thread. The metric matrix is sent
 * once; weight changes only send six numbers, so slider drags stay smooth.
 * Responses carry a request id, so a slow earlier run can never overwrite a
 * newer one.
 */
export function useScoreWorker(
  counties: CountyRow[],
  lens: LensId,
  weights: SubScoreWeights,
): ScoreWorkerState {
  const workerRef = useRef<Worker | null>(null);
  const request = useRef(0);
  const [state, setState] = useState<ScoreWorkerState>({
    total: null,
    eligibility: null,
    pending: true,
    error: null,
  });

  const columns = useMemo(() => {
    const out: Record<string, Float64Array> = {};
    for (const metric of CONFIG.metrics) {
      if (!metric.scored) continue;
      out[metric.id] = Float64Array.from(
        counties.map((c) => {
          const value = c.metrics?.[metric.id];
          return typeof value === "number" ? value : Number.NaN;
        }),
      );
    }
    return out;
  }, [counties]);

  useEffect(() => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.type === "error") {
        setState((s) => ({ ...s, pending: false, error: message.message }));
      } else if (message.type === "result" && message.requestId === request.current) {
        setState({
          total: message.total,
          eligibility: message.eligibility,
          pending: false,
          error: null,
        });
      }
    };
    worker.onerror = () => {
      setState((s) => ({ ...s, pending: false, error: "Scoring worker failed to start" }));
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker || !counties.length) return;
    // Clone before transferring: the memo may be reused (StrictMode re-runs
    // this effect) and detached buffers cannot be posted twice.
    const copy = Object.fromEntries(
      Object.entries(columns).map(([id, values]) => [id, Float64Array.from(values)]),
    );
    const message: WorkerRequest = {
      type: "init",
      fips: counties.map((c) => c.fips),
      columns: copy,
      pop60: Float64Array.from(counties.map((c) => c.pop60)),
    };
    worker.postMessage(message, Object.values(copy).map((c) => c.buffer));
  }, [counties, columns]);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker || !counties.length) return;
    const id = ++request.current;
    const timer = window.setTimeout(() => {
      setState((s) => ({ ...s, pending: true }));
      worker.postMessage({
        type: "score",
        requestId: id,
        lensId: lens,
        weights: weights as unknown as Record<string, number>,
      } satisfies WorkerRequest);
    }, 30);
    return () => window.clearTimeout(timer);
  }, [counties, lens, weights]);

  return state;
}
