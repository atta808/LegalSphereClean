const fs = require('fs');
const { parse } = require('@babel/parser');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file));
    } else {
      if (file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

let hasError = false;
getFiles('src/screens').forEach(file => {
  try {
    const code = fs.readFileSync(file, 'utf8');
    parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  } catch (e) {
    console.error(`[ERROR] ${file}: ${e.message}`);
    hasError = true;
  }
});

if (hasError) process.exit(1);
else console.log('All screens passed syntax verification.');
