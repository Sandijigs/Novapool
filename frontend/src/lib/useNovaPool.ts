import { useCallback, useState } from "react";
import {
  DEFAULT_CONFIG,
  LogEntry,
  MaturityPhase,
  PHASE_FEES,
  PHASE_NAMES,
  PoolConfig,
  PoolState,
} from "./types";

export function useNovaPool(config: PoolConfig = DEFAULT_CONFIG) {
  const [state, setState] = useState<PoolState>({
    phase: MaturityPhase.NASCENT,
    volume: 0,
    traders: 1,
    age: 0,
    fee: PHASE_FEES[MaturityPhase.NASCENT],
  });

  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: new Date(), message: "Dashboard loaded" },
  ]);

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [{ timestamp: new Date(), message }, ...prev]);
  }, []);

  const checkAdvancement = useCallback(
    (current: PoolState): PoolState => {
      let { phase } = current;
      const { volume, age } = current;
      const messages: string[] = [];

      if (
        phase === MaturityPhase.NASCENT &&
        volume >= config.volumeForEmerging &&
        age >= config.ageEmerging
      ) {
        phase = MaturityPhase.EMERGING;
        messages.push("Phase advanced to EMERGING");
      }

      if (
        phase === MaturityPhase.EMERGING &&
        volume >= config.volumeForGrowing &&
        age >= config.ageGrowing
      ) {
        phase = MaturityPhase.GROWING;
        messages.push("Phase advanced to GROWING");
      }

      if (
        phase === MaturityPhase.GROWING &&
        volume >= config.volumeForEstablished &&
        age >= config.ageEstablished
      ) {
        phase = MaturityPhase.ESTABLISHED;
        messages.push("Phase advanced to ESTABLISHED");
      }

      if (messages.length > 0) {
        setLogs((prev) => [
          ...messages.map((m) => ({ timestamp: new Date(), message: m })),
          ...prev,
        ]);
      }

      return { ...current, phase, fee: PHASE_FEES[phase] };
    },
    [config]
  );

  const simulateSwap = useCallback(
    (amount: number) => {
      setState((prev) => {
        const next = { ...prev, volume: prev.volume + amount };
        return checkAdvancement(next);
      });
      addLog(`Swap: ${amount} ETH (total vol: ${(state.volume + amount).toFixed(4)})`);
    },
    [addLog, checkAdvancement, state.volume]
  );

  const simulateAge = useCallback(
    (seconds: number) => {
      setState((prev) => {
        const next = { ...prev, age: prev.age + seconds };
        return checkAdvancement(next);
      });
      const label =
        seconds >= 86400
          ? `+${seconds / 86400} day(s)`
          : `+${seconds / 3600} hour(s)`;
      addLog(`Time warp: ${label}`);
    },
    [addLog, checkAdvancement]
  );

  const addTrader = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, traders: prev.traders + 1 };
      return checkAdvancement(next);
    });
    addLog(`New trader joined (total: ${state.traders + 1})`);
  }, [addLog, checkAdvancement, state.traders]);

  const reset = useCallback(() => {
    setState({
      phase: MaturityPhase.NASCENT,
      volume: 0,
      traders: 1,
      age: 0,
      fee: PHASE_FEES[MaturityPhase.NASCENT],
    });
    setLogs([{ timestamp: new Date(), message: "Dashboard reset" }]);
  }, []);

  // Progress toward next phase (0-100)
  const phaseProgress = (() => {
    const p = state.phase;
    if (p === MaturityPhase.ESTABLISHED) return 100;

    const volTargets = [
      config.volumeForEmerging,
      config.volumeForGrowing,
      config.volumeForEstablished,
    ];
    const ageTargets = [config.ageEmerging, config.ageGrowing, config.ageEstablished];

    const volProgress = Math.min(state.volume / volTargets[p], 1);
    const ageProgress = Math.min(state.age / ageTargets[p], 1);

    return Math.round(((volProgress + ageProgress) / 2) * 100);
  })();

  return {
    state,
    logs,
    config,
    phaseProgress,
    simulateSwap,
    simulateAge,
    addTrader,
    reset,
    phaseName: PHASE_NAMES[state.phase],
  };
}
