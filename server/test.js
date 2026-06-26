const b = require('bcryptjs');
b.hash('Admin@123', 12).then(hash => {
  console.log('Hash:', hash);
  return b.compare('Admin@123', hash);
}).then(result => {
  console.log('Match:', result);
});