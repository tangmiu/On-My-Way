const config = window.SUPABASE_CONFIG || {};
const isConfigured =
  /^https:\/\/.+\.supabase\.co$/.test(config.url || "") &&
  !!config.anonKey &&
  !config.anonKey.includes("PASTE_YOUR_");

const state = {
  excuse: null,
  estimated: null,
  startedAt: null,
  timerInterval: null,
  supabase: null,
  demo: !isConfigured
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function formatMinutes(value) {
  const n = Number(value || 0);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function elapsedSeconds() {
  return state.startedAt ? Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000)) : 0;
}

function renderTimer() {
  const sec = elapsedSeconds();
  const min = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  $("#timer").textContent = `${min}:${s}`;
}

function showStatus(text, type = "") {
  const el = document.querySelector(".status-strip");
  el.className = "status-strip" + (type ? ` ${type}` : "");
  el.textContent = text;
}

function demoRows() {
  try { return JSON.parse(localStorage.getItem("tir_demo_rows") || "[]"); }
  catch { return []; }
}

function saveDemoRow(row) {
  const rows = demoRows();
  rows.push(row);
  localStorage.setItem("tir_demo_rows", JSON.stringify(rows.slice(-500)));
}

function median(values) {
  if (!values.length) return 0;
  const a = [...values].sort((x,y) => x-y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m-1] + a[m]) / 2;
}

function buildStats(rows) {
  const actuals = rows.map(r => Number(r.actual_minutes)).filter(Number.isFinite);
  const estimates = rows.map(r => Number(r.estimated_minutes)).filter(Number.isFinite);
  const total = actuals.reduce((a,b) => a+b, 0);
  const avg = actuals.length ? total / actuals.length : 0;
  const med = median(actuals);
  const gaps = rows.map(r => Math.abs(Number(r.actual_minutes) - Number(r.estimated_minutes))).filter(Number.isFinite);
  const excuseMap = {};
  rows.forEach(r => { excuseMap[r.excuse] = (excuseMap[r.excuse] || 0) + 1; });
  return { people: rows.length, avg, median: med, total, gapsAvg: gaps.length ? gaps.reduce((a,b)=>a+b,0)/gaps.length : 0, excuseMap };
}

function renderStats(stats) {
  const values = document.querySelectorAll(".stat-value");
  if (values[0]) values[0].textContent = formatMinutes(stats.people);
  if (values[1]) values[1].textContent = `${formatMinutes(stats.avg)}`;
  if ($("#medianCount")) $("#medianCount").textContent = formatMinutes(stats.median);
  if ($("#waitTotal")) $("#waitTotal").textContent = formatMinutes(stats.total);

  const list = $("#excuseList");
  const entries = Object.entries(stats.excuseMap).sort((a,b)=>b[1]-a[1]);
  list.innerHTML = `<div class="eyebrow">EXCUSE FREQUENCY</div><div class="stat-row">` +
    `จำนวนผู้เข้าร่วมทั้งหมด <span>${stats.people}</span></div>`;
  entries.forEach(([name, count]) => {
    list.insertAdjacentHTML("beforeend",
      `<div class="stat-row"><span>${escapeHtml(name)}</span><span>${count} คน</span></div>`
    );
  });

  $("#dashboardNote").textContent =
    state.demo
      ? "DEMO MODE · ข้อมูลนี้อยู่เฉพาะเครื่องนี้ ยังไม่รวมกับผู้ใช้อื่น"
      : "LIVE · ข้อมูลนี้มาจากฐานข้อมูลกลางของแคมเปญ";
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

async function fetchStats() {
  if (state.demo) {
    renderStats(buildStats(demoRows()));
    return;
  }

  const { data, error } = await state.supabase.rpc("get_dashboard_stats");
  if (error) {
    console.error(error);
    showStatus("DATABASE ERROR · ตรวจสอบ Supabase SQL / Policy", "error");
    $("#dashboardNote").textContent = error.message;
    return;
  }

  const s = data || {};
  renderStats({
    people: Number(s.people || 0),
    avg: Number(s.average_minutes || 0),
    median: Number(s.median_minutes || 0),
    total: Number(s.total_minutes || 0),
    gapsAvg: Number(s.average_gap || 0),
    excuseMap: Object.fromEntries((s.excuses || []).map(x => [x.excuse, Number(x.count)]))
  });
}

async function submitRow(actualMinutes) {
  const row = {
    excuse: state.excuse,
    estimated_minutes: Number(state.estimated),
    actual_minutes: Number(actualMinutes)
  };

  if (state.demo) {
    saveDemoRow(row);
    return { ok: true };
  }

  const { error } = await state.supabase.from("sessions").insert(row);
  if (error) {
    console.error(error);
    return { ok: false, error };
  }
  return { ok: true };
}

function resetRun() {
  state.excuse = null;
  state.estimated = null;
  state.startedAt = null;
  clearInterval(state.timerInterval);
  state.timerInterval = null;
  $$(".excuse-btn").forEach(b => b.classList.remove("selected"));
  $("#estimatedInput").value = "";
  $("#timer").textContent = "00:00";
  $("#finishBtn").classList.remove("show");
  $(".result-box").classList.remove("show");
  $("#startBtn").disabled = false;
}

async function finishRun() {
  if (!state.startedAt) return;
  const actualSeconds = elapsedSeconds();
  const actualMinutes = Math.max(0.1, actualSeconds / 60);

  $("#finishBtn").disabled = true;
  const result = await submitRow(actualMinutes);

  if (!result.ok) {
    $("#finishBtn").disabled = false;
    $(".result-box").classList.add("show");
    $(".result-box").innerHTML = `<div class="result-line">บันทึกไม่สำเร็จ</div><div class="result-sub">ลองตรวจสอบการตั้งค่า Supabase แล้วลองใหม่</div>`;
    return;
  }

  const diff = actualMinutes - Number(state.estimated);
  let message = "";
  if (Math.abs(diff) < 0.5) message = "เกือบตรงเป๊ะ";
  else if (diff < 0) message = `คุณถึงเร็วกว่าเดาที่ตั้งไว้ ${formatMinutes(Math.abs(diff))} นาที`;
  else message = `คุณใช้เวลาจริงมากกว่าที่เดาไว้ ${formatMinutes(diff)} นาที`;

  $(".result-box").innerHTML = `
    <div class="result-line">REAL TIME: ${formatMinutes(actualMinutes)} นาที</div>
    <div class="result-sub">${message} · เหตุผล: ${escapeHtml(state.excuse)}</div>
  `;
  $(".result-box").classList.add("show");
  $("#finishBtn").classList.remove("show");
  clearInterval(state.timerInterval);
  state.timerInterval = null;
  $("#startBtn").disabled = false;
  await fetchStats();
}

function startRun() {
  const estimate = Number($("#estimatedInput").value);
  if (!state.excuse) {
    alert("เลือกเหตุผลก่อน");
    return;
  }
  if (!Number.isFinite(estimate) || estimate < 1 || estimate > 360) {
    alert("ใส่เวลาที่คิดว่าจะถึงระหว่าง 1–360 นาที");
    return;
  }

  state.estimated = estimate;
  state.startedAt = Date.now();
  $("#startBtn").disabled = true;
  $("#finishBtn").classList.add("show");
  $(".result-box").classList.remove("show");
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(renderTimer, 1000);
  renderTimer();
}

async function init() {
  $$(".excuse-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".excuse-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      state.excuse = btn.dataset.excuse;
    });
  });

  $("#startBtn").addEventListener("click", startRun);
  $("#finishBtn").addEventListener("click", finishRun);

  document.querySelector(".nav-btn").addEventListener("click", () => {
    $("#dashboard").scrollIntoView({ behavior: "smooth" });
  });

  if (state.demo) {
    showStatus("DEMO MODE · ยังไม่ได้เชื่อม Supabase");
  } else {
    const { createClient } = window.supabase;
    state.supabase = createClient(config.url, config.anonKey);
    showStatus("SYSTEM · LIVE DATABASE CONNECTED");
  }

  await fetchStats();

  if (!state.demo) {
    try {
      state.supabase
        .channel("sessions-live")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "sessions" }, fetchStats)
        .subscribe();
    } catch (e) {
      console.warn("Realtime subscription unavailable", e);
    }

    setInterval(fetchStats, 15000);
  }
}

init();
