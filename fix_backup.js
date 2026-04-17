const fs = require('fs');

const filePath = 'd:/APP.POS/pos_backup_2026-04-15.json';

try {
  const content = fs.readFileSync(filePath, 'utf8');
  const backup = JSON.parse(content);
  
  if (backup.data && backup.data.expenses) {
    const expenses = backup.data.expenses;
    const initialLength = expenses.length;
    
    // Filter out auto-generated expenses from purchases
    const newExpenses = expenses.filter(e => !(e.category === 'Nhập hàng' || (e.name && e.name.startsWith('Nhập hàng:'))));
    
    const removedCount = initialLength - newExpenses.length;
    
    if (removedCount > 0) {
      backup.data.expenses = newExpenses;
      fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));
      console.log(`Successfully removed ${removedCount} auto-generated expense(s) from the backup.`);
    } else {
      console.log('No auto-generated expenses found in the backup. The file is clean.');
    }
  } else {
    console.log('No expenses array found in the backup file.');
  }
} catch (e) {
  console.error('Error processing backup file:', e);
}
