const qrcode = require('qrcode');
const q = qrcode.create('https://kytario.com');
console.log(q.modules.data.slice(0, q.modules.size * 2));
