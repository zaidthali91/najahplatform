#!/usr/bin/env node
// ============================================================
// run.js — تشغيل منصة النجاح بأمر واحد
// الاستخدام: node run.js
// ============================================================
const { spawn, exec } = require('child_process');
const path = require('path');
const fs   = require('fs');
const http = require('http');

const ROOT    = __dirname;
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND= path.join(ROOT, 'frontend');

const C = {
  green:  '\x1b[32m', yellow: '\x1b[33m',
  blue:   '\x1b[34m', red:    '\x1b[31m',
  cyan:   '\x1b[36m', bold:   '\x1b[1m', reset: '\x1b[0m',
};

const log   = (m, c=C.green)  => console.log(`${c}${m}${C.reset}`);
const warn  = (m) => console.log(`${C.yellow}⚠️  ${m}${C.reset}`);
const error = (m) => console.log(`${C.red}❌ ${m}${C.reset}`);
const info  = (m) => console.log(`${C.cyan}ℹ️  ${m}${C.reset}`);
const bold  = (m) => `${C.bold}${m}${C.reset}`;

const wait  = (ms) => new Promise(r => setTimeout(r, ms));

async function checkPort(port, max=30) {
  for (let i=0; i<max; i++) {
    try {
      await new Promise((res,rej) => {
        const req = http.get(`http://localhost:${port}/health`, r => {
          r.statusCode < 500 ? res() : rej();
        });
        req.on('error', rej);
        req.setTimeout(1000, () => { req.destroy(); rej(); });
      });
      return true;
    } catch { await wait(1000); }
  }
  return false;
}

async function main() {
  console.clear();
  console.log(`
${C.blue}${C.bold}╔══════════════════════════════════════╗
║       🎓 منصة النجاح               ║
║   الاختبار الوطني العراقي           ║
╚══════════════════════════════════════╝${C.reset}
`);

  // ── Check Node.js ──
  const nv = process.version;
  const major = parseInt(nv.slice(1));
  if (major < 18) { error(`Node.js ${nv} قديم. يحتاج 18+`); process.exit(1); }
  log(`✅ Node.js ${nv}`);

  // ── Check .env ──
  const envPath = path.join(BACKEND, '.env');
  if (!fs.existsSync(envPath)) {
    const exPath = path.join(BACKEND, '.env.example');
    if (fs.existsSync(exPath)) {
      fs.copyFileSync(exPath, envPath);
      warn('.env لم يكن موجوداً — تم إنشاؤه من .env.example');
      warn('افتح backend/.env وأضف مفاتيحك للإنتاج');
    }
  }
  log('✅ ملف .env موجود');

  // ── Install Backend ──
  if (!fs.existsSync(path.join(BACKEND, 'node_modules'))) {
    log('📦 تثبيت حزم Backend...');
    await new Promise((res, rej) => {
      const p = spawn('npm', ['install'], { cwd: BACKEND, stdio:'pipe' });
      p.on('close', c => c === 0 ? res() : rej(new Error('npm install failed')));
    });
    log('✅ تم تثبيت حزم Backend');
  } else {
    log('✅ حزم Backend مثبتة');
  }

  // ── Start Backend ──
  log('\n🚀 تشغيل Backend...');
  const be = spawn('node', ['src/server.demo.js'], {
    cwd: BACKEND, stdio: ['ignore','pipe','pipe'],
    env: { ...process.env, PORT:'3001', NODE_ENV:'development' }
  });

  be.stdout.on('data', d => {
    const line = d.toString().trim();
    if (line.includes('يعمل') || line.includes('Running') || line.includes('🎓')) {
      log(line, C.green);
    }
  });
  be.stderr.on('data', d => {
    const l = d.toString().trim();
    if (!l.includes('ExperimentalWarning')) warn('Backend: '+l.slice(0,80));
  });

  // Wait for backend
  log('⏳ انتظار Backend على المنفذ 3001...');
  const beOk = await checkPort(3001);
  if (!beOk) { error('فشل تشغيل Backend! راجع الأخطاء أعلاه'); process.exit(1); }
  log('✅ Backend يعمل على http://localhost:3001');

  // ── Frontend ──
  const hasFrontend = fs.existsSync(path.join(FRONTEND, 'package.json'));

  if (hasFrontend) {
    if (!fs.existsSync(path.join(FRONTEND, 'node_modules'))) {
      log('\n📦 تثبيت حزم Frontend (قد يأخذ دقيقتين)...');
      await new Promise((res, rej) => {
        const p = spawn('npm', ['install'], { cwd: FRONTEND, stdio:'pipe' });
        p.on('close', c => c === 0 ? res() : rej());
      }).catch(() => warn('تجاهل خطأ في تثبيت Frontend'));
    }

    // Create .env.local for frontend
    const feEnv = path.join(FRONTEND, '.env.local');
    if (!fs.existsSync(feEnv)) {
      fs.writeFileSync(feEnv, [
        'NEXT_PUBLIC_API_URL=http://localhost:3001',
        'NEXT_PUBLIC_SUPABASE_URL=https://demo.supabase.co',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY=demo_key',
      ].join('\n'));
    }

    log('\n🚀 تشغيل Frontend (Next.js)...');
    const fe = spawn('npm', ['run','dev'], {
      cwd: FRONTEND, stdio: ['ignore','pipe','pipe'],
      env: { ...process.env, PORT:'3000' }
    });
    fe.stdout.on('data', d => {
      const l = d.toString().trim();
      if (l.includes('3000') || l.includes('Ready') || l.includes('Local')) log(l, C.cyan);
    });
    fe.stderr.on('data', d => {
      const l = d.toString().trim();
      if (l.length > 10 && !l.includes('warn')) info('FE: '+l.slice(0,80));
    });

    log('⏳ انتظار Frontend على المنفذ 3000...');
    const feOk = await checkPort(3000, 60);
    if (feOk) log('✅ Frontend يعمل على http://localhost:3000');
    else warn('Frontend لم يبدأ بعد — انتظر قليلاً أو افتح http://localhost:3000 مباشرةً');
  }

  // ── Summary ──
  console.log(`
${C.bold}${C.green}
╔══════════════════════════════════════════════╗
║          ✅ منصة النجاح تعمل!               ║
╠══════════════════════════════════════════════╣
║                                              ║
║  🌐 الواجهة:  http://localhost:3000          ║
║  ⚙️  API:      http://localhost:3001          ║
║  🔍 Health:   http://localhost:3001/health   ║
║                                              ║
║  📋 اختبار الـ API:                          ║
║     POST /api/auth/register                  ║
║     POST /api/auth/login                     ║
║     GET  /api/subjects                       ║
║     GET  /api/questions?subject=english      ║
║                                              ║
╠══════════════════════════════════════════════╣
║  ⚠️  وضع Demo — البيانات في الذاكرة         ║
║  💡 للإنتاج: أضف Supabase + Anthropic key  ║
╚══════════════════════════════════════════════╝
${C.reset}`);

  // ── Keep alive ──
  process.on('SIGINT', () => {
    log('\n👋 إيقاف المنصة...');
    be.kill();
    process.exit(0);
  });

  // Keep running
  await new Promise(() => {});
}

main().catch(e => { error(e.message); process.exit(1); });
