import { KeyDefinition } from './types';

// HP 12C Platinum Key Layout
// fLabel = Orange text (Above Key on Chassis)
// gLabel = Blue text (Bottom of Key Face)
// label = White text (Center of Key Face)

export const CALCULATOR_KEYS: KeyDefinition[][] = [
  // ROW 1: Financial
  [
    { id: 'n', label: 'n', fLabel: 'AMORT', gLabel: '12x', action: 'FIN', value: 'n' },
    { id: 'i', label: 'i', fLabel: 'INT', gLabel: '12÷', action: 'FIN', value: 'i' },
    { id: 'PV', label: 'PV', fLabel: 'NPV', gLabel: 'CFo', action: 'FIN', value: 'PV' },
    { id: 'PMT', label: 'PMT', fLabel: 'RND', gLabel: 'CFj', action: 'FIN', value: 'PMT' },
    { id: 'FV', label: 'FV', fLabel: 'IRR', gLabel: 'Nj', action: 'FIN', value: 'FV' },
    { id: 'CHS', label: 'CHS', fLabel: 'RPN', gLabel: 'DATE', action: 'CHS' },
    { id: '7', label: '7', fLabel: 'ALG', gLabel: 'BEG', action: 'NUM', value: 7 },
    { id: '8', label: '8', fLabel: '', gLabel: 'END', action: 'NUM', value: 8 },
    { id: '9', label: '9', fLabel: '', gLabel: 'MEM', action: 'NUM', value: 9 },
    { id: 'DIV', label: '÷', fLabel: '', gLabel: '', action: 'OP', value: '/' },
  ],
  // ROW 2: Math & Scientific
  [
    { id: 'yx', label: 'y^x', fLabel: 'PRICE', gLabel: '√x', action: 'FUNC', value: 'pow' },
    { id: 'inv', label: '1/x', fLabel: 'YTM', gLabel: 'e^x', action: 'FUNC', value: 'inv' },
    { id: 'pctT', label: '%T', fLabel: 'SL', gLabel: 'LN', action: 'FUNC', value: 'pctT' },
    { id: 'dPct', label: 'Δ%', fLabel: 'SOYD', gLabel: 'FRAC', action: 'FUNC', value: 'dPct' },
    { id: 'pct', label: '%', fLabel: 'DB', gLabel: 'INTG', action: 'FUNC', value: 'pct' },
    { id: 'EEX', label: 'EEX', fLabel: 'ALG', gLabel: 'ΔDYS', action: 'FUNC', value: 'EEX' },
    { id: '4', label: '4', fLabel: '', gLabel: '', action: 'NUM', value: 4 },
    { id: '5', label: '5', fLabel: '', gLabel: '', action: 'NUM', value: 5 },
    { id: '6', label: '6', fLabel: '', gLabel: 'x̄w', action: 'NUM', value: 6 },
    { id: 'MUL', label: '×', fLabel: '', gLabel: 'x²', action: 'OP', value: '*' },
  ],
  // ROW 3: Stack & Clear (Enter starts here)
  [
    { id: 'RS', label: 'R/S', fLabel: 'P/R', gLabel: 'PSE', action: 'FUNC', value: 'RS' },
    { id: 'SST', label: 'SST', fLabel: 'Σ', gLabel: 'BST', action: 'FUNC', value: 'SST' },
    { id: 'Rdn', label: 'R↓', fLabel: 'PRGM', gLabel: 'GTO', action: 'FUNC', value: 'rdn' },
    { id: 'xy', label: 'x≷y', fLabel: 'FIN', gLabel: 'x≤y', action: 'FUNC', value: 'swap' },
    { id: 'CLX', label: 'CLx', fLabel: 'REG', gLabel: 'x=0', action: 'CLR' },
    { id: 'ENTER', label: 'ENTER', fLabel: 'PREFIX', gLabel: '', action: 'ENTER', className: 'row-span-2' },
    { id: '1', label: '1', fLabel: '', gLabel: 'x̂,r', action: 'NUM', value: 1 },
    { id: '2', label: '2', fLabel: '', gLabel: 'ŷ,r', action: 'NUM', value: 2 },
    { id: '3', label: '3', fLabel: '', gLabel: 'n!', action: 'NUM', value: 3 },
    { id: 'SUB', label: '-', fLabel: '', gLabel: '', action: 'OP', value: '-' },
  ],
  // ROW 4: Bottom (Enter continues in col 6, so we skip it in the array or handle in grid)
  [
    { id: 'ON', label: 'ON', fLabel: 'OFF', gLabel: '', action: 'PWR' },
    { id: 'f', label: 'f', fLabel: '', gLabel: '', action: 'MOD', value: 'F' },
    { id: 'g', label: 'g', fLabel: '', gLabel: '', action: 'MOD', value: 'G' },
    { id: 'STO', label: 'STO', fLabel: '', gLabel: '(', action: 'FUNC', value: 'STO' },
    { id: 'RCL', label: 'RCL', fLabel: '', gLabel: ')', action: 'FUNC', value: 'RCL' },
    // Col 6 is occupied by ENTER
    { id: '0', label: '0', fLabel: '', gLabel: 'x̄', action: 'NUM', value: 0 },
    { id: 'DOT', label: '.', fLabel: '', gLabel: 's', action: 'DOT' },
    { id: 'SIGMA', label: 'Σ+', fLabel: '', gLabel: 'Σ-', action: 'FUNC', value: 'sigma' },
    { id: 'ADD', label: '+', fLabel: '', gLabel: 'LST x', action: 'OP', value: '+' },
  ]
];