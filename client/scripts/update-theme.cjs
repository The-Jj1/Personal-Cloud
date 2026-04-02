const fs = require('fs');
let content = fs.readFileSync('client/src/components/FileManager.jsx', 'utf8');

// Replace blue- with accent- globally for specific properties
content = content.replace(/\b(bg|text|border|ring|shadow)-blue-/g, '$1-accent-');
content = content.replace(/\bhover:(bg|text|border|ring|shadow)-blue-/g, 'hover:$1-accent-');

// Add theme persistence and logic
content = content.replace(
  "const [theme, setTheme] = useState('light'); // 'light' or 'dark'",
  `const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accentColor') || 'blue');

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor);
    document.documentElement.setAttribute('data-theme', accentColor);
  }, [accentColor]);`
);

// Remove duplicate selectedColor state
content = content.replace("const [selectedColor, setSelectedColor] = useState('blue');\n", "");

// Fix settings accent color mapping
content = content.replace(
  `{['#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f59e0b', '#6b7280'].map(c => (
                      <button key={c} className="w-12 h-12 rounded-full border-4 border-white shadow-md transition-transform hover:scale-110 active:scale-90" style={{ backgroundColor: c }} />
                    ))}`,
  `{[{name:'blue',hex:'#3b82f6'}, {name:'red',hex:'#ef4444'}, {name:'green',hex:'#22c55e'}, {name:'purple',hex:'#a855f7'}, {name:'amber',hex:'#f59e0b'}, {name:'gray',hex:'#6b7280'}].map(c => (
                      <button 
                        key={c.name} 
                        onClick={() => setAccentColor(c.name)} 
                        className={\`w-12 h-12 rounded-full border-4 shadow-md transition-transform hover:scale-110 active:scale-90 \${accentColor === c.name ? 'scale-110 border-accent-500' : 'border-white dark:border-gray-800'}\`} 
                        style={{ backgroundColor: c.hex }} 
                      />
                    ))}`
);

fs.writeFileSync('client/src/components/FileManager.jsx', content);
console.log('FileManager.jsx updated for themes.');
