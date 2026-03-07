const fs = require('fs');
let content = fs.readFileSync('client/src/index.css', 'utf8');

const additionalThemes = `
[data-theme="orange"] {
  --accent-50: #fff7ed; --accent-100: #ffedd5; --accent-200: #fed7aa; --accent-300: #fdba74; --accent-400: #fb923c;
  --accent-500: #f97316; --accent-600: #ea580c; --accent-700: #c2410c; --accent-800: #9a3412; --accent-900: #7c2d12;
}
[data-theme="teal"] {
  --accent-50: #f0fdfa; --accent-100: #ccfbf1; --accent-200: #99f6e4; --accent-300: #5eead4; --accent-400: #2dd4bf;
  --accent-500: #14b8a6; --accent-600: #0d9488; --accent-700: #0f766e; --accent-800: #115e59; --accent-900: #134e4a;
}
[data-theme="emerald"] {
  --accent-50: #ecfdf5; --accent-100: #d1fae5; --accent-200: #a7f3d0; --accent-300: #6ee7b7; --accent-400: #34d399;
  --accent-500: #10b981; --accent-600: #059669; --accent-700: #047857; --accent-800: #065f46; --accent-900: #064e3b;
}
[data-theme="cyan"] {
  --accent-50: #ecfeff; --accent-100: #cffafe; --accent-200: #a5f3fc; --accent-300: #67e8f9; --accent-400: #22d3ee;
  --accent-500: #06b6d4; --accent-600: #0891b2; --accent-700: #0e7490; --accent-800: #155e75; --accent-900: #164e63;
}
[data-theme="sky"] {
  --accent-50: #f0f9ff; --accent-100: #e0f2fe; --accent-200: #bae6fd; --accent-300: #7dd3fc; --accent-400: #38bdf8;
  --accent-500: #0ea5e9; --accent-600: #0284c7; --accent-700: #0369a1; --accent-800: #075985; --accent-900: #0c4a6e;
}
[data-theme="indigo"] {
  --accent-50: #eef2ff; --accent-100: #e0e7ff; --accent-200: #c7d2fe; --accent-300: #a5b4fc; --accent-400: #818cf8;
  --accent-500: #6366f1; --accent-600: #4f46e5; --accent-700: #4338ca; --accent-800: #3730a3; --accent-900: #312e81;
}
[data-theme="violet"] {
  --accent-50: #f5f3ff; --accent-100: #ede9fe; --accent-200: #ddd6fe; --accent-300: #c4b5fd; --accent-400: #a78bfa;
  --accent-500: #8b5cf6; --accent-600: #7c3aed; --accent-700: #6d28d9; --accent-800: #5b21b6; --accent-900: #4c1d95;
}
[data-theme="fuchsia"] {
  --accent-50: #fdf4ff; --accent-100: #fae8ff; --accent-200: #f5d0fe; --accent-300: #f0abfc; --accent-400: #e879f9;
  --accent-500: #d946ef; --accent-600: #c026d3; --accent-700: #a21caf; --accent-800: #86198f; --accent-900: #701a75;
}
[data-theme="pink"] {
  --accent-50: #fdf2f8; --accent-100: #fce7f3; --accent-200: #fbcfe8; --accent-300: #f9a8d4; --accent-400: #f472b6;
  --accent-500: #ec4899; --accent-600: #db2777; --accent-700: #be185d; --accent-800: #9d174d; --accent-900: #831843;
}
[data-theme="rose"] {
  --accent-50: #fff1f2; --accent-100: #ffe4e6; --accent-200: #fecdd3; --accent-300: #fda4af; --accent-400: #fb7185;
  --accent-500: #f43f5e; --accent-600: #e11d48; --accent-700: #be123c; --accent-800: #9f1239; --accent-900: #881337;
}
[data-theme="lime"] {
  --accent-50: #f7fee7; --accent-100: #ecfccb; --accent-200: #d9f99d; --accent-300: #bef264; --accent-400: #a3e635;
  --accent-500: #84cc16; --accent-600: #65a30d; --accent-700: #4d7c0f; --accent-800: #3f6212; --accent-900: #365314;
}
`;

content = content.replace('body {', additionalThemes + '\nbody {');
fs.writeFileSync('client/src/index.css', content);
console.log('Added 11 new themes to index.css');
