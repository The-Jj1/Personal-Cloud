const fs = require('fs');
let content = fs.readFileSync('client/src/components/FileManager.jsx', 'utf8');

// Fix the double bracket [[...]] error and add flex-wrap
content = content.replace(/<div className="flex gap-4">\s+\[\[\{/s, '<div className="flex flex-wrap gap-3">\n                    [{');
content = content.replace(/\}\]\]\.map\(c => \(/s, '}]).map(c => (');

// Also for the folder creation modal
content = content.replace(/<div className="flex justify-center gap-3">\s+\["blue"/s, '<div className="flex flex-wrap justify-center gap-2 px-4">\n                ["blue"');

fs.writeFileSync('client/src/components/FileManager.jsx', content);
console.log('Fixed syntax and improved layout for color picker.');
