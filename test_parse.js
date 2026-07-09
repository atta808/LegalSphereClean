const fs = require('fs');

const babel = require('@babel/parser');
let hasError = false;

const screensDir = 'src/screens';
const screens = fs.readdirSync(screensDir).filter(f => f.endsWith('.js'));

screens.forEach(screen => {
  try {
     babel.parse(fs.readFileSync(screensDir + '/' + screen, 'utf8'), { sourceType: 'module', plugins: ['jsx', 'flow'] });
  } catch(e) {
     console.log(`Error in ${screen} at ${e.loc.line}:${e.loc.column}: ${e.message}`);
     hasError = true;
  }
});

if (!hasError) console.log("All clear");
