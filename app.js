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
 const themes={
  early:{bg:"#E7F1E8",paper:"#FFF9EF",accent:"#73C48B",soft:"#CBE6D1",hair:"#D9B18A",hairHi:"#F5D8B8",coat:"#6B8D7A",shirt:"#F9F1E5",skin:"#F2C6B5",skin2:"#D98D82",ink:"#304139"},
  ontime:{bg:"#E3F1F5",paper:"#FFF9EF",accent:"#63BCD0",soft:"#C9E6ED",hair:"#594A48",hairHi:"#92746A",coat:"#7FAAB7",shirt:"#FAF1E4",skin:"#F2C7B7",skin2:"#D78D84",ink:"#34434A"},
  near:{bg:"#FFF0D1",paper:"#FFF9EF",accent:"#DFAE4D",soft:"#F3DDAF",hair:"#6B4C43",hairHi:"#B9836D",coat:"#BE896A",shirt:"#FAF0E2",skin:"#F1C2AF",skin2:"#D47F77",ink:"#4A3934"},
  late:{bg:"#F7E2E8",paper:"#FFF9EF",accent:"#DF7D8E",soft:"#EEC5CF",hair:"#403F48",hairHi:"#78717C",coat:"#876C80",shirt:"#FAF0E4",skin:"#EFC1B2",skin2:"#CC7B79",ink:"#453C45"}
 };
 const c=themes[p.tone]||themes.ontime;
 const left=64,width=952;
 const rr=(x,y,w,h,r,fill,stroke)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}};
 const circle=(x,y,r,fill,stroke)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}};
 const path=(fill,stroke,w,fn)=>{ctx.beginPath();fn();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w||2;ctx.stroke()}};
 const line=(x1,y1,x2,y2,color,w=3)=>{ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()};
 const text=(v,x,y,font,fill,align="left")=>{ctx.font=font;ctx.fillStyle=fill;ctx.textAlign=align;ctx.fillText(String(v??""),x,y);ctx.textAlign="left"};
 const wrap=(v,max,font)=>{ctx.font=font;const words=String(v||"").split(/\s+/),out=[];let cur="";for(const word of words){const test=cur?cur+" "+word:word;if(ctx.measureText(test).width>max&&cur){out.push(cur);cur=word}else cur=test}if(cur)out.push(cur);return out};
 const star=(x,y,s,color)=>path(color,null,0,()=>{for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?s:s*.42,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath()});
 const clock=(x,y,r,color)=>{circle(x,y,r,"rgba(255,255,255,.72)",color);line(x,y,x,y-r*.48,color,4);line(x,y,x+r*.32,y+r*.18,color,4);circle(x,y,4,color)};
 const strand=(a,b,cx,cy,d,e,color,w)=>{ctx.strokeStyle=color;ctx.lineWidth=w||5;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(a,b);ctx.quadraticCurveTo(cx,cy,d,e);ctx.stroke()};

 // Background.
 ctx.fillStyle=c.bg;ctx.fillRect(0,0,1080,1920);
 const wash=ctx.createLinearGradient(0,0,1080,1920);wash.addColorStop(0,"rgba(255,255,255,.56)");wash.addColorStop(.5,"rgba(255,248,234,.08)");wash.addColorStop(1,"rgba(255,255,255,.32)");ctx.fillStyle=wash;ctx.fillRect(0,0,1080,1920);
 ctx.globalAlpha=.5;circle(120,275,175,c.soft);circle(960,455,175,c.soft);circle(930,1695,205,c.soft);ctx.globalAlpha=1;
 text("TIME IS RESPECT",left,58,"800 34px 'IBM Plex Mono',monospace",c.ink);
 text("YOUR TIME PERSONALITY",left,105,"600 18px 'IBM Plex Mono',monospace","#796A5F");
 line(left,148,left+width,148,"rgba(74,57,48,.18)",2);

 // Illustration frame.
 rr(left,186,width,650,44,c.paper,"rgba(74,57,48,.10)");
 circle(170,715,145,c.soft);circle(900,285,145,c.soft);star(157,296,17,c.accent);star(920,700,13,c.accent);
 ctx.fillStyle="rgba(74,57,48,.10)";ctx.beginPath();ctx.ellipse(540,803,205,25,0,0,Math.PI*2);ctx.fill();

 // Detailed character: intentionally portrait-like, not mascot-like.
 const cx=540,headY=405;
 // torso + arms
 rr(cx-165,585,330,224,72,c.coat);
 rr(cx-193,646,70,155,34,c.coat);rr(cx+123,646,70,155,34,c.coat);
 circle(cx-160,801,29,c.skin);circle(cx+160,801,29,c.skin);
 // hands with fingers
 for(const side of [-1,1]){
   const hx=cx+side*160,hy=795;
   line(hx,hy-8,hx+side*25,hy-25,"rgba(150,82,76,.45)",3);
   line(hx+side*3,hy-2,hx+side*28,hy-4,"rgba(150,82,76,.4)",3);
 }
 // layered shirt/collar
 path(c.shirt,null,0,()=>{ctx.moveTo(cx-58,570);ctx.lineTo(cx,625);ctx.lineTo(cx+58,570);ctx.lineTo(cx+38,780);ctx.lineTo(cx-38,780);ctx.closePath()});
 line(cx-58,570,cx,625,"rgba(74,57,48,.18)",4);line(cx+58,570,cx,625,"rgba(74,57,48,.18)",4);
 // neck
 ctx.fillStyle=c.skin;ctx.fillRect(cx-42,492,84,105);
 ctx.globalAlpha=.2;ctx.fillStyle=c.skin2;ctx.beginPath();ctx.ellipse(cx,535,55,55,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;

 // Ears + face.
 circle(cx-111,407,28,c.skin);circle(cx+111,407,28,c.skin);
 path(c.skin,null,0,()=>{ctx.moveTo(cx-109,315);ctx.bezierCurveTo(cx-128,365,cx-108,465,cx,528);ctx.bezierCurveTo(cx+108,465,cx+128,365,cx+109,315);ctx.bezierCurveTo(cx+52,235,cx-52,235,cx-109,315);ctx.closePath()});
 // jaw shadow and blush
 ctx.globalAlpha=.14;circle(cx-74,444,25,c.skin2);circle(cx+74,444,25,c.skin2);ctx.globalAlpha=1;
 line(cx-35,507,cx-15,520,"rgba(150,80,78,.18)",4);line(cx+35,507,cx+15,520,"rgba(150,80,78,.18)",4);

 // Hair: fuller, layered, with many strands and highlights.
 if(p.tone==="early"){
  path(c.hair,null,0,()=>{ctx.moveTo(cx-135,365);ctx.bezierCurveTo(cx-147,242,cx-60,178,cx+10,194);ctx.bezierCurveTo(cx+104,178,cx+145,260,cx+128,353);ctx.bezierCurveTo(cx+105,323,cx+80,290,cx+48,263);ctx.bezierCurveTo(cx+25,304,cx-35,342,cx-92,358);ctx.closePath()});
  strand(cx-112,324,cx-80,235,cx-26,211,c.hairHi,12);strand(cx-66,309,cx-18,222,cx+34,211,c.hairHi,9);strand(cx-13,286,cx+30,218,cx+76,252,c.hairHi,8);strand(cx+34,267,cx+76,246,cx+101,290,c.hairHi,7);
 }else if(p.tone==="ontime"){
  path(c.hair,null,0,()=>{ctx.moveTo(cx-133,363);ctx.bezierCurveTo(cx-140,236,cx-63,184,cx,195);ctx.bezierCurveTo(cx+78,184,cx+140,236,cx+133,363);ctx.lineTo(cx+102,477);ctx.lineTo(cx+61,465);ctx.lineTo(cx+68,297);ctx.bezierCurveTo(cx+18,264,cx-18,264,cx-68,297);ctx.lineTo(cx-61,465);ctx.lineTo(cx-102,477);ctx.closePath()});
  strand(cx-82,303,cx-48,232,cx-5,214,c.hairHi,9);strand(cx-30,270,cx+10,210,cx+51,224,c.hairHi,8);strand(cx+24,230,cx+69,245,cx+91,303,c.hairHi,8);
 }else if(p.tone==="near"){
  path(c.hair,null,0,()=>{ctx.moveTo(cx-138,371);ctx.bezierCurveTo(cx-145,241,cx-61,184,cx+15,198);ctx.bezierCurveTo(cx+96,187,cx+145,257,cx+133,349);ctx.bezierCurveTo(cx+100,328,cx+76,301,cx+55,273);ctx.bezierCurveTo(cx+42,312,cx-17,344,cx-96,365);ctx.closePath()});
  strand(cx-108,321,cx-72,238,cx-25,214,c.hairHi,10);strand(cx-60,302,cx-11,214,cx+35,220,c.hairHi,8);strand(cx-6,278,cx+40,224,cx+82,267,c.hairHi,7);
 }else{
  path(c.hair,null,0,()=>{ctx.moveTo(cx-140,382);ctx.bezierCurveTo(cx-150,225,cx-65,169,cx+8,190);ctx.bezierCurveTo(cx+110,170,cx+151,251,cx+137,370);ctx.lineTo(cx+101,507);ctx.lineTo(cx+59,443);ctx.lineTo(cx+68,289);ctx.bezierCurveTo(cx+12,249,cx-25,259,cx-62,302);ctx.lineTo(cx-84,474);ctx.lineTo(cx-117,520);ctx.closePath()});
  strand(cx-101,323,cx-57,222,cx-4,203,c.hairHi,10);strand(cx-50,293,cx-4,202,cx+46,216,c.hairHi,8);strand(cx+5,270,cx+55,213,cx+91,259,c.hairHi,7);
 }
 // Hair wisps.
 strand(cx-104,358,cx-128,335,cx-130,306,"rgba(255,255,255,.42)",4);
 strand(cx+92,344,cx+125,321,cx+128,292,"rgba(255,255,255,.38)",4);

 // Anime/editorial facial rendering: brows, large eyes, iris, highlights, nose and lips.
 ctx.strokeStyle=c.ink;ctx.lineWidth=6;ctx.lineCap="round";
 ctx.beginPath();ctx.moveTo(cx-80,350);ctx.quadraticCurveTo(cx-51,331,cx-20,345);ctx.moveTo(cx+20,345);ctx.quadraticCurveTo(cx+51,331,cx+80,350);ctx.stroke();
 // eye whites
 path("#FFFDF8",c.ink,4,()=>{ctx.ellipse(cx-50,382,29,21,0,0,Math.PI*2)});path("#FFFDF8",c.ink,4,()=>{ctx.ellipse(cx+50,382,29,21,0,0,Math.PI*2)});
 // irises
 const iris=c.tone==="early"?"#7E9E7F":c.tone==="ontime"?"#6D9FA9":c.tone==="near"?"#9B735C":"#676777";
 circle(cx-49,384,12,iris);circle(cx+49,384,12,iris);circle(cx-49,384,6,c.ink);circle(cx+49,384,6,c.ink);
 circle(cx-45,380,3,"#FFFDF8");circle(cx+53,380,3,"#FFFDF8");
 // lower eye accents
 line(cx-73,408,cx-30,413,"rgba(154,91,88,.5)",3);line(cx+30,413,cx+73,408,"rgba(154,91,88,.5)",3);
 // nose
 ctx.strokeStyle="#B87470";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx,397);ctx.quadraticCurveTo(cx-10,424,cx+7,431);ctx.stroke();
 // lips
 ctx.strokeStyle="#A55E66";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx-19,452);ctx.quadraticCurveTo(cx,442,cx+19,452);ctx.quadraticCurveTo(cx+3,470,cx-19,452);ctx.stroke();
 line(cx-10,463,cx+10,463,"rgba(255,255,255,.72)",3);

 // Character-specific styling.
 if(p.tone==="early"){
  // bright headphones + clip
  ctx.strokeStyle="#777E84";ctx.lineWidth=19;ctx.beginPath();ctx.arc(cx,350,130,Math.PI*1.03,Math.PI*1.97);ctx.stroke();
  circle(cx-130,371,27,"#858B90");circle(cx+130,371,27,"#858B90");circle(cx-130,371,14,"#D8D6D1");circle(cx+130,371,14,"#D8D6D1");
  path(c.accent,null,0,()=>{ctx.moveTo(cx-132,281);ctx.lineTo(cx-105,281);ctx.lineTo(cx-119,306);ctx.lineTo(cx-89,296);ctx.lineTo(cx-112,332);ctx.lineTo(cx-109,311);ctx.lineTo(cx-137,319);ctx.closePath()});
 }else if(p.tone==="ontime"){
  // pearl hair clip / ribbon
  circle(cx+103,295,12,c.accent);circle(cx+103,295,5,"#FFF9EF");
  path("rgba(255,255,255,.8)",null,0,()=>{ctx.moveTo(cx+103,306);ctx.lineTo(cx+83,328);ctx.lineTo(cx+101,321);ctx.lineTo(cx+113,340);ctx.lineTo(cx+116,315);ctx.closePath()});
 }else if(p.tone==="near"){
  // oversized soft hoodie hood + sleepy marks
  ctx.strokeStyle="rgba(255,255,255,.38)";ctx.lineWidth=7;ctx.beginPath();ctx.arc(cx,618,120,.95,2.2);ctx.stroke();
  text("z",cx+112,475,"700 27px sans-serif",c.accent);text("z",cx+140,447,"700 19px sans-serif",c.accent);
 }else{
  // glasses + headphones, editorial cool.
  ctx.strokeStyle=c.ink;ctx.lineWidth=6;ctx.strokeRect(cx-92,359,77,51);ctx.strokeRect(cx+15,359,77,51);line(cx-15,384,cx+15,384,c.ink,5);
  ctx.strokeStyle="#77727A";ctx.lineWidth=18;ctx.beginPath();ctx.arc(cx,350,130,Math.PI*1.03,Math.PI*1.97);ctx.stroke();
  circle(cx-130,371,26,"#77727A");circle(cx+130,371,26,"#77727A");circle(cx-130,371,13,"#CFCAC9");circle(cx+130,371,13,"#CFCAC9");
  line(cx+132,538,cx+194,516,c.accent,5);line(cx+142,560,cx+212,546,c.accent,4);
 }
 clock(cx+(p.tone==="late"?-112:112),650,29,c.accent);

 text("A PORTRAIT OF YOUR TIMING",540,850,"600 16px 'IBM Plex Mono',monospace","#887568","center");

 // Clean information hierarchy.
 rr(left,900,width,720,42,c.paper,"rgba(74,57,48,.10)");
 text(p.tag,left+46,946,"700 21px 'IBM Plex Mono',monospace",c.accent);
 text(p.name,left+46,986,"800 76px Prompt,sans-serif",c.ink);
 const descFont="500 27px Prompt,sans-serif";
 const descLines=wrap(p.desc,840,descFont).slice(0,3);let dy=1096;
 descLines.forEach(l=>{text(l,left+46,dy,descFont,"#66564B");dy+=43});
 line(left+46,dy+8,left+width-46,dy+8,"rgba(74,57,48,.14)",2);
 const my=1240,mw=274,mh=215,mg=35;
 const metrics=[
  ["ESTIMATE",formatMinutes(estimate)+" MIN","เวลาที่คิดไว้",c.soft],
  ["ACTUAL",formatMinutes(actual)+" MIN","เวลาที่ถึงจริง",c.soft],
  ["DIFFERENCE",(diff>0?"+":"")+formatMinutes(diff)+" MIN","คลาดเคลื่อน",c.accent]
 ];
 metrics.forEach((m,i)=>{const x=left+46+i*(mw+mg);rr(x,my,mw,mh,30,m[3],"rgba(74,57,48,.10)");text(m[0],x+24,my+25,"700 17px 'IBM Plex Mono',monospace","#6D5C50");text(m[1],x+24,my+70,"800 33px 'IBM Plex Mono',monospace",c.ink);text(m[2],x+24,my+137,"500 20px Prompt,sans-serif","#6D5C50");if(i===2)clock(x+222,my+166,23,c.ink)});
 text("TIME IS RESPECT",540,1660,"800 26px 'IBM Plex Mono',monospace",c.ink,"center");
 text("เวลาของคุณมีค่า เวลาของคนที่รอก็เหมือนกัน",540,1706,"500 23px Prompt,sans-serif","#66564B","center");
 text("TANG MIU",540,1770,"700 17px 'IBM Plex Mono',monospace","#887568","center");
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
