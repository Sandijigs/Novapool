export enum MaturityPhase {
  NASCENT = 0,
  EMERGING = 1,
  GROWING = 2,
  ESTABLISHED = 3,
}

export interface PoolConfig {
  baseFee: number;
  matureFee: number;
  maxSwapPctBps: number;
  largeTradeCooldown: number;
  largeTradePctBps: number;
  volumeForEmerging: number;
  volumeForGrowing: number;
  volumeForEstablished: number;
  ageEmerging: number;
  ageGrowing: number;
  ageEstablished: number;
}

export interface PoolState {
  phase: MaturityPhase;
  volume: number;
  traders: number;
  age: number;
  fee: number;
}

export interface LogEntry {
  timestamp: Date;
  message: string;
}

export const PHASE_NAMES: Record<MaturityPhase, string> = {
  [MaturityPhase.NASCENT]: "NASCENT",
  [MaturityPhase.EMERGING]: "EMERGING",
  [MaturityPhase.GROWING]: "GROWING",
  [MaturityPhase.ESTABLISHED]: "ESTABLISHED",
};

export const PHASE_FEES: Record<MaturityPhase, number> = {
  [MaturityPhase.NASCENT]: 10000,
  [MaturityPhase.EMERGING]: 6675,
  [MaturityPhase.GROWING]: 3350,
  [MaturityPhase.ESTABLISHED]: 500,
};

export const PHASE_FEE_PCT: Record<MaturityPhase, string> = {
  [MaturityPhase.NASCENT]: "1.00%",
  [MaturityPhase.EMERGING]: "0.67%",
  [MaturityPhase.GROWING]: "0.34%",
  [MaturityPhase.ESTABLISHED]: "0.05%",
};

export const DEFAULT_CONFIG: PoolConfig = {
  baseFee: 10000,
  matureFee: 500,
  maxSwapPctBps: 500,
  largeTradeCooldown: 60,
  largeTradePctBps: 200,
  volumeForEmerging: 0.01,
  volumeForGrowing: 0.05,
  volumeForEstablished: 0.1,
  ageEmerging: 60,
  ageGrowing: 300,
  ageEstablished: 600,
};
