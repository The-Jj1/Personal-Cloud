const fs = require('fs');
let content = fs.readFileSync('client/src/components/FileManager.jsx', 'utf8');

// Add dark mode classes
content = content.replace(/\bbg-white\b/g, 'bg-white dark:bg-gray-900');
content = content.replace(/\bbg-gray-50\b/g, 'bg-gray-50 dark:bg-gray-950');
content = content.replace(/\bbg-gray-100\b/g, 'bg-gray-100 dark:bg-gray-800');
content = content.replace(/\bbg-gray-200\b/g, 'bg-gray-200 dark:bg-gray-700');
content = content.replace(/\bhover:bg-gray-100\b/g, 'hover:bg-gray-100 dark:hover:bg-gray-800');
content = content.replace(/\bhover:bg-gray-200\b/g, 'hover:bg-gray-200 dark:hover:bg-gray-700');

content = content.replace(/\btext-gray-900\b/g, 'text-gray-900 dark:text-gray-100');
content = content.replace(/\btext-gray-800\b/g, 'text-gray-800 dark:text-gray-200');
content = content.replace(/\btext-gray-700\b/g, 'text-gray-700 dark:text-gray-300');
content = content.replace(/\btext-gray-600\b/g, 'text-gray-600 dark:text-gray-400');
content = content.replace(/\btext-gray-500\b/g, 'text-gray-500 dark:text-gray-400');
content = content.replace(/\btext-gray-400\b/g, 'text-gray-400 dark:text-gray-500');

content = content.replace(/\bborder-gray-100\b/g, 'border-gray-100 dark:border-gray-800');
content = content.replace(/\bborder-gray-200\b/g, 'border-gray-200 dark:border-gray-700');
content = content.replace(/\bborder-gray-300\b/g, 'border-gray-300 dark:border-gray-600');
content = content.replace(/\bborder-b\b/g, 'border-b dark:border-gray-800');
content = content.replace(/\bborder-t\b/g, 'border-t dark:border-gray-800');
content = content.replace(/\bborder-r\b/g, 'border-r dark:border-gray-800');
content = content.replace(/\bborder-l\b/g, 'border-l dark:border-gray-800');

// specifically for main app background and side panel
content = content.replace(/className="flex h-screen bg-gray-50/g, 'className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors');

fs.writeFileSync('client/src/components/FileManager.jsx', content);
console.log('FileManager.jsx updated with dark mode classes.');
