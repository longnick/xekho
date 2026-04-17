const fs = require('fs');

// PATCH ai-ui.js
let uiCode = fs.readFileSync('d:\\APP.POS\\ai-ui.js', 'utf8');

uiCode = uiCode.replace(
  /const wordToNum = \{'m[^]*?hai mươi':20\};/,
  `const wordToNum = {
    'một':1,'mốt':1,'hai':2,'ba':3,'bốn':4,'bón':4,'tư':4,'năm':5,'lăm':5,'sáu':6,'bảy':7,'bẩy':7,'tám':8,'chín':9,'mười':10,
    'mươi':10,'mười một':11,'mười hai':12,'mười ba':13,'mười bốn':14,'mười lăm':15,'mười sáu':16,'mười bảy':17,'mười tám':18,'mười chín':19,
    'hai mươi':20,'hai mốt':21,'hai hai':22,'hai ba':23,'hai tư':24,'hai lăm':25,'hai sáu':26,'hai bảy':27,'hai tám':28,'hai chín':29,'ba mươi':30,
    'ba mốt':31,'ba hai':32,'ba ba':33,'ba tư':34,'ba lăm':35,'ba sáu':36,'ba bảy':37,'ba tám':38,'ba chín':39,'bốn mươi':40,
    'bốn mốt':41,'bốn hai':42,'bốn ba':43,'bốn tư':44,'bốn lăm':45,'bốn sáu':46,'bốn bảy':47,'bốn tám':48,'bốn chín':49,'năm mươi':50
  };`
);

uiCode = uiCode.replace(
  /const aliases = \{[^]*?'ngọt': 'sting'\r?\n\s*\};/,
  `const aliases = {
    'cọp trắng': 'tiger bạc',
    'cọp nâu': 'tiger nâu',
    'ken lùn': 'ken lớn',
    'đào': 'trà đào',
    'tắc': 'trà tắc',
    'set 1': 'hoàng hôn trên biển',
    'set 2': 'đêm huyền diệu',
    'set 3': 'không say không về',
    'cút': 'trứng cút thảo mộc',
    'trứng cút': 'trứng cút thảo mộc',
    'ngọt': 'sting',
    'sài gòn xanh': 'bia sài gòn special',
    'sài gòn đỏ': 'bia sài gòn export',
    'trà chanh': 'trà chanh sả',
    'nước suối': 'aquafina',
    'bò húc': 'redbull',
    'khoai tây': 'khoai tây chiên',
    'khoai lang': 'khoai lang kén',
    'hướng dương': 'hạt hướng dương',
    'khô gà': 'khô gà lá chanh',
    'khô bò': 'khô bò vắt chanh'
  };`
);

fs.writeFileSync('d:\\APP.POS\\ai-ui.js', uiCode);

// PATCH ai-core.js
let coreCode = fs.readFileSync('d:\\APP.POS\\ai-core.js', 'utf8');

coreCode = coreCode.replace(
  /const wordNum\s*=\s*\/\(\?:hai muoi\|muoi chin\|[^]+?\}\s*;\s*/,
  `const wordNum   = /(?:nam muoi|bon mươi|ba mươi|hai muoi|muoi chin|muoi tam|muoi bay|muoi sau|muoi lam|muoi bon|muoi ba|muoi hai|muoi mot|mot|mot|hai|ba|bon|tu|nam|lam|sau|bay|tam|chin|muoi)\\s*$/i.exec(beforeStr);

      const wordNumMap = {
        'nam muoi': 50,
        'bon muoi': 40,
        'ba muoi': 30,
        'hai muoi': 20,
        'muoi chin': 19,
        'muoi tam': 18,
        'muoi bay': 17,
        'muoi sau': 16,
        'muoi lam': 15,
        'muoi bon': 14,
        'muoi ba': 13,
        'muoi hai': 12,
        'muoi mot': 11,
        mot:1, hai:2, ba:3, bon:4, tu:4, nam:5, lam:5, sau:6, bay:7, tam:8, chin:9, muoi:10
      };
      `
);

fs.writeFileSync('d:\\APP.POS\\ai-core.js', coreCode);

console.log('Patched ai-ui.js and ai-core.js');
