export interface InitMessage {
  type: "init";
  fips: string[];
  columns: Record<string, Float64Array>;
  pop60: Float64Array;
}

export interface ScoreMessage {
  type: "score";
  requestId: number;
  lensId: string;
  weights: Record<string, number>;
}

export type WorkerRequest = InitMessage | ScoreMessage;

export interface ReadyMessage {
  type: "ready";
}

export interface ResultMessage {
  type: "result";
  requestId: number;
  total: Float64Array;
  eligibility: boolean[];
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export type WorkerResponse = ReadyMessage | ResultMessage | ErrorMessage;
