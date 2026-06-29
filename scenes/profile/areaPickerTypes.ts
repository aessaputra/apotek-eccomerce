export type SelectionStage = 'province' | 'city' | 'district' | 'postal';

export type StageStatus =
  { kind: 'idle' } | { kind: 'error'; message: string } | { kind: 'guidance'; message: string };
