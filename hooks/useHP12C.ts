import { useState, useCallback, useEffect } from 'react';
import { CalculatorState, ModifierState, KeyDefinition } from '../types';

const STORAGE_KEY = 'hp12c-platinum-state-v1';

const INITIAL_STATE: CalculatorState = {
  stack: [0, 0, 0, 0], // X, Y, Z, T
  display: '0,00',
  lastX: 0,
  inputBuffer: null,
  modifiers: ModifierState.NONE,
  powerOn: true,
  financial: { n: 0, i: 0, PV: 0, PMT: 0, FV: 0 },
  error: null,
  memory: new Array(20).fill(0),
  stats: { n: 0, sumX: 0, sumX2: 0, sumY: 0, sumY2: 0, sumXY: 0 },
  cashFlows: [],
  pendingOp: null,
  begMode: false,
  dateFormat: 'MDY',
  decimals: 2,
  displayFormat: 'FIX',
};

// --- HELPER FUNCTIONS ---

const formatDisplay = (num: number, decimals: number, format: 'FIX' | 'SCI'): string => {
  if (!isFinite(num) || isNaN(num)) return 'Error';
  
  // Handling Scientific Notation (replace dot with comma for PT-BR feel)
  if (format === 'SCI') {
    return num.toExponential(decimals).replace('+', '').replace('.', ',');
  }
  
  const abs = Math.abs(num);
  // Auto switch to SCI if too large or too small
  if (abs >= 1e10 || (abs > 0 && abs < 1e-9)) {
    return num.toExponential(decimals).replace('+', '').replace('.', ',');
  }

  // Brazilian Format: 1.000,00
  return num.toLocaleString('pt-BR', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

const calculateTVM = (n: number, iPct: number, pv: number, pmt: number, fv: number, beg: boolean, solveFor: 'FV'|'PV'|'PMT') => {
  const i = iPct / 100;
  const type = beg ? 1 : 0;
  if (Math.abs(i) < 1e-10) {
    if (solveFor === 'FV') return -(pv + pmt * n);
    if (solveFor === 'PV') return -(fv + pmt * n);
    if (solveFor === 'PMT') return -(fv + pv) / n;
    return 0;
  }
  const pow = Math.pow(1 + i, n);
  if (solveFor === 'FV') return -(pv * pow + pmt * (1 + i * type) * (pow - 1) / i);
  if (solveFor === 'PV') return -(fv + pmt * (1 + i * type) * (pow - 1) / i) / pow;
  if (solveFor === 'PMT') return -(fv + pv * pow) / ((1 + i * type) * (pow - 1) / i);
  return 0;
};

const factorial = (n: number): number => {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= Math.floor(n); i++) res *= i;
  return res;
};

const calcRegression = (stats: { n: number, sumX: number, sumX2: number, sumY: number, sumY2: number, sumXY: number }) => {
  const { n, sumX, sumX2, sumY, sumY2, sumXY } = stats;
  if (n < 2) return { m: 0, b: 0, r: 0 };
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { m: 0, b: 0, r: 0 };

  const m = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;
  
  const rNum = (n * sumXY - sumX * sumY);
  const rDen = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  const r = rDen === 0 ? 1 : rNum / rDen;
  return { m, b, r };
};

const expandCashFlows = (flows: { amount: number; count: number }[]): number[] => {
  const result: number[] = [];
  flows.forEach(f => { for (let k = 0; k < f.count; k++) result.push(f.amount); });
  return result;
};

const calculateNPV = (iPct: number, flows: { amount: number; count: number }[]): number => {
  const r = iPct / 100;
  const flatFlows = expandCashFlows(flows);
  let npv = 0;
  flatFlows.forEach((cf, t) => { npv += cf / Math.pow(1 + r, t); });
  return npv;
};

const calculateIRR = (flows: { amount: number; count: number }[]): number => {
  const flatFlows = expandCashFlows(flows);
  let rate = 0.1; 
  for (let i = 0; i < 50; i++) {
    let npv = 0, dNpv = 0;
    for (let t = 0; t < flatFlows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npv += flatFlows[t] / denom;
      dNpv -= (t * flatFlows[t]) / (denom * (1 + rate));
    }
    if (Math.abs(npv) < 1e-6) return rate * 100;
    if (Math.abs(dNpv) < 1e-9) break;
    rate = rate - npv / dNpv;
  }
  return isFinite(rate) ? rate * 100 : NaN;
};

const parseHPDate = (val: number, format: 'MDY'|'DMY'): Date | null => {
  const str = val.toFixed(6);
  const parts = str.split('.');
  if (parts.length !== 2) return null;
  const intPart = parseInt(parts[0]);
  const decimalPart = parts[1].padEnd(6, '0');
  let day, month, year;
  if (format === 'DMY') {
    day = intPart;
    month = parseInt(decimalPart.substring(0, 2));
    year = parseInt(decimalPart.substring(2, 6));
  } else {
    month = intPart;
    day = parseInt(decimalPart.substring(0, 2));
    year = parseInt(decimalPart.substring(2, 6));
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
};

const toHPDate = (date: Date, format: 'MDY'|'DMY'): number => {
  const d = date.getDate(), m = date.getMonth() + 1, y = date.getFullYear();
  const mStr = m.toString().padStart(2, '0'), dStr = d.toString().padStart(2, '0');
  return format === 'DMY' ? parseFloat(`${d}.${mStr}${y}`) : parseFloat(`${m}.${dStr}${y}`);
};

const getDayOfWeek = (date: Date): number => {
  const jsDay = date.getDay();
  return jsDay === 0 ? 7 : jsDay;
};

const daysBetween = (d1: Date, d2: Date) => Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));

const calculateBondPrice = (settlement: Date, maturity: Date, couponRate: number, yieldRate: number) => {
  const days = daysBetween(settlement, maturity);
  const years = days / 365.25;
  const r = yieldRate / 100 / 2;
  const cpn = couponRate / 2;
  const periods = years * 2;
  if (periods <= 0) return 100;
  return 100 * Math.pow(1 + r, -periods) + (cpn / r) * (1 - Math.pow(1 + r, -periods));
};

const solveYield = (settlement: Date, maturity: Date, couponRate: number, price: number) => {
  let yieldRate = 0.05;
  for (let i = 0; i < 20; i++) {
    const p = calculateBondPrice(settlement, maturity, couponRate, yieldRate * 100);
    const pPlus = calculateBondPrice(settlement, maturity, couponRate, (yieldRate + 0.0001) * 100);
    const deriv = (pPlus - p) / 0.0001;
    const diff = p - price;
    if (Math.abs(diff) < 0.0001) break;
    yieldRate = yieldRate - diff / (deriv || 1);
  }
  return yieldRate * 100;
};

export const useHP12C = () => {
  // Load initial state from LocalStorage if available
  const [state, setState] = useState<CalculatorState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...INITIAL_STATE, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load HP12C state', e);
    }
    return INITIAL_STATE;
  });

  // Persistence Effect
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save HP12C state', e);
    }
  }, [state]);

  const pushStack = (val: number, s: number[]) => [val, s[0], s[1], s[2]];

  const handleKeyPress = useCallback((key: KeyDefinition) => {
    setState(prev => {
      // Special action for pasting numbers
      if (key.id === 'PASTE_INPUT' && key.value) {
          const pastedVal = String(key.value);
          // If in result mode (inputBuffer is null), we treat this like typing a new number
          const displayVal = pastedVal.replace('.', ',');
          return {
              ...prev,
              inputBuffer: pastedVal,
              display: displayVal + '_',
              modifiers: ModifierState.NONE
          };
      }

      if (key.action === 'PWR') {
        const nextPower = !prev.powerOn;
        return { ...prev, powerOn: nextPower, display: !nextPower ? '' : formatDisplay(prev.stack[0], prev.decimals, prev.displayFormat) };
      }
      if (!prev.powerOn) return prev;

      if (key.action === 'MOD') {
        return { ...prev, modifiers: prev.modifiers === key.value ? ModifierState.NONE : (key.value as ModifierState), pendingOp: null };
      }

      // Memory Register Sequence (STO/RCL)
      if (prev.pendingOp && (prev.pendingOp.startsWith('STO') || prev.pendingOp.startsWith('RCL'))) {
        if (key.action === 'DOT') {
          if (prev.pendingOp.includes('.')) return prev;
          const newOp = prev.pendingOp + '.';
          return { ...prev, pendingOp: newOp, display: newOp.replace('.', ',') };
        }
        if (key.action === 'NUM') {
          const digit = Number(key.value);
          let regIdx = prev.pendingOp.includes('.') ? 10 + digit : digit;
          const newMem = [...prev.memory];
          const xVal = prev.inputBuffer ? parseFloat(prev.inputBuffer) : prev.stack[0];
          let newStack = prev.stack, newDisplay = prev.display;
          if (prev.pendingOp.startsWith('STO')) {
            const op = prev.pendingOp.match(/^STO([+\-*/])/)?.[1];
            if (op === '+') newMem[regIdx] += xVal; else if (op === '-') newMem[regIdx] -= xVal;
            else if (op === '*') newMem[regIdx] *= xVal; else if (op === '/') newMem[regIdx] = xVal !== 0 ? newMem[regIdx] / xVal : newMem[regIdx];
            else newMem[regIdx] = xVal;
            newDisplay = formatDisplay(xVal, prev.decimals, prev.displayFormat);
          } else {
            const val = newMem[regIdx];
            newStack = pushStack(val, prev.stack);
            newDisplay = formatDisplay(val, prev.decimals, prev.displayFormat);
          }
          return { ...prev, memory: newMem, stack: newStack, display: newDisplay, pendingOp: null, inputBuffer: null, modifiers: ModifierState.NONE };
        }
        if (key.action === 'OP' && prev.pendingOp === 'STO') return { ...prev, pendingOp: 'STO' + key.value, display: 'STO ' + key.value };
        return { ...prev, pendingOp: null };
      }

      // Modifier F Logic (Orange Labels)
      if (prev.modifiers === ModifierState.F) {
        if (key.id === 'CLX') return { ...prev, stack: [0, 0, 0, 0], financial: { n: 0, i: 0, PV: 0, PMT: 0, FV: 0 }, stats: { n: 0, sumX: 0, sumX2: 0, sumY: 0, sumY2: 0, sumXY: 0 }, memory: new Array(20).fill(0), modifiers: ModifierState.NONE, display: formatDisplay(0, prev.decimals, prev.displayFormat) };
        if (key.id === 'SST') return { ...prev, stats: { n: 0, sumX: 0, sumX2: 0, sumY: 0, sumY2: 0, sumXY: 0 }, display: formatDisplay(0, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE };
        if (key.id === 'xy') return { ...prev, financial: { n: 0, i: 0, PV: 0, PMT: 0, FV: 0 }, modifiers: ModifierState.NONE };
        
        if (key.action === 'NUM') {
          const d = Number(key.value);
          const x = prev.inputBuffer ? parseFloat(prev.inputBuffer) : prev.stack[0];
          return { ...prev, decimals: d, displayFormat: 'FIX', display: formatDisplay(x, d, 'FIX'), modifiers: ModifierState.NONE };
        }
        if (key.action === 'DOT') {
          const x = prev.inputBuffer ? parseFloat(prev.inputBuffer) : prev.stack[0];
          return { ...prev, displayFormat: 'SCI', display: formatDisplay(x, prev.decimals, 'SCI'), modifiers: ModifierState.NONE };
        }

        // AMORT (f + n)
        if (key.id === 'n') {
          const m = prev.stack[0];
          const { i, PV, PMT, n } = prev.financial;
          let currPV = PV, totInt = 0, totPrin = 0;
          const rate = i / 100;
          for(let k=0; k < m; k++) {
            const intPart = -(currPV * rate);
            const prinPart = PMT - intPart;
            currPV += prinPart;
            totInt += intPart;
            totPrin += prinPart;
          }
          return { ...prev, financial: { ...prev.financial, n: n + m, PV: currPV }, stack: [currPV, totPrin, totInt, prev.stack[3]], display: formatDisplay(currPV, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        }
        // INT (f + i) Simple Interest (360 day basis)
        if (key.id === 'i') {
          const { n, i, PV } = prev.financial;
          const interest = -(PV * n * i) / 36000;
          return { ...prev, stack: pushStack(interest, prev.stack), display: formatDisplay(interest, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        }
        // NPV (f + PV)
        if (key.id === 'PV') {
          const npv = calculateNPV(prev.financial.i, prev.cashFlows);
          return { ...prev, stack: pushStack(npv, prev.stack), display: formatDisplay(npv, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        }
        // RND (f + PMT) Rounding
        if (key.id === 'PMT') {
          const x = prev.stack[0];
          const fact = Math.pow(10, prev.decimals);
          const rnd = Math.round(x * fact) / fact;
          return { ...prev, stack: [rnd, prev.stack[1], prev.stack[2], prev.stack[3]], display: formatDisplay(rnd, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        }
        // IRR (f + FV)
        if (key.id === 'FV') {
          const irr = calculateIRR(prev.cashFlows);
          if (isNaN(irr)) return { ...prev, error: 'Error 7', modifiers: ModifierState.NONE };
          return { ...prev, stack: pushStack(irr, prev.stack), display: formatDisplay(irr, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        }
        // PRICE (f + y^x)
        if (key.id === 'yx') {
          const sett = parseHPDate(prev.stack[1], prev.dateFormat), mat = parseHPDate(prev.stack[0], prev.dateFormat);
          if (!sett || !mat) return { ...prev, error: 'Error 8', modifiers: ModifierState.NONE };
          const p = calculateBondPrice(sett, mat, prev.financial.PMT, prev.financial.i);
          return { ...prev, stack: pushStack(p, prev.stack), display: formatDisplay(p, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        }
        // YTM (f + 1/x)
        if (key.id === 'inv') {
          const sett = parseHPDate(prev.stack[1], prev.dateFormat), mat = parseHPDate(prev.stack[0], prev.dateFormat);
          if (!sett || !mat) return { ...prev, error: 'Error 8', modifiers: ModifierState.NONE };
          const y = solveYield(sett, mat, prev.financial.PMT, prev.financial.PV);
          return { ...prev, stack: pushStack(y, prev.stack), display: formatDisplay(y, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        }
        // Depreciation (SL, SOYD, DB)
        if (['pctT', 'dPct', 'pct'].includes(key.id)) {
          const y = prev.stack[0];
          const { PV, FV, n } = prev.financial;
          if (y > n || y <= 0) return { ...prev, error: 'Error 5', modifiers: ModifierState.NONE };
          let dep = 0, book = PV;
          if (key.id === 'pctT') dep = (PV - FV) / n;
          else if (key.id === 'dPct') dep = ((PV - FV) * (n - y + 1)) / ((n * (n + 1)) / 2);
          else {
            const factor = prev.financial.i || 2; // Default to 2 for DDB if i is not set as factor
            const r = (factor / 100) / n;
            for (let k = 1; k <= y; k++) { dep = book * r; book -= dep; }
          }
          if (key.id !== 'pct') book = PV - (dep * y); // Approx for SL/SOYD
          return { ...prev, stack: [dep, book, prev.stack[2], prev.stack[3]], display: formatDisplay(dep, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        }
        return { ...prev, modifiers: ModifierState.NONE };
      }

      // Modifier G Logic (Blue Labels)
      if (prev.modifiers === ModifierState.G) {
        const x = prev.inputBuffer ? parseFloat(prev.inputBuffer) : prev.stack[0];
        
        // Date Format Toggles
        if (key.id === '4') return { ...prev, dateFormat: 'DMY', modifiers: ModifierState.NONE };
        if (key.id === '5') return { ...prev, dateFormat: 'MDY', modifiers: ModifierState.NONE };
        
        // Statistics: Mean (g 0)
        if (key.id === '0') {
            const { n, sumX, sumY } = prev.stats;
            if (n === 0) return { ...prev, error: 'Error 2', modifiers: ModifierState.NONE };
            const meanX = sumX / n;
            const meanY = sumY / n;
            return {
                ...prev,
                stack: [meanX, meanY, prev.stack[1], prev.stack[2]],
                lastX: x,
                display: formatDisplay(meanX, prev.decimals, prev.displayFormat),
                modifiers: ModifierState.NONE,
                inputBuffer: null
            };
        }
        // Statistics: Std Dev (g .)
        if (key.id === 'DOT') {
            const { n, sumX, sumX2 } = prev.stats;
            if (n < 2) return { ...prev, error: 'Error 2', modifiers: ModifierState.NONE };
            const varS = (sumX2 - (sumX * sumX) / n) / (n - 1);
            const s = Math.sqrt(Math.max(0, varS));
            const meanX = sumX / n;
            return {
                ...prev,
                stack: [s, meanX, prev.stack[1], prev.stack[2]],
                lastX: x,
                display: formatDisplay(s, prev.decimals, prev.displayFormat),
                modifiers: ModifierState.NONE,
                inputBuffer: null
            };
        }
        // Statistics: Lin Reg x_hat (g 1)
        if (key.id === '1') {
           const { m, b, r } = calcRegression(prev.stats);
           const yVal = x; 
           const xHat = m === 0 ? 0 : (yVal - b) / m;
           return {
             ...prev,
             stack: [xHat, r, prev.stack[1], prev.stack[2]],
             lastX: x,
             display: formatDisplay(xHat, prev.decimals, prev.displayFormat),
             modifiers: ModifierState.NONE,
             inputBuffer: null
           };
        }
        // Statistics: Lin Reg y_hat (g 2)
        if (key.id === '2') {
           const { m, b, r } = calcRegression(prev.stats);
           const yHat = m * x + b;
           return {
             ...prev,
             stack: [yHat, r, prev.stack[1], prev.stack[2]],
             lastX: x,
             display: formatDisplay(yHat, prev.decimals, prev.displayFormat),
             modifiers: ModifierState.NONE,
             inputBuffer: null
           };
        }
        // Statistics: Weighted Mean (g 6)
        if (key.id === '6') {
           const { sumXY, sumY } = prev.stats;
           if (sumY === 0) return { ...prev, error: 'Error 2', modifiers: ModifierState.NONE };
           const meanW = sumXY / sumY;
           return {
             ...prev,
             stack: pushStack(meanW, prev.stack),
             lastX: x,
             display: formatDisplay(meanW, prev.decimals, prev.displayFormat),
             modifiers: ModifierState.NONE,
             inputBuffer: null
           };
        }
        // Sigma Minus (g Σ+)
        if (key.id === 'SIGMA') {
             const xVal = prev.inputBuffer ? parseFloat(prev.inputBuffer) : prev.stack[0];
             const yVal = prev.stack[1];
             const newN = prev.stats.n - 1;
             const newStats = {
                n: newN,
                sumX: prev.stats.sumX - xVal,
                sumX2: prev.stats.sumX2 - (xVal * xVal),
                sumY: prev.stats.sumY - yVal,
                sumY2: prev.stats.sumY2 - (yVal * yVal),
                sumXY: prev.stats.sumXY - (xVal * yVal)
             };
             return {
                ...prev,
                stats: newStats,
                stack: [newN, xVal, prev.stack[1], prev.stack[2]], 
                lastX: xVal,
                display: formatDisplay(newN, 0, 'FIX'),
                inputBuffer: null,
                modifiers: ModifierState.NONE
             };
        }

        if (key.id === 'CHS') { // DATE + n
          const d = parseHPDate(prev.stack[1], prev.dateFormat);
          if (!d) return { ...prev, error: 'Error 8', modifiers: ModifierState.NONE };
          d.setDate(d.getDate() + x);
          const r = toHPDate(d, prev.dateFormat);
          return { ...prev, stack: [r, getDayOfWeek(d), prev.stack[2], prev.stack[3]], display: formatDisplay(r, prev.decimals, prev.displayFormat) + ` ${getDayOfWeek(d)}`, modifiers: ModifierState.NONE, inputBuffer: null };
        }
        if (key.id === 'EEX') { // ΔDYS
          const d1 = parseHPDate(prev.stack[1], prev.dateFormat), d2 = parseHPDate(x, prev.dateFormat);
          if (!d1 || !d2) return { ...prev, error: 'Error 8', modifiers: ModifierState.NONE };
          const res = daysBetween(d1, d2);
          return { ...prev, stack: pushStack(res, prev.stack), display: formatDisplay(res, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        }
        // TVM g-functions
        if (key.id === 'n') return { ...prev, financial: { ...prev.financial, n: x * 12 }, stack: pushStack(x * 12, prev.stack), display: formatDisplay(x * 12, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        if (key.id === 'i') return { ...prev, financial: { ...prev.financial, i: x / 12 }, stack: pushStack(x / 12, prev.stack), display: formatDisplay(x / 12, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        if (key.id === '7') return { ...prev, begMode: true, modifiers: ModifierState.NONE };
        if (key.id === '8') return { ...prev, begMode: false, modifiers: ModifierState.NONE };
        // Cash Flow g-functions
        if (key.id === 'PV') return { ...prev, cashFlows: [{ amount: x, count: 1 }], financial: { ...prev.financial, PV: x }, stack: pushStack(x, prev.stack), display: formatDisplay(x, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        if (key.id === 'PMT') {
          const flows = [...prev.cashFlows, { amount: x, count: 1 }];
          return { ...prev, cashFlows: flows, stack: pushStack(flows.length - 1, prev.stack), display: formatDisplay(flows.length - 1, 0, 'FIX'), modifiers: ModifierState.NONE, inputBuffer: null };
        }
        if (key.id === 'FV') {
          if (!prev.cashFlows.length) return prev;
          const flows = [...prev.cashFlows];
          flows[flows.length - 1].count = Math.max(1, Math.min(99, Math.floor(x)));
          return { ...prev, cashFlows: flows, display: formatDisplay(flows[flows.length - 1].count, 0, 'FIX'), modifiers: ModifierState.NONE, inputBuffer: null };
        }
        // Math g-functions
        if (key.id === 'yx') return { ...prev, stack: pushStack(Math.sqrt(x), prev.stack), display: formatDisplay(Math.sqrt(x), prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        if (key.id === 'inv') return { ...prev, stack: pushStack(Math.exp(x), prev.stack), display: formatDisplay(Math.exp(x), prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        if (key.id === 'pctT') return { ...prev, stack: pushStack(Math.log(x), prev.stack), display: formatDisplay(Math.log(x), prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        if (key.id === 'pct') return { ...prev, stack: pushStack(Math.trunc(x), prev.stack), display: formatDisplay(Math.trunc(x), prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        if (key.id === 'dPct') return { ...prev, stack: pushStack(x >= 0 ? x - Math.floor(x) : x - Math.ceil(x), prev.stack), display: formatDisplay(x >= 0 ? x - Math.floor(x) : x - Math.ceil(x), prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        if (key.id === 'MUL') return { ...prev, stack: pushStack(x * x, prev.stack), display: formatDisplay(x * x, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        if (key.id === '3') return { ...prev, stack: pushStack(factorial(x), prev.stack), display: formatDisplay(factorial(x), prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };
        if (key.id === 'ADD') return { ...prev, stack: pushStack(prev.lastX, prev.stack), display: formatDisplay(prev.lastX, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE, inputBuffer: null };

        return { ...prev, modifiers: ModifierState.NONE };
      }

      // Input and Standard Actions
      if (key.action === 'NUM' || key.action === 'DOT') {
        let buf = prev.inputBuffer || '';
        const char = key.action === 'DOT' ? '.' : String(key.value);
        if (buf.length < 15) { if (char === '.' && buf.includes('.')) return prev; buf += char; }
        
        // Show comma on screen instead of dot while typing
        const displayBuf = buf.replace('.', ',');
        return { ...prev, inputBuffer: buf, display: displayBuf + '_', modifiers: ModifierState.NONE };
      }
      if (key.action === 'ENTER') {
        const val = prev.inputBuffer ? parseFloat(prev.inputBuffer) : prev.stack[0];
        return { ...prev, stack: [val, val, prev.stack[1], prev.stack[2]], inputBuffer: null, display: formatDisplay(val, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE };
      }
      if (key.action === 'OP') {
        const xVal = prev.inputBuffer ? parseFloat(prev.inputBuffer) : prev.stack[0], yVal = prev.stack[1];
        let r = 0;
        switch (key.value) { case '+': r = yVal + xVal; break; case '-': r = yVal - xVal; break; case '*': r = yVal * xVal; break; case '/': r = xVal !== 0 ? yVal / xVal : 0; break; }
        return { ...prev, stack: [r, prev.stack[2], prev.stack[3], prev.stack[3]], lastX: xVal, display: formatDisplay(r, prev.decimals, prev.displayFormat), inputBuffer: null, modifiers: ModifierState.NONE };
      }
      if (key.id === 'SIGMA') {
         const xVal = prev.inputBuffer ? parseFloat(prev.inputBuffer) : prev.stack[0];
         const yVal = prev.stack[1];
         const newN = prev.stats.n + 1;
         const newStats = {
            n: newN,
            sumX: prev.stats.sumX + xVal,
            sumX2: prev.stats.sumX2 + (xVal * xVal),
            sumY: prev.stats.sumY + yVal,
            sumY2: prev.stats.sumY2 + (yVal * yVal),
            sumXY: prev.stats.sumXY + (xVal * yVal)
         };
         return { ...prev, stats: newStats, stack: [newN, xVal, prev.stack[1], prev.stack[2]], lastX: xVal, display: formatDisplay(newN, 0, 'FIX'), inputBuffer: null, modifiers: ModifierState.NONE };
      }
      if (key.id === 'STO' || key.id === 'RCL') return { ...prev, pendingOp: key.id, display: key.id + ' _', modifiers: ModifierState.NONE };
      if (key.id === 'CLX') return { ...prev, inputBuffer: null, display: formatDisplay(0, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE };
      if (key.action === 'CHS') {
        if (prev.inputBuffer) {
          let b = prev.inputBuffer.startsWith('-') ? prev.inputBuffer.substring(1) : '-' + prev.inputBuffer;
          const disp = b.replace('.', ',');
          return { ...prev, inputBuffer: b, display: disp + '_', modifiers: ModifierState.NONE };
        }
        return { ...prev, stack: [-prev.stack[0], prev.stack[1], prev.stack[2], prev.stack[3]], display: formatDisplay(-prev.stack[0], prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE };
      }
      if (key.action === 'FIN') {
        const v = prev.inputBuffer ? parseFloat(prev.inputBuffer) : prev.stack[0];
        const fin = { ...prev.financial };
        if (prev.inputBuffer !== null) {
          // @ts-ignore
          fin[key.value] = v;
          return { ...prev, financial: fin, inputBuffer: null, display: formatDisplay(v, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE };
        }
        const sol = calculateTVM(fin.n, fin.i, fin.PV, fin.PMT, fin.FV, prev.begMode, key.value as 'PV'|'FV'|'PMT');
        // @ts-ignore
        fin[key.value] = sol;
        return { ...prev, financial: fin, stack: pushStack(sol, prev.stack), display: formatDisplay(sol, prev.decimals, prev.displayFormat), modifiers: ModifierState.NONE };
      }
      if (key.id === 'xy') { // Exchange X and Y
          return { ...prev, stack: [prev.stack[1], prev.stack[0], prev.stack[2], prev.stack[3]], display: formatDisplay(prev.stack[1], prev.decimals, prev.displayFormat), inputBuffer: null, modifiers: ModifierState.NONE };
      }
      if (key.id === 'Rdn') { // Roll Down
          return { ...prev, stack: [prev.stack[1], prev.stack[2], prev.stack[3], prev.stack[0]], display: formatDisplay(prev.stack[1], prev.decimals, prev.displayFormat), inputBuffer: null, modifiers: ModifierState.NONE };
      }
      
      // Basic function keys not covered by modifiers or standard ops
      if (key.action === 'FUNC') {
          const x = prev.inputBuffer ? parseFloat(prev.inputBuffer) : prev.stack[0];
          const y = prev.stack[1];
          if (key.value === 'pow') return { ...prev, stack: [Math.pow(y, x), prev.stack[2], prev.stack[3], prev.stack[3]], lastX: x, display: formatDisplay(Math.pow(y, x), prev.decimals, prev.displayFormat), inputBuffer: null, modifiers: ModifierState.NONE };
          if (key.value === 'inv') {
              if (x === 0) return { ...prev, error: 'Error 0', modifiers: ModifierState.NONE };
              return { ...prev, stack: [1/x, y, prev.stack[2], prev.stack[3]], lastX: x, display: formatDisplay(1/x, prev.decimals, prev.displayFormat), inputBuffer: null, modifiers: ModifierState.NONE };
          }
          if (key.value === 'pctT') { 
             if (y === 0) return { ...prev, error: 'Error 0', modifiers: ModifierState.NONE };
             const res = (x / y) * 100;
             return { ...prev, stack: [res, y, prev.stack[2], prev.stack[3]], lastX: x, display: formatDisplay(res, prev.decimals, prev.displayFormat), inputBuffer: null, modifiers: ModifierState.NONE };
          }
          if (key.value === 'dPct') { 
             if (y === 0) return { ...prev, error: 'Error 0', modifiers: ModifierState.NONE };
             const res = ((x - y) / y) * 100;
             return { ...prev, stack: [res, y, prev.stack[2], prev.stack[3]], lastX: x, display: formatDisplay(res, prev.decimals, prev.displayFormat), inputBuffer: null, modifiers: ModifierState.NONE };
          }
          if (key.value === 'pct') { 
             const res = (y * x) / 100;
             return { ...prev, stack: [res, y, prev.stack[2], prev.stack[3]], lastX: x, display: formatDisplay(res, prev.decimals, prev.displayFormat), inputBuffer: null, modifiers: ModifierState.NONE };
          }
          if (key.value === 'EEX') {
              let buf = prev.inputBuffer || '1';
              if (!buf.includes('e')) buf += 'e';
              return { ...prev, inputBuffer: buf, display: buf + '_', modifiers: ModifierState.NONE };
          }
      }

      return { ...prev, modifiers: ModifierState.NONE };
    });
  }, []);

  return { state, handleKeyPress };
};