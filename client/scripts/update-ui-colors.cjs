const fs = require('fs');
let content = fs.readFileSync('client/src/components/FileManager.jsx', 'utf8');

const colors = [
  {name:'blue',hex:'#3b82f6'}, {name:'indigo',hex:'#6366f1'}, {name:'sky',hex:'#0ea5e9'}, {name:'cyan',hex:'#06b6d4'},
  {name:'teal',hex:'#14b8a6'}, {name:'emerald',hex:'#10b981'}, {name:'green',hex:'#22c55e'}, {name:'lime',hex:'#84cc16'},
  {name:'amber',hex:'#f59e0b'}, {name:'orange',hex:'#f97316'}, {name:'red',hex:'#ef4444'}, {name:'rose',hex:'#f43f5e'},
  {name:'pink',hex:'#ec4899'}, {name:'fuchsia',hex:'#d946ef'}, {name:'purple',hex:'#a855f7'}, {name:'violet',hex:'#8b5cf6'},
  {name:'gray',hex:'#6b7280'}
];

// Update settings UI
const oldSettingsColorsStart = content.indexOf("{[{name:'blue',hex:'#3b82f6'}");
const oldSettingsColorsEnd = content.indexOf("].map(c => (", oldSettingsColorsStart);
if (oldSettingsColorsStart !== -1 && oldSettingsColorsEnd !== -1) {
    const newColorsString = JSON.stringify(colors);
    content = content.substring(0, oldSettingsColorsStart) + "{" + newColorsString + content.substring(oldSettingsColorsEnd);
}

// Update getColorHex map
// map = { blue: '#3b82f6', red: '#ef4444', green: '#22c55e', purple: '#a855f7', amber: '#f59e0b', gray: '#6b7280', indigo: '#4f46e5' };
const colorMapString = colors.map(c => `${c.name}: '${c.hex}'`).join(', ');
content = content.replace(/blue: '#3b82f6', red: '#ef4444', green: '#22c55e', \s+purple: '#a855f7', amber: '#f59e0b', gray: '#6b7280', indigo: '#4f46e5'/, colorMapString);

// Update folder colors list
const colorNames = colors.map(c => c.name);
content = content.replace(/\["blue", "red", "green", "purple", "amber", "gray", "indigo"\]\.map\(c => \(/, JSON.stringify(colorNames) + ".map(c => (");
// Also try single quote version
content = content.replace(/\['blue', 'red', 'green', 'purple', 'amber', 'gray', 'indigo'\]\.map\(c => \(/, JSON.stringify(colorNames) + ".map(c => (");

// Update manual color map style
content = content.replace(/style=\{\{ backgroundColor: c === 'blue' \? '#3b82f6' : c === 'red' \? '#ef4444' : c === 'green' \? '#22c55e' : c === 'purple' \? '#a855f7' : c === 'amber' \? '#f59e0b' : c === 'gray' \? '#6b7280' : '#4f46e5' \}\}/, "style={{ backgroundColor: getColorHex(c) }}");

fs.writeFileSync('client/src/components/FileManager.jsx', content);
console.log('Updated colors in FileManager.jsx settings and UI.');
