const API = localStorage.getItem("REAL_PAY_API") || "http://localhost:3000";
let token = localStorage.getItem("REAL_PAY_TOKEN") || "";

const $ = id => document.getElementById(id);
const money = kobo => "₦" + (Number(kobo || 0) / 100).toLocaleString("en-NG", {minimumFractionDigits:2, maximumFractionDigits:2});

async function api(path, options={}) {
  const headers = {"Content-Type":"application/json", ...(options.headers||{})};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API + path, {...options, headers});
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data;
}

function setMessage(id, text, ok=false) {
  const el=$(id); el.textContent=text; el.className="message " + (ok ? "success":"error");
}
function showApp(show) {
  $("authView").classList.toggle("hidden", show);
  $("appView").classList.toggle("hidden", !show);
  $("status").textContent = show ? "Signed in" : "Not signed in";
}

async function load() {
  if (!token) return showApp(false);
  try {
    const me = await api("/api/me");
    showApp(true);
    $("userName").textContent = me.user.name;
    $("userEmail").textContent = me.user.email;
    $("balance").textContent = money(me.user.balance_kobo);
    await Promise.all([loadTasks(), loadLedger(), loadWithdrawals()]);
  } catch(e) {
    token=""; localStorage.removeItem("REAL_PAY_TOKEN"); showApp(false);
    setMessage("authMessage", e.message);
  }
}

async function loadTasks() {
  const tasks = await api("/api/tasks");
  const box=$("tasks"); box.innerHTML="";
  if (!tasks.tasks?.length) { box.innerHTML='<p class="muted">No active tasks right now.</p>'; return; }
  tasks.tasks.forEach(t=>{
    const div=document.createElement("div"); div.className="task";
    div.innerHTML=`<div><h3>${escapeHtml(t.title)}</h3><div class="muted">${escapeHtml(t.description||"")}</div></div>
      <div><div class="reward">${money(t.reward_kobo)}</div><button class="primary complete" data-id="${t.id}">Complete</button></div>`;
    box.appendChild(div);
  });
  box.querySelectorAll(".complete").forEach(btn=>btn.onclick=async()=>{
    btn.disabled=true;
    try { await api(`/api/tasks/${btn.dataset.id}/complete`,{method:"POST"}); await load(); }
    catch(e){ alert(e.message); btn.disabled=false; }
  });
}
async function loadLedger() {
  const data=await api("/api/ledger"); const box=$("ledger"); box.innerHTML="";
  (data.ledger||[]).slice(0,10).forEach(x=>{
    const amount=Number(x.amount_kobo||0), cls=amount>=0?"positive":"negative";
    box.innerHTML+=`<div class="row"><span>${escapeHtml(x.description||x.type)}</span><b class="${cls}">${amount>=0?"+":"-"}${money(Math.abs(amount))}</b></div>`;
  });
  if (!box.innerHTML) box.innerHTML='<p class="muted">No activity yet.</p>';
}
async function loadWithdrawals() {
  const data=await api("/api/withdrawals"); const box=$("withdrawals"); box.innerHTML="";
  (data.withdrawals||[]).slice(0,10).forEach(x=>{
    box.innerHTML+=`<div class="row"><span>${new Date(x.created_at).toLocaleString()}</span><span>${money(x.amount_kobo)} <b class="pill">${escapeHtml(x.status)}</b></span></div>`;
  });
  if (!box.innerHTML) box.innerHTML='<p class="muted">No withdrawal requests yet.</p>';
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

document.querySelectorAll(".tab").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active")); btn.classList.add("active");
  $("loginForm").classList.toggle("hidden",btn.dataset.tab!=="login");
  $("registerForm").classList.toggle("hidden",btn.dataset.tab!=="register");
  $("authMessage").textContent="";
});

$("loginForm").onsubmit=async e=>{
  e.preventDefault(); setMessage("authMessage","Signing in...",true);
  try { const d=await api("/api/auth/login",{method:"POST",body:JSON.stringify({email:$("loginEmail").value,password:$("loginPassword").value})});
    token=d.token; localStorage.setItem("REAL_PAY_TOKEN",token); await load();
  } catch(err){setMessage("authMessage",err.message)}
};
$("registerForm").onsubmit=async e=>{
  e.preventDefault(); setMessage("authMessage","Creating account...",true);
  try { const d=await api("/api/auth/register",{method:"POST",body:JSON.stringify({name:$("regName").value,email:$("regEmail").value,password:$("regPassword").value})});
    token=d.token; localStorage.setItem("REAL_PAY_TOKEN",token); await load();
  } catch(err){setMessage("authMessage",err.message)}
};
$("logoutBtn").onclick=()=>{token="";localStorage.removeItem("REAL_PAY_TOKEN");showApp(false)};
$("refreshBtn").onclick=load;
$("withdrawForm").onsubmit=async e=>{
  e.preventDefault();
  const naira=Number($("withdrawAmount").value);
  if(!Number.isFinite(naira)||naira<=0)return setMessage("withdrawMessage","Enter a valid amount.");
  try { await api("/api/withdrawals",{method:"POST",body:JSON.stringify({amount_kobo:Math.round(naira*100)})});
    setMessage("withdrawMessage","Withdrawal request submitted for review.",true); $("withdrawAmount").value=""; await load();
  } catch(err){setMessage("withdrawMessage",err.message)}
};

load();
