const fs = require('fs');
let code = fs.readFileSync('d:\\APP.POS\\ai-ui.js', 'utf8');
code = code.replace(/const aliases = \{[\s\S]*?'ngọt': 'sting'\r?\n\s*\};/, 
`const aliases = {
  'cọp trắng': 'tiger bạc',
  'cọp nâu': 'tiger nâu',
  'ken lùn': 'ken lớn',
  'đào': 'trà đào',
  'tắc': 'trà tắc',
  'set 1': 'hoang hon tren bien',
  'set 2': 'đêm huyền diệu',
  'set 3': 'không say không về',
  'cút': 'trứng cút thảo mộc',
  'trứng cút': 'trứng cút thảo mộc',
  'ngọt': 'sting'
};`);
fs.writeFileSync('d:\\APP.POS\\ai-ui.js', code, 'utf8');
