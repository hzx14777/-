// 砚考登录联调脚本：复现前端 RSA + AES(ECB/PKCS7) 加密
// 用法：node login.js <验证码>
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

const BASE = 'http://127.0.0.1:8080';
const PUBLIC_KEY = 'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAKoR8mX0rGKLqzcWmOzbfj64K8ZIgOdHnzkXSOVOZbFu/TJhZ7rFAN+eaGkl3C4buccQd/EjEsj9ir7ijT7h96MCAwEAAQ==';

function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path);
    const data = body ? Buffer.from(body) : null;
    const opts = {
      hostname: u.hostname, port: u.port, path: u.pathname + u.search, method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers)
    };
    if (data) opts.headers['Content-Length'] = data.length;
    const r = http.request(opts, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function pem(b64, type) {
  const lines = b64.match(/.{1,64}/g).join('\n');
  return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----`;
}

function encryptBody(payload, aesKeyStr) {
  const head = crypto.publicEncrypt(
    { key: pem(PUBLIC_KEY, 'PUBLIC KEY'), padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(Buffer.from(aesKeyStr).toString('base64'))
  ).toString('base64');
  const cipher = crypto.createCipheriv('aes-256-ecb', Buffer.from(aesKeyStr), null);
  const enc = Buffer.concat([cipher.update(Buffer.from(payload, 'utf8')), cipher.final()]).toString('base64');
  return { head, enc };
}

(async () => {
  const code = process.argv[2];
  if (!code) {
    const r = await req('GET', '/auth/code');
    const d = JSON.parse(r.body).data;
    fs.writeFileSync('C:/Users/24243/Desktop/考试平台2/oss-run/captcha.png', Buffer.from(d.img, 'base64'));
    fs.writeFileSync('C:/Users/24243/Desktop/考试平台2/oss-run/captcha.json', JSON.stringify({ uuid: d.uuid }));
    console.log('uuid=' + d.uuid, 'captchaEnabled=' + d.captchaEnabled);
    return;
  }
  const { uuid } = JSON.parse(fs.readFileSync('C:/Users/24243/Desktop/考试平台2/oss-run/captcha.json'));
  const aesKey = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345';
  const payload = JSON.stringify({
    tenantId: '000000', username: 'admin', password: 'admin123',
    clientId: 'e5cd7e4891bf95d1d19206ce24a7b32e', grantType: 'password',
    code, uuid
  });
  const { head, enc } = encryptBody(payload, aesKey);
  const r = await req('POST', '/auth/login', enc, { 'encrypt-key': head });
  console.log('status', r.status);
  try {
    const j = JSON.parse(r.body);
    if (j.data && j.data.access_token) fs.writeFileSync('C:/Users/24243/Desktop/考试平台2/oss-run/token.txt', j.data.access_token);
    console.log(JSON.stringify(j).slice(0, 500));
  } catch (e) { console.log(r.body.slice(0, 400)); }
})();
