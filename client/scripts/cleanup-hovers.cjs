const fs = require('fs');
let content = fs.readFileSync('client/src/components/FileManager.jsx', 'utf8');

// 1. Cleanup messy class strings created by previous replacements
content = content.replace(/hover:bg-accent-50 dark:hover:bg-accent-900\/20\/20 dark:hover:bg-accent-50 dark:hover:bg-accent-900\/200\/10/g, 'hover:bg-accent-50/20 dark:hover:bg-accent-500/10');
content = content.replace(/hover:bg-accent-50 dark:hover:bg-accent-900\/20\/30 dark:hover:bg-accent-50 dark:hover:bg-accent-900\/200\/20/g, 'hover:bg-accent-50/30 dark:hover:bg-accent-500/20');

// 2. Fix ANY remaining hover:bg-white
content = content.replace(/hover:bg-white(?!\s+dark:hover)/g, 'hover:bg-white dark:hover:bg-gray-800');
content = content.replace(/hover:bg-white dark:hover:bg-gray-800 dark:bg-gray-900/g, 'hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800');

// 3. Fix bright gray hovers
content = content.replace(/hover:bg-gray-50(?!\s+dark:hover)/g, 'hover:bg-gray-50 dark:hover:bg-gray-800');
content = content.replace(/hover:bg-gray-100(?!\s+dark:hover)/g, 'hover:bg-gray-100 dark:hover:bg-gray-800');

// 4. Ensure dark background elements don't hover to white
content = content.replace(/dark:bg-gray-950\s+hover:bg-gray-50/g, 'dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-800');

fs.writeFileSync('client/src/components/FileManager.jsx', content);
console.log('Cleaned up hover states and removed white glow in dark mode.');
