/* ==== استبدلي بقيم مشروعك في Supabase ==== */
const SUPABASE_URL = 'https://pgroyirpumfnqgesmdhs.supabase.co';     // Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncm95aXJwdW1mbnFnZXNtZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MzgxNjUsImV4cCI6MjA3MzIxNDE2NX0.nFMHjwDyIgT140by2o6Y-N38Iugl6lImIGUM7fZARF4'; // anon public key
/* ========================================== */

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* الوقت بتوقيت مكة + نافذة 4-6 فجراً */
const TZ='Asia/Riyadh', START_H=0, END_H=5;
function nowStr() {
  return new Intl.DateTimeFormat('ar-SA', { timeZone: TZ, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
}
function hourKSA() {
  return parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour12: false, hour: '2-digit' }).format(new Date()), 10);
}
function isOpen() { const h = hourKSA(); return h >= START_H && h < END_H; }

const $now = document.getElementById('now'), $gate = document.getElementById('gate');
setInterval(() => {
  $now.textContent = nowStr();
  $gate.textContent = 'الحالة: ' + (isOpen() ? 'مفتوح' : 'مغلق');
}, 1000);

/* عناصر الواجهة */
const $studentForm = document.getElementById('student-form');
const $loginBox = document.getElementById('login-box');
const $teacher = document.getElementById('teacher-panel');
const $btnShowLogin = document.getElementById('btnShowLogin');
const $btnLogout = document.getElementById('btnLogout');

/* إظهار صندوق دخول المعلّم */
$btnShowLogin.onclick = () => {
  $loginBox.style.display = 'block';
  window.scrollTo({ top: $loginBox.offsetTop, behavior: 'smooth' });
};

/* دخول/خروج المعلّم */
document.getElementById('btnLogin').onclick = async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  const lerr = document.getElementById('lerr');
  if (error) { lerr.textContent = error.message; return; }
  lerr.textContent = ''; onTeacherSignedIn();
};
$btnLogout.onclick = async () => { await sb.auth.signOut(); onTeacherSignedOut(); };

function onTeacherSignedIn() {
  $studentForm.style.display = 'none';
  $loginBox.style.display = 'none';
  $teacher.style.display = 'block';
  $btnLogout.style.display = 'inline-flex';
  loadRows();
}
function onTeacherSignedOut() {
  $studentForm.style.display = 'block';
  $loginBox.style.display = 'none';
  $teacher.style.display = 'none';
  $btnLogout.style.display = 'none';
}

/* التحقق من جلسة حالية */
sb.auth.getSession().then(({ data }) => {
  if (data.session) { onTeacherSignedIn(); } else { onTeacherSignedOut(); }
});

/* إرسال الطالب */
document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const ok = document.getElementById('ok'), err = document.getElementById('err');
  ok.style.display = 'none'; err.style.display = 'none';
  if (!isOpen()) { err.textContent = 'النموذج يعمل فقط ٤–٦ فجراً (بتوقيت مكة).'; err.style.display = 'inline'; return; }
  const name = document.getElementById('name').value.trim();
  const hifz = document.getElementById('hifz').value.trim();
  const mur = document.getElementById('mur').value.trim();
  const notes = document.getElementById('notes').value.trim();
  const listened = ((new FormData(e.target)).get('listened') === 'نعم');
  if (!name || !hifz || !mur) { err.textContent = 'أكمل الحقول المطلوبة.'; err.style.display = 'inline'; return; }
  const { error } = await sb.from('attendance').insert([{ name, hifz, mur, listened, notes }]);
  if (error) { err.textContent = 'تعذّر الإرسال: ' + error.message; err.style.display = 'inline'; }
  else { ok.style.display = 'inline'; e.target.reset(); }
});

/* لوحة المعلّم: قراءة/تصفية/تصدير */
function ksa(dt) { return new Date(dt).toLocaleString('ar-SA', { timeZone: TZ, hour12: false }); }
async function loadRows(range) {
  let q = sb.from('attendance').select('*').order('created_at', { ascending: false });
  if (range?.from) { q = q.gte('created_at', range.from + 'T00:00:00Z'); }
  if (range?.to) { q = q.lte('created_at', range.to + 'T23:59:59Z'); }
  const { data, error } = await q; if (error) { alert('تعذّر الجلب: ' + error.message); return; }
  document.getElementById('count').textContent = `عدد السجلات: ${data.length}`;
  const tbody = document.querySelector('#tbl tbody');
  tbody.innerHTML = data.map(r => `
    <tr><td>${ksa(r.created_at)}</td><td>${esc(r.name)}</td><td>${esc(r.hifz)}</td>
        <td>${esc(r.mur)}</td><td>${r.listened ? 'نعم' : 'لا'}</td><td>${esc(r.notes || '')}</td></tr>
  `).join('');
  window.__rows = data;
}
function esc(s) { return String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[m])); }

document.getElementById('btnFilter').onclick = () => {
  const from = document.getElementById('from').value || null;
  const to = document.getElementById('to').value || null;
  loadRows({ from, to });
};
document.getElementById('btnToday').onclick = () => {
  const t = new Date().toISOString().slice(0, 10);
  document.getElementById('from').value = t; document.getElementById('to').value = t;
  loadRows({ from: t, to: t });
};
document.getElementById('btnLast7').onclick = () => {
  const to = new Date(); const from = new Date(Date.now() - 6 * 86400000);
  const s = d => d.toISOString().slice(0, 10);
  document.getElementById('from').value = s(from); document.getElementById('to').value = s(to);
  loadRows({ from: s(from), to: s(to) });
};
document.getElementById('btnExport').onclick = () => {
  const rows = (window.__rows || []).map(r => [ksa(r.created_at), r.name, r.hifz, r.mur, r.listened ? 'نعم' : 'لا', r.notes || '']);
  const header = ['التاريخ', 'الاسم', 'الحفظ', 'المراجعة', 'الاستماع', 'الملاحظات'];
  const csv = [header, ...rows].map(a => a.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'attendance.csv'; a.click();
};
