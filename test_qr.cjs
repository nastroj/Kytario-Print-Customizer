const qrcode = require('qrcode');
const q = qrcode.create('https://kytario.com');
console.log(q.modules.size, typeof q.modules.data);
