export enum ModifierState {
  NONE = 'NONE',
  F = 'F', // Orange
  G = 'G'  // Blue
}

export interface CalculatorState {
  stack: number[]; // X, Y, Z, T (RPN Stack)
  display: string;
  lastX: number;
  inputBuffer: string | null; // Null means we are in "result" mode, string means typing
  modifiers: ModifierState;
  powerOn: boolean;
  financial: {
    n: number;
    i: number;
    PV: number;
    PMT: number;
    FV: number;
  };
  error: string | null;
  
  // New Functionality State
  memory: number[]; // Registers R0-R9, R.0-R.9 (mapped to indices 0-19)
  stats: {
    n: number;
    sumX: number;
    sumX2: number;
    sumY: number;
    sumY2: number;
    sumXY: number;
  };
  cashFlows: { amount: number; count: number }[]; // For NPV/IRR
  pendingOp: string | null; // For multi-key sequences like STO _, RCL _, etc.
  begMode: boolean; // BEG vs END payment mode
  dateFormat: 'MDY' | 'DMY'; // D.MY vs M.DY
  
  // Display formatting
  decimals: number;
  displayFormat: 'FIX' | 'SCI';
}

export type KeyAction = 
  | 'NUM' 
  | 'ENTER' 
  | 'OP' 
  | 'FIN' 
  | 'CLR' 
  | 'MOD' 
  | 'PWR' 
  | 'DOT' 
  | 'CHS'
  | 'FUNC'
  | 'DATE'
  | 'STAT'
  | 'STACK';

export interface KeyDefinition {
  id: string;
  label: string;
  fLabel?: string; // Orange (Top)
  gLabel?: string; // Blue (Bottom)
  action: KeyAction;
  value?: string | number; // For numbers or specific op codes
  className?: string; // For spacing/sizing (like ENTER)
}