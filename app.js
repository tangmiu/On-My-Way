const config=window.SUPABASE_CONFIG||{};
const isConfigured=/^https:\/\/.+\.supabase\.co$/.test(config.url||"")&&!!config.anonKey&&!config.anonKey.includes("PASTE_YOUR_");
const state={excuse:null,estimated:null,startedAt:null,actualMinutes:null,timerInterval:null,supabase:null,demo:!isConfigured,completed:false,customExcuse:false,dashboardStats:null};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function formatMinutes(v){const n=Number(v||0);if(Number.isInteger(n))return String(n);return Math.abs(n)<1?n.toFixed(2):n.toFixed(1)}
function formatClock(sec){const s=Math.max(0,Math.floor(sec||0));return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function elapsedSeconds(){return state.startedAt?Math.max(0,(Date.now()-state.startedAt)/1000):0}
function median(values){if(!values.length)return 0;const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function timerMessage(sec,estimatedMinutes){const est=Number(estimatedMinutes||0)*60;if(!est)return "“กำลังไป” เริ่มต้นที่นี่";if(sec<est){const remaining=est-sec;if(remaining<=60)return "อีกไม่ถึง 1 นาทีถึงเวลาที่คุณบอกไว้";return "ยังอยู่ในเวลาที่คุณคาดไว้"}if(sec===est)return "ถึงเวลาที่คุณบอกว่าจะถึงแล้ว";const over=sec-est;if(over<300)return "เวลาที่คุณคาดไว้หมดลงแล้ว";if(over<900)return "มีใครบางคนกำลังรอคุณอยู่";return "เวลาของคุณยังเดินต่อ… และเวลาของคนที่รอก็เหมือนกัน"}
function renderTimer(){const sec=elapsedSeconds();$("#timer").textContent=formatClock(sec);$("#timerMessage").textContent=timerMessage(sec,state.estimated);if(state.estimated){const est=Number(state.estimated)*60;const ratio=Math.min(1,sec/est);$("#timerProgress").style.width=(ratio*100)+"%";const over=sec>=est;$("#timeStage").classList.toggle("over",over);$("#stageState").textContent=over?"OVER ESTIMATE":"RUNNING"}}
function showStatus(text,type=""){const el=$("#statusStrip");if(!el)return;el.className="status-strip"+(type?" "+type:"");el.textContent=text}
function demoRows(){try{return JSON.parse(localStorage.getItem("tir_demo_rows")||"[]")}catch{return []}}
function saveDemoRow(row){const rows=demoRows();rows.push(row);localStorage.setItem("tir_demo_rows",JSON.stringify(rows.slice(-500)))}
function buildStats(rows){const validRows=rows.filter(r=>Number.isFinite(Number(r.actual_minutes))&&Number.isFinite(Number(r.estimated_minutes))),actuals=validRows.map(r=>Number(r.actual_minutes)),estimates=validRows.map(r=>Number(r.estimated_minutes)),total=actuals.reduce((a,b)=>a+b,0),avg=actuals.length?total/actuals.length:0,estimatedAvg=estimates.length?estimates.reduce((a,b)=>a+b,0)/estimates.length:0,med=median(actuals),gaps=validRows.map(r=>Number(r.actual_minutes)-Number(r.estimated_minutes)),absGaps=gaps.map(g=>Math.abs(g)),avgAbsoluteError=absGaps.length?absGaps.reduce((a,b)=>a+b,0)/absGaps.length:0,avgDifference=gaps.length?gaps.reduce((a,b)=>a+b,0)/gaps.length:0,lateCount=gaps.filter(g=>g>0).length,earlyCount=gaps.filter(g=>g<0).length,onTimeCount=gaps.filter(g=>g===0).length,excuseMap={};validRows.forEach(r=>{const key=String(r.excuse||"ไม่ระบุ");excuseMap[key]=(excuseMap[key]||0)+1});return{people:validRows.length,avg,estimatedAvg,median:med,total,avgAbsoluteError,avgDifference,lateCount,earlyCount,onTimeCount,excuseMap}}
function renderStats(stats){state.dashboardStats=stats;$("#peopleCount").textContent=formatMinutes(stats.people);$("#avgCount").textContent=formatMinutes(stats.avg);$("#medianCount").textContent=formatMinutes(stats.median);$("#waitTotal").textContent=formatMinutes(stats.total);$("#gapCount").textContent=formatMinutes(stats.avgAbsoluteError);const entries=Object.entries(stats.excuseMap).sort((a,b)=>b[1]-a[1]),list=$("#excuseList");list.innerHTML='<div class="eyebrow">EXCUSE FREQUENCY</div>';if(!entries.length){list.insertAdjacentHTML("beforeend",'<div class="stat-row"><span class="stat-row-name">ยังไม่มีข้อมูล</span><span class="stat-row-num">—</span></div>')}else entries.forEach(([name,count])=>list.insertAdjacentHTML("beforeend",'<div class="stat-row"><span class="stat-row-name">'+escapeHtml(name)+'</span><span class="stat-row-num">'+count+" คน</span></div>"));const n=Number(stats.people||0),avg=Number(stats.avg||0),estimatedAvg=Number(stats.estimatedAvg||0),gap=Number(stats.avgAbsoluteError||0),lateCount=Number(stats.lateCount||0),lateRate=n?lateCount/n*100:0,est=estimatedAvg;if(n===0){$("#storyHeadline").textContent="กำลังรอข้อมูลชุดแรก...";$("#storySub").textContent="ทุกการกด “I’M HERE” จะทำให้ภาพนี้ชัดขึ้น";$("#storyEstimated").textContent="—";$("#storyActual").textContent="—";$("#storyGap").textContent="—"}else{$("#storyHeadline").innerHTML='<em>'+formatMinutes(lateRate)+'%</em> ของผู้เข้าร่วมมาถึงช้ากว่าเวลาที่ตัวเองคาด';const signed=Number(stats.avgDifference||0);const signedText=(signed>0?"+":"")+formatMinutes(signed);$("#storySub").textContent='โดยเฉลี่ยกะไว้ '+formatMinutes(est)+' นาที · ใช้จริง '+formatMinutes(avg)+' นาที · ต่างจากที่คิด '+signedText+' นาที';$("#storyEstimated").textContent=formatMinutes(est);$("#storyActual").textContent=formatMinutes(avg);$("#storyGap").textContent=formatMinutes(gap)}$("#dashboardNote").textContent=state.demo?"DEMO MODE · ข้อมูลนี้อยู่เฉพาะเครื่องนี้ ยังไม่รวมกับผู้ใช้อื่น":"LIVE · ข้อมูลนี้มาจากฐานข้อมูลกลางของแคมเปญ"}
async function fetchStats(){if(state.demo){renderStats(buildStats(demoRows()));return}if(!state.supabase)return;const{data:rows,error}=await state.supabase.from("sessions").select("excuse,estimated_minutes,actual_minutes");if(error){console.error(error);$("#dashboardNote").textContent="LIVE · เชื่อมฐานข้อมูลได้ แต่โหลดสถิติไม่สำเร็จ";return}renderStats(buildStats(rows||[]))}
async function submitRow(actualMinutes){const row={excuse:state.excuse,estimated_minutes:Number(state.estimated),actual_minutes:Number(actualMinutes)};if(state.demo){saveDemoRow(row);return{ok:true}}const{error}=await state.supabase.from("sessions").insert(row);if(error){console.error(error);return{ok:false,error}}return{ok:true}}
function startExperience(){$("#intro").classList.add("hidden");$("#experience").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"})}
function resetRun(){state.excuse=null;state.customExcuse=false;state.estimated=null;state.startedAt=null;state.actualMinutes=null;state.completed=false;clearInterval(state.timerInterval);state.timerInterval=null;$$(".excuse-btn").forEach(b=>b.classList.remove("selected"));$("#estimatedInput").value="";$("#customExcuse").value="";$("#customExcuseWrap").classList.add("hidden");$("#estimateReadout").textContent="—";$("#timer").textContent="00:00";$("#timerMessage").textContent="“กำลังไป” เริ่มต้นที่นี่";$("#stageState").textContent="READY";$("#timeStage").classList.remove("running","over");$("#finishBtn").classList.remove("show");$("#startBtn").disabled=false;$("#resultBox").classList.remove("show");$("#shareBtn").classList.remove("show");$("#resetBtn").classList.remove("show");$("#youVsEveryone").classList.add("hidden");$("#timerProgress").style.width="0%";$("#resultPage").classList.add("hidden");$("#experience").classList.remove("hidden");window.scrollTo({top:$("#experience").offsetTop-20,behavior:"smooth"})}
async function finishRun(){if(!state.startedAt)return;const actualSeconds=elapsedSeconds(),actualMinutes=actualSeconds/60;$("#finishBtn").disabled=true;const result=await submitRow(actualMinutes);if(!result.ok){$("#finishBtn").disabled=false;$("#resultBox").classList.add("show");$("#resultBox").innerHTML='<div class="receipt-label">DATABASE ERROR</div><div class="receipt-copy">บันทึกไม่สำเร็จ ลองอีกครั้งในอีกสักครู่</div>';return}state.actualMinutes=actualMinutes;state.completed=true;clearInterval(state.timerInterval);state.timerInterval=null;$("#finishBtn").classList.remove("show");$("#resultBox").classList.remove("show");$("#startBtn").disabled=false;await fetchStats();renderComparison();showPersonalityResult();}
function startRun(){const estimate=Number($("#estimatedInput").value);if(state.customExcuse){state.excuse=$("#customExcuse").value.trim();if(!state.excuse){alert("พิมพ์เหตุผลของคุณก่อน");$("#customExcuse").focus();return}}if(!state.excuse){alert("เลือกเหตุผลก่อน");return}if(!Number.isFinite(estimate)||estimate<1||estimate>360){alert("ใส่เวลาที่คิดว่าจะถึงระหว่าง 1–360 นาที");return}state.estimated=estimate;state.actualMinutes=null;state.completed=false;state.startedAt=Date.now();$("#estimateReadout").textContent=formatMinutes(estimate)+" MIN";$("#startBtn").disabled=true;$("#finishBtn").classList.add("show");$("#resultBox").classList.remove("show");$("#resetBtn").classList.remove("show");$("#shareBtn").classList.remove("show");$("#timeStage").classList.add("running");$("#stageState").textContent="RUNNING";clearInterval(state.timerInterval);state.timerInterval=setInterval(renderTimer,1000);renderTimer()}
async function init(){$("#beginBtn").addEventListener("click",startExperience);$("#dashboardBtn").addEventListener("click",()=>$("#dashboard").scrollIntoView({behavior:"smooth"}));$("#resetBtn").addEventListener("click",resetRun);$("#resultResetBtn").addEventListener("click",resetRun);$("#resultDashboardBtn").addEventListener("click",()=>$("#dashboard").scrollIntoView({behavior:"smooth"}));$("#shareBtn").addEventListener("click",shareReceipt);$("#resultShareBtn").addEventListener("click",shareReceipt);$$(".excuse-btn").forEach(btn=>btn.addEventListener("click",()=>{if(state.startedAt)return;$$(".excuse-btn").forEach(b=>b.classList.remove("selected"));btn.classList.add("selected");state.customExcuse=btn.id==="otherExcuseBtn";if(state.customExcuse){$("#customExcuseWrap").classList.remove("hidden");$("#customExcuse").focus();state.excuse=$("#customExcuse").value.trim()||null}else{$("#customExcuseWrap").classList.add("hidden");$("#customExcuse").value="";state.excuse=btn.dataset.excuse}}));$("#customExcuse").addEventListener("input",e=>{if(state.customExcuse)state.excuse=e.target.value.trim()});$("#startBtn").addEventListener("click",startRun);$("#finishBtn").addEventListener("click",finishRun);document.addEventListener("visibilitychange",()=>{if(state.startedAt)renderTimer()});if(state.demo){showStatus("DEMO MODE · ยังไม่ได้เชื่อม Supabase","demo")}else{const{createClient}=window.supabase;state.supabase=createClient(config.url,config.anonKey);showStatus("SYSTEM · LIVE DATABASE CONNECTED")}await fetchStats();if(!state.demo){try{state.supabase.channel("sessions-live").on("postgres_changes",{event:"INSERT",schema:"public",table:"sessions"},fetchStats).subscribe()}catch(e){console.warn("Realtime subscription unavailable",e)}setInterval(fetchStats,15000)}}
init();
function makeReceiptCanvas(){
 const p=getPersonality(),actual=Number(state.actualMinutes),estimate=Number(state.estimated||0),diff=actual-estimate;
 const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1920;
 const ctx=canvas.getContext("2d");ctx.textBaseline="top";
 const palettes={
   early:{bg:"#E7F3E8",paper:"#FFF9EE",accent:"#79C98D",soft:"#CFE9D4",hair:"#D9B08C",jacket:"#7BAE8C",skin:"#F1C5B4",ink:"#3E4940"},
   ontime:{bg:"#E2F3F7",paper:"#FFF9EE",accent:"#67BED2",soft:"#CDEAF0",hair:"#5D514F",jacket:"#8EB9C6",skin:"#F2C7B8",ink:"#3C4B50"},
   near:{bg:"#FFF1D2",paper:"#FFF9EE",accent:"#E6B95B",soft:"#F7DFAD",hair:"#6A5046",jacket:"#D49A72",skin:"#F1C3AF",ink:"#51443A"},
   late:{bg:"#F8E3E8",paper:"#FFF9EE",accent:"#E48594",soft:"#F2C8D0",hair:"#4B4650",jacket:"#A47D91",skin:"#F0C2B4",ink:"#4B3F46"}
 };
 const c=palettes[p.tone]||palettes.ontime;
 const left=64,width=952;
 const round=(x,y,w,h,r,fill,stroke)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}};
 const circle=(x,y,r,fill,stroke)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}};
 const line=(x1,y1,x2,y2,color,w=3)=>{ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()};
 const text=(value,x,y,font,fill,align="left")=>{ctx.fillStyle=fill;ctx.font=font;ctx.textAlign=align;ctx.fillText(String(value||""),x,y);ctx.textAlign="left"};
 const wrap=(value,maxWidth,font)=>{ctx.font=font;const words=String(value||"").split(/\s+/),lines=[];let current="";for(const word of words){const test=current?current+" "+word:word;if(ctx.measureText(test).width>maxWidth&&current){lines.push(current);current=word}else current=test}if(current)lines.push(current);return lines};
 const rr=(x,y,w,h,r,fill)=>round(x,y,w,h,r,fill);
 const drawStar=(x,y,s,color)=>{ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?s:s*.42;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.fill()};
 const drawClock=(x,y,r,color)=>{circle(x,y,r,"rgba(255,255,255,.65)",color);line(x,y,x,y-r*.48,color,4);line(x,y,x+r*.34,y+r*.18,color,4);circle(x,y,5,color)};

 // Soft paper / editorial background.
 ctx.fillStyle=c.bg;ctx.fillRect(0,0,1080,1920);
 const g=ctx.createLinearGradient(0,0,1080,1920);g.addColorStop(0,"rgba(255,255,255,.42)");g.addColorStop(.5,"rgba(255,248,234,.08)");g.addColorStop(1,"rgba(255,255,255,.3)");ctx.fillStyle=g;ctx.fillRect(0,0,1080,1920);
 ctx.globalAlpha=.65;circle(120,260,170,c.soft);circle(955,520,190,c.soft);circle(930,1690,210,c.soft);ctx.globalAlpha=1;

 // Header: deliberately sparse.
 text("TIME IS RESPECT",left,62,"800 34px 'IBM Plex Mono',monospace",c.ink);
 text("YOUR TIME PERSONALITY",left,108,"600 18px 'IBM Plex Mono',monospace","#7A6A5D");
 line(left,150,left+width,150,"rgba(74,57,48,.18)",2);

 // Main illustration frame.
 rr(left,188,width,640,42,c.paper,"rgba(74,57,48,.10)");
 ctx.save();
 ctx.globalAlpha=.5;circle(170,700,150,c.soft);circle(880,285,140,c.soft);ctx.globalAlpha=1;
 drawStar(170,300,18,c.accent);drawStar(905,690,14,c.accent);
 ctx.restore();

 // Character variants: each personality gets a distinct silhouette, outfit and mood.
 const cx=540,ground=790;
 ctx.fillStyle="rgba(74,57,48,.10)";ctx.beginPath();ctx.ellipse(cx,ground,180,24,0,0,Math.PI*2);ctx.fill();

 if(p.tone==="early"){
   // Energetic blond boy / varsity look.
   ctx.fillStyle="#617A6A";ctx.beginPath();ctx.moveTo(cx-122,580);ctx.lineTo(cx+122,580);ctx.quadraticCurveTo(cx+170,665,cx+140,780);ctx.lineTo(cx-140,780);ctx.quadraticCurveTo(cx-170,665,cx-122,580);ctx.fill();
   rr(cx-132,650,72,150,28,"#6E927A");rr(cx+60,650,72,150,28,"#6E927A");
   ctx.fillStyle=c.skin;circle(cx-95,795,28,c.skin);circle(cx+95,795,28,c.skin);
   ctx.fillStyle="#F6D4B6";ctx.fillRect(cx-38,500,76,105);
   ctx.fillStyle=c.skin;ctx.beginPath();ctx.moveTo(cx-105,320);ctx.quadraticCurveTo(cx-115,460,cx,535);ctx.quadraticCurveTo(cx+115,460,cx+105,320);ctx.quadraticCurveTo(cx,245,cx-105,320);ctx.fill();
   ctx.fillStyle=c.hair;ctx.beginPath();ctx.moveTo(cx-120,360);ctx.quadraticCurveTo(cx-110,230,cx,218);ctx.quadraticCurveTo(cx+130,225,cx+122,360);ctx.quadraticCurveTo(cx+70,315,cx+38,275);ctx.quadraticCurveTo(cx,325,cx-95,340);ctx.closePath();ctx.fill();
   ctx.strokeStyle="#E9C39D";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(cx-72,265);ctx.quadraticCurveTo(cx-35,230,cx,238);ctx.moveTo(cx+28,235);ctx.quadraticCurveTo(cx+68,240,cx+90,270);ctx.stroke();
   // eyes, smile, glasses
   ctx.strokeStyle=c.ink;ctx.lineWidth=5;ctx.strokeRect(cx-84,355,70,46);ctx.strokeRect(cx+14,355,70,46);line(cx-14,378,cx+14,378,c.ink,5);
   circle(cx-49,382,6,c.ink);circle(cx+49,382,6,c.ink);line(cx-48,338,cx-18,334,c.ink,5);line(cx+18,334,cx+48,338,c.ink,5);
   ctx.strokeStyle="#B56D68";ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx,430,23,.15,Math.PI-.15);ctx.stroke();
   // lightning pin
   ctx.fillStyle=c.accent;ctx.beginPath();ctx.moveTo(cx-20,605);ctx.lineTo(cx+4,605);ctx.lineTo(cx-12,640);ctx.lineTo(cx+28,625);ctx.lineTo(cx-2,680);ctx.lineTo(cx+4,648);ctx.lineTo(cx-28,660);ctx.closePath();ctx.fill();
   drawClock(cx+112,650,30,c.accent);
 }else if(p.tone==="ontime"){
   // Cute girl / neat bob + cardigan.
   rr(cx-150,585,300,215,62,c.jacket);rr(cx-176,640,58,145,28,c.jacket);rr(cx+118,640,58,145,28,c.jacket);
   circle(cx-145,792,27,c.skin);circle(cx+145,792,27,c.skin);
   ctx.fillStyle=c.skin;ctx.fillRect(cx-36,500,72,95);
   ctx.fillStyle=c.skin;ctx.beginPath();ctx.moveTo(cx-106,320);ctx.quadraticCurveTo(cx-116,455,cx,525);ctx.quadraticCurveTo(cx+116,455,cx+106,320);ctx.quadraticCurveTo(cx,245,cx-106,320);ctx.fill();
   ctx.fillStyle=c.hair;ctx.beginPath();ctx.moveTo(cx-120,350);ctx.quadraticCurveTo(cx-118,215,cx,208);ctx.quadraticCurveTo(cx+118,215,cx+120,350);ctx.lineTo(cx+90,470);ctx.lineTo(cx+55,465);ctx.lineTo(cx+62,300);ctx.quadraticCurveTo(cx,270,cx-62,300);ctx.lineTo(cx-55,465);ctx.lineTo(cx-90,470);ctx.closePath();ctx.fill();
   // headband
   ctx.strokeStyle=c.accent;ctx.lineWidth=14;ctx.beginPath();ctx.arc(cx,345,116,Math.PI*1.02,Math.PI*1.98);ctx.stroke();
   // eyes / cheeks / smile
   circle(cx-47,380,7,c.ink);circle(cx+47,380,7,c.ink);line(cx-70,345,cx-30,342,c.ink,5);line(cx+30,342,cx+70,345,c.ink,5);
   circle(cx-72,425,10,"rgba(228,133,148,.35)");circle(cx+72,425,10,"rgba(228,133,148,.35)");
   ctx.strokeStyle="#B56D68";ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx,435,24,.15,Math.PI-.15);ctx.stroke();
   // cardigan details + watch
   line(cx-70,610,cx-30,770,"rgba(255,255,255,.65)",4);line(cx+70,610,cx+30,770,"rgba(255,255,255,.65)",4);
   drawClock(cx+105,620,28,c.accent);
 }else if(p.tone==="near"){
   // Soft sleepy boy / hoodie + slightly messy hair.
   rr(cx-152,575,304,225,72,c.jacket);rr(cx-178,645,64,150,30,c.jacket);rr(cx+114,645,64,150,30,c.jacket);
   circle(cx-146,794,27,c.skin);circle(cx+146,794,27,c.skin);
   ctx.fillStyle=c.skin;ctx.fillRect(cx-38,500,76,92);
   ctx.fillStyle=c.skin;ctx.beginPath();ctx.moveTo(cx-108,320);ctx.quadraticCurveTo(cx-115,455,cx,525);ctx.quadraticCurveTo(cx+115,455,cx+108,320);ctx.quadraticCurveTo(cx,250,cx-108,320);ctx.fill();
   ctx.fillStyle=c.hair;ctx.beginPath();ctx.moveTo(cx-126,350);ctx.quadraticCurveTo(cx-120,225,cx-35,212);ctx.quadraticCurveTo(cx+20,190,cx+126,270);ctx.quadraticCurveTo(cx+90,290,cx+58,278);ctx.quadraticCurveTo(cx+72,325,cx+35,350);ctx.lineTo(cx+18,290);ctx.quadraticCurveTo(cx-35,350,cx-98,365);ctx.closePath();ctx.fill();
   // sleepy eyes
   ctx.strokeStyle=c.ink;ctx.lineWidth=6;ctx.beginPath();ctx.arc(cx-48,382,22,.1,Math.PI-.1);ctx.stroke();ctx.beginPath();ctx.arc(cx+48,382,22,.1,Math.PI-.1);ctx.stroke();
   line(cx-70,345,cx-28,350,c.ink,5);line(cx+28,350,cx+70,345,c.ink,5);
   ctx.strokeStyle="#B56D68";ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx,435,22,.1,Math.PI-.1);ctx.stroke();
   // hoodie strings / little clock
   line(cx-38,610,cx-18,685,c.ink,4);line(cx+38,610,cx+18,685,c.ink,4);circle(cx,690,10,c.accent);
   drawClock(cx+108,650,30,c.accent);
   text("…",cx+126,470,"700 40px sans-serif",c.accent);
 }else{
   // Cool late boy / headphones + longer hair.
   rr(cx-150,580,300,220,65,c.jacket);rr(cx-182,650,64,145,30,c.jacket);rr(cx+118,650,64,145,30,c.jacket);
   circle(cx-148,792,27,c.skin);circle(cx+148,792,27,c.skin);
   ctx.fillStyle=c.skin;ctx.fillRect(cx-38,500,76,94);
   ctx.fillStyle=c.skin;ctx.beginPath();ctx.moveTo(cx-108,320);ctx.quadraticCurveTo(cx-116,460,cx,528);ctx.quadraticCurveTo(cx+116,460,cx+108,320);ctx.quadraticCurveTo(cx,240,cx-108,320);ctx.fill();
   ctx.fillStyle=c.hair;ctx.beginPath();ctx.moveTo(cx-130,380);ctx.quadraticCurveTo(cx-135,205,cx,190);ctx.quadraticCurveTo(cx+145,205,cx+132,370);ctx.lineTo(cx+92,500);ctx.lineTo(cx+62,440);ctx.lineTo(cx+70,295);ctx.quadraticCurveTo(cx,255,cx-55,300);ctx.lineTo(cx-78,470);ctx.lineTo(cx-112,520);ctx.closePath();ctx.fill();
   // headphones
   ctx.strokeStyle="#6E6870";ctx.lineWidth=18;ctx.beginPath();ctx.arc(cx,350,125,Math.PI*1.03,Math.PI*1.97);ctx.stroke();circle(cx-126,370,25,"#6E6870");circle(cx+126,370,25,"#6E6870");
   // glasses + eyes
   ctx.strokeStyle=c.ink;ctx.lineWidth=6;ctx.strokeRect(cx-87,365,74,48);ctx.strokeRect(cx+13,365,74,48);line(cx-13,389,cx+13,389,c.ink,5);
   circle(cx-49,392,6,c.ink);circle(cx+49,392,6,c.ink);line(cx-68,342,cx-28,338,c.ink,5);line(cx+28,338,cx+68,342,c.ink,5);
   ctx.strokeStyle="#B56D68";ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx,440,23,.15,Math.PI-.15);ctx.stroke();
   // wind lines
   line(cx+125,545,cx+185,525,c.accent,5);line(cx+135,565,cx+205,552,c.accent,4);
   drawClock(cx-112,650,30,c.accent);
 }

 // Small grounding caption only; no clutter.
 text("A PORTRAIT OF YOUR TIMING",540,846,"600 16px 'IBM Plex Mono',monospace","#8A7769","center");

 // Result information is the visual hero.
 rr(left,895,width,710,42,c.paper,"rgba(74,57,48,.10)");
 text(p.tag,left+46,944,"700 21px 'IBM Plex Mono',monospace",c.accent);
 text(p.name,left+46,985,"800 76px Prompt,sans-serif",c.ink);

 const descFont="500 27px Prompt,sans-serif";
 const descLines=wrap(p.desc,840,descFont).slice(0,3);
 let dy=1095;
 descLines.forEach(l=>{text(l,left+46,dy,descFont,"#68584D");dy+=43});
 line(left+46,dy+10,left+width-46,dy+10,"rgba(74,57,48,.14)",2);

 // Three large, high-contrast metrics.
 const my=1235,mw=274,mh=215,mg=35;
 const metrics=[
   ["ESTIMATE",formatMinutes(estimate)+" MIN","เวลาที่คิดไว้",c.soft],
   ["ACTUAL",formatMinutes(actual)+" MIN","เวลาที่ถึงจริง",c.soft],
   ["DIFFERENCE",(diff>0?"+":"")+formatMinutes(diff)+" MIN","คลาดเคลื่อน",c.accent]
 ];
 metrics.forEach((m,i)=>{
   const x=left+46+i*(mw+mg);rr(x,my,mw,mh,30,m[3],"rgba(74,57,48,.10)");
   text(m[0],x+24,my+25,"700 17px 'IBM Plex Mono',monospace","#6D5C50");
   text(m[1],x+24,my+70,"800 34px 'IBM Plex Mono',monospace",c.ink);
   text(m[2],x+24,my+137,"500 20px Prompt,sans-serif","#6D5C50");
   if(i===2)drawClock(x+222,my+165,23,c.ink);
 });

 // One clean closing line and branding.
 text("TIME IS RESPECT",540,1660,"800 26px 'IBM Plex Mono',monospace",c.ink,"center");
 text("เวลาของคุณมีค่า เวลาของคนที่รอก็เหมือนกัน",540,1706,"500 23px Prompt,sans-serif","#6D5C50","center");
 text("TANG MIU",540,1770,"700 17px 'IBM Plex Mono',monospace","#8A7769","center");
 return{canvas,status:p.tag,diff};
}
function canvasToFile(canvas){
 const dataUrl=canvas.toDataURL("image/png");
 const base64=dataUrl.split(",")[1];
 const binary=atob(base64),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return new File([bytes],"time-is-respect-personality.png",{type:"image/png"});
}
async function shareReceipt(){
 if(!state.completed||state.actualMinutes==null)return;
 const file=canvasToFile(makeReceiptCanvas().canvas);
 const shareData={files:[file],title:"TIME IS RESPECT",text:"My Time Personality"};
 try{
   if(typeof navigator.share==="function"){
     let supported=false;
     try{supported=typeof navigator.canShare==="function"?navigator.canShare({files:[file]}):false}catch(e){supported=false}
     if(supported){
       try{await navigator.share(shareData);return}
       catch(e){if(e&&e.name==="AbortError")return;console.warn("Story share unavailable; using download fallback.",e)}
     }
   }
 }catch(e){console.warn("Story share failed; using download fallback.",e)}
 try{
   const url=URL.createObjectURL(file);
   const link=document.createElement("a");
   link.href=url;
   link.download="time-is-respect-personality.png";
   link.style.display="none";
   document.body.appendChild(link);
   link.click();
   link.remove();
   setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(e){
   console.error("Story image download failed.",e);
   alert("เซฟภาพ Story ไม่สำเร็จ ลองรีเฟรชหน้าเว็บแล้วกดอีกครั้ง");
 }
}
function renderComparison(){const box=$("#youVsEveryone");if(!box||!state.completed)return;const stats=state.dashboardStats||{};const everyone=Number(stats.avg||0);const you=Number(state.actualMinutes||0);if(!Number.isFinite(everyone)||!Number.isFinite(you)||everyone<=0||you<=0)return;$("#yourActual").textContent=formatMinutes(you);$("#everyoneActual").textContent=formatMinutes(everyone);const delta=you-everyone;$("#compareStatus").textContent=delta>0?"ABOVE AVERAGE":delta<0?"BELOW AVERAGE":"ON AVERAGE";$("#compareMessage").textContent=delta>0?"ครั้งนี้คุณใช้เวลามากกว่าค่าเฉลี่ยรวม "+formatMinutes(delta)+" นาที":delta<0?"ครั้งนี้คุณใช้เวลาน้อยกว่าค่าเฉลี่ยรวม "+formatMinutes(Math.abs(delta))+" นาที":"ครั้งนี้คุณใช้เวลาเท่ากับค่าเฉลี่ยรวม";box.classList.remove("hidden")}

function getPersonality(){const actual=Number(state.actualMinutes||0),estimate=Math.max(Number(state.estimated||0),.1),diff=actual-estimate;const onTimeTolerance=Math.max(1,estimate*.1),earlyThreshold=-Math.max(2,estimate*.2),nearLateThreshold=Math.max(5,estimate*.5);if(diff<=earlyThreshold)return{emoji:"⚡",name:"สายวาร์ป",tag:"EARLY BIRD MODE",desc:"คุณไม่ได้แค่ไปถึงตรงเวลา — คุณเผื่อเวลาให้ตัวเองอย่างชัดเจน เวลาของคุณเดินเร็วกว่าที่คาดไว้พอสมควร",tone:"early"};if(Math.abs(diff)<=onTimeTolerance)return{emoji:"🎯",name:"สายตรงเป๊ะ",tag:"RIGHT ON TIME",desc:"กะเวลาได้แม่นมาก ความคลาดเคลื่อนอยู่ในช่วงที่ถือว่าใกล้เคียงเวลาที่คุณคาดไว้",tone:"ontime"};if(diff<=nearLateThreshold)return{emoji:"🫠",name:"สายเฉียด",tag:"JUST A LITTLE LATE",desc:"คุณมาถึงช้ากว่าที่คิด แต่ยังไม่หลุดไปไกล ครั้งหน้าขยับเวลาเผื่ออีกนิดก็มีโอกาสเป๊ะขึ้นแล้ว",tone:"near"};return{emoji:"🌪️",name:"สายปล่อยเวลาไหล",tag:"TIME GOT AWAY",desc:"เวลาจริงห่างจากเวลาที่คุณคาดไว้มากพอที่จะกลายเป็นการรอ สำหรับคุณคำว่า “กำลังไป” อาจยาวกว่าที่คิด",tone:"late"}}
function showPersonalityResult(){const p=getPersonality(),actual=Number(state.actualMinutes),estimate=Number(state.estimated),diff=actual-estimate;$("#character").textContent=p.emoji;$("#typeName").textContent=p.name;$("#typeDescription").textContent=p.desc;$("#personalityTag").textContent=p.tag;$("#personalityEstimate").textContent=formatMinutes(estimate);$("#personalityActual").textContent=formatMinutes(actual);$("#personalityGap").textContent=(diff>0?"+":"")+formatMinutes(diff);$("#personalityCard").dataset.type=p.tone;$("#experience").classList.add("hidden");$("#resultPage").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});$("#resultShareBtn").classList.add("show");$("#resultResetBtn").classList.add("show")}
