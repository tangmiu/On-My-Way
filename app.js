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
 const t={
  early:{bg:"#E9F0E8",accent:"#79B58A",soft:"#D3E4D4",hair:"#D8B28D",hairHi:"#F7DEC1",jacket:"#596D68",skin:"#F3C8B6",skinShade:"#D99286",ink:"#33423D"},
  ontime:{bg:"#E9EEF0",accent:"#75B7C5",soft:"#D3E4E8",hair:"#CBAA8B",hairHi:"#F2D2AF",jacket:"#71858C",skin:"#F2C5B5",skinShade:"#D88E84",ink:"#354247"},
  near:{bg:"#F2EBDD",accent:"#D1A15A",soft:"#E9D9B9",hair:"#6C5148",hairHi:"#C38B72",jacket:"#7D675D",skin:"#F0C1AE",skinShade:"#D48179",ink:"#493C38"},
  late:{bg:"#F0E4E7",accent:"#D88493",soft:"#E7CCD2",hair:"#81706A",hairHi:"#B99A8D",jacket:"#5C626D",skin:"#EFC1B1",skinShade:"#CB7D79",ink:"#403C42"}
 }[p.tone]||{bg:"#E9EEF0",accent:"#75B7C5",soft:"#D3E4E8",hair:"#CBAA8B",hairHi:"#F2D2AF",jacket:"#71858C",skin:"#F2C5B5",skinShade:"#D88E84",ink:"#354247"};
 const left=62,width=956;
 const text=(v,x,y,font,fill,align="left")=>{ctx.font=font;ctx.fillStyle=fill;ctx.textAlign=align;ctx.fillText(String(v??""),x,y);ctx.textAlign="left"};
 const rr=(x,y,w,h,r,fill,stroke)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}};
 const line=(x1,y1,x2,y2,color,w=3)=>{ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()};
 const circle=(x,y,r,fill,stroke)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}};
 const path=(fill,stroke,w,fn)=>{ctx.beginPath();fn();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w||2;ctx.stroke()}};
 const wrap=(v,max,font)=>{ctx.font=font;const a=String(v||"").split(/\s+/),out=[];let s="";for(const w of a){const n=s?s+" "+w:w;if(ctx.measureText(n).width>max&&s){out.push(s);s=w}else s=n}if(s)out.push(s);return out};
 const tape=(x,y,w,h,rot)=>{ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.fillStyle="rgba(214,181,126,.58)";ctx.fillRect(-w/2,-h/2,w,h);ctx.restore()};
 const photoPaper=(x,y,w,h,rot)=>{ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.fillStyle="#FFFDF5";ctx.shadowColor="rgba(65,48,38,.16)";ctx.shadowBlur=18;ctx.shadowOffsetY=10;ctx.fillRect(-w/2,-h/2,w,h);ctx.shadowColor="transparent";ctx.fillStyle="#D7C7B3";ctx.fillRect(-w/2+18,-h/2+18,w-36,h-76);ctx.restore()};
 const star=(x,y,s)=>path(t.accent,null,0,()=>{for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?s:s*.42,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath()});
 const clock=(x,y,r,color)=>{circle(x,y,r,"rgba(255,255,255,.72)",color);line(x,y,x,y-r*.48,color,4);line(x,y,x+r*.3,y+r*.16,color,4);circle(x,y,4,color)};

 // Scrapbook/editorial canvas — visual direction follows the supplied reference.
 ctx.fillStyle=t.bg;ctx.fillRect(0,0,1080,1920);
 const grad=ctx.createLinearGradient(0,0,1080,1920);grad.addColorStop(0,"rgba(255,255,255,.52)");grad.addColorStop(.52,"rgba(255,248,236,.12)");grad.addColorStop(1,"rgba(255,255,255,.38)");ctx.fillStyle=grad;ctx.fillRect(0,0,1080,1920);
 ctx.globalAlpha=.45;circle(110,430,180,t.soft);circle(1010,650,190,t.soft);circle(960,1640,230,t.soft);ctx.globalAlpha=1;
 tape(145,185,120,34,-.12);tape(920,835,110,32,.1);
 text("TIME",54,48,"900 italic 38px sans-serif",t.ink);text("IS",58,88,"900 italic 38px sans-serif",t.ink);text("RESPECT",54,128,"900 italic 38px sans-serif",t.ink);
 clock(207,82,28,t.ink);
 text("THE REAL-TIME",54,183,"600 17px 'IBM Plex Mono',monospace","#665950");text("EXCUSE DASHBOARD",54,207,"600 17px 'IBM Plex Mono',monospace","#665950");
 // tiny paper note, but deliberately no dense copy.
 rr(845,55,172,132,16,"#F5EBD8","rgba(74,57,48,.08)");text("GOOD",874,78,"900 27px sans-serif",t.ink);text("THINGS",866,110,"900 27px sans-serif",t.ink);text("TAKE TIME",850,142,"900 23px sans-serif",t.ink);

 // Portrait photograph-style panel.
 rr(36,255,1008,640,34,"#F7F1E7","rgba(74,57,48,.10)");
 ctx.save();ctx.beginPath();ctx.roundRect(48,267,984,616,28);ctx.clip();
 const scene=ctx.createLinearGradient(0,267,0,883);scene.addColorStop(0,"#DCE8EA");scene.addColorStop(.48,"#E9D6BF");scene.addColorStop(1,"#A8B9A8");ctx.fillStyle=scene;ctx.fillRect(48,267,984,616);
 // soft outdoor bokeh
 for(let i=0;i<22;i++){ctx.globalAlpha=.14+(i%4)*.025;circle(85+(i*97)%950,305+(i*61)%470,28+(i%5)*14,i%2?"#FFF9EA":"#78927C");}ctx.globalAlpha=1;
 // distant city/tree shapes
 ctx.fillStyle="rgba(71,88,76,.24)";for(let i=0;i<11;i++){const x=50+i*100;ctx.fillRect(x,690-(i%3)*25,58,193)} 
 // shoulder + oversized jacket
 ctx.fillStyle=t.jacket;ctx.beginPath();ctx.moveTo(180,884);ctx.quadraticCurveTo(195,674,365,620);ctx.quadraticCurveTo(540,570,718,625);ctx.quadraticCurveTo(900,682,950,884);ctx.closePath();ctx.fill();
 // hood folds
 line(250,700,190,832,"rgba(255,255,255,.15)",14);line(810,702,900,842,"rgba(255,255,255,.12)",12);line(325,665,260,815,"rgba(255,255,255,.11)",8);
 // neck
 ctx.fillStyle=t.skin;ctx.fillRect(465,552,116,128);
 // face, three-quarter portrait
 path(t.skin,null,0,()=>{ctx.moveTo(408,342);ctx.bezierCurveTo(395,445,430,565,520,620);ctx.bezierCurveTo(615,578,674,470,648,354);ctx.bezierCurveTo(600,265,470,265,408,342);ctx.closePath()});
 // cheek light / shadow
 ctx.globalAlpha=.13;ctx.fillStyle=t.skinShade;ctx.beginPath();ctx.ellipse(437,485,45,35,-.25,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(606,477,42,32,.2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 // ear
 circle(405,431,34,t.skin);circle(649,417,30,t.skin);
 // hair mass, intentionally lush and portrait-like
 path(t.hair,null,0,()=>{ctx.moveTo(390,380);ctx.bezierCurveTo(370,245,450,176,553,184);ctx.bezierCurveTo(675,190,711,292,660,385);ctx.bezierCurveTo(632,332,606,303,571,284);ctx.bezierCurveTo(530,329,478,344,419,347);ctx.closePath()});
 // long layered bangs
 path(t.hair,null,0,()=>{ctx.moveTo(407,326);ctx.bezierCurveTo(468,318,514,270,548,218);ctx.bezierCurveTo(567,288,603,321,642,337);ctx.bezierCurveTo(618,367,593,392,567,403);ctx.bezierCurveTo(548,355,526,327,500,305);ctx.bezierCurveTo(474,349,441,373,407,386);ctx.closePath()});
 // many fine hair highlights
 const hs=[[417,316,457,240,518,210],[444,325,485,238,548,205],[481,307,520,220,577,216],[526,290,570,222,620,247],[567,300,613,255,648,289]];
 hs.forEach(q=>{ctx.strokeStyle=t.hairHi;ctx.lineWidth=8;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(q[0],q[1]);ctx.quadraticCurveTo(q[2],q[3],q[4],q[5]);ctx.stroke()});
 // eyes with realistic/anime editorial proportions
 ctx.strokeStyle=t.ink;ctx.lineWidth=7;ctx.lineCap="round";
 ctx.beginPath();ctx.moveTo(438,398);ctx.quadraticCurveTo(473,374,507,397);ctx.moveTo(552,393);ctx.quadraticCurveTo(590,366,622,389);ctx.stroke();
 path("#FFFDF8",t.ink,4,()=>{ctx.ellipse(472,413,35,25,-.05,0,Math.PI*2)});path("#FFFDF8",t.ink,4,()=>{ctx.ellipse(587,406,35,25,.05,0,Math.PI*2)});
 circle(475,416,15,"#7D7774");circle(585,409,15,"#7D7774");circle(475,417,7,t.ink);circle(585,410,7,t.ink);circle(480,411,4,"#FFF");circle(590,404,4,"#FFF");
 // brows
 line(437,370,502,364,t.ink,7);line(557,361,621,355,t.ink,7);
 // nose and lips
 ctx.strokeStyle="#B87470";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(535,409);ctx.quadraticCurveTo(526,455,543,465);ctx.stroke();
 ctx.strokeStyle="#A45F66";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(518,493);ctx.quadraticCurveTo(542,480,567,491);ctx.quadraticCurveTo(543,510,518,493);ctx.stroke();
 // glasses like reference
 ctx.strokeStyle=t.ink;ctx.lineWidth=6;ctx.strokeRect(425,375,92,61);ctx.strokeRect(547,370,92,61);line(517,401,548,399,t.ink,5);
 // headphone earcup + headband
 ctx.strokeStyle="#73777B";ctx.lineWidth=20;ctx.beginPath();ctx.arc(528,363,139,Math.PI*1.03,Math.PI*1.98);ctx.stroke();
 circle(393,405,34,"#81858A");circle(393,405,19,"#D7D4CD");circle(660,394,30,"#81858A");circle(660,394,16,"#D7D4CD");
 // cat on shoulder, simplified but expressive
 circle(278,620,55,"#E7E1D7");path("#E7E1D7",null,0,()=>{ctx.moveTo(234,610);ctx.lineTo(230,548);ctx.lineTo(264,576);ctx.lineTo(304,551);ctx.lineTo(317,615);ctx.closePath()});
 circle(260,617,7,t.ink);circle(294,615,7,t.ink);path("#5A4D48",null,0,()=>{ctx.moveTo(270,640);ctx.quadraticCurveTo(278,650,286,640);ctx.quadraticCurveTo(278,632,270,640);ctx.closePath()});
 // cat stripes
 line(250,576,263,595,"#9A887A",5);line(286,574,298,594,"#9A887A",5);
 // hand resting against cheek, reference-like pose
 ctx.fillStyle=t.skin;ctx.beginPath();ctx.moveTo(632,485);ctx.quadraticCurveTo(700,495,727,558);ctx.quadraticCurveTo(735,586,710,596);ctx.quadraticCurveTo(680,580,651,552);ctx.quadraticCurveTo(622,525,632,485);ctx.closePath();ctx.fill();
 line(672,531,710,558,"rgba(153,82,77,.38)",4);line(663,514,704,543,"rgba(153,82,77,.3)",4);
 ctx.restore();
 // torn paper edge
 path("#FFF9EF",null,0,()=>{ctx.moveTo(38,792);for(let x=38;x<=1042;x+=42)ctx.lineTo(x,792+(x%84?8:-4));ctx.lineTo(1042,906);ctx.lineTo(38,906);ctx.closePath()});
 tape(100,796,120,34,-.08);tape(948,796,120,34,.08);
 star(930,338,18);star(118,690,13);

 // Information area: no tiny scrapbook copy, only important data.
 rr(left,925,width,685,42,"#FFF9EF","rgba(74,57,48,.12)");
 text("YOUR TIME PERSONALITY",left+42,963,"700 20px 'IBM Plex Mono',monospace","#76675D");
 text(p.name,left+42,1006,"900 73px Prompt,sans-serif",t.ink);
 const df="500 27px Prompt,sans-serif";const dl=wrap(p.desc,842,df).slice(0,3);let yy=1105;dl.forEach(s=>{text(s,left+42,yy,df,"#5F5148");yy+=42});
 line(left+42,yy+8,left+width-42,yy+8,"rgba(74,57,48,.15)",2);
 const cards=[["ESTIMATE",formatMinutes(estimate)+" MIN","เวลาที่คิดไว้",t.soft],["ACTUAL",formatMinutes(actual)+" MIN","เวลาที่ถึงจริง","#F0D3DB"],["DIFFERENCE",(diff>0?"+":"")+formatMinutes(diff)+" MIN","คลาดเคลื่อน",t.soft]];
 const mw=274,mh=194,gap=35,cy=1240;
 cards.forEach((m,i)=>{const x=left+42+i*(mw+gap);rr(x,cy,mw,mh,28,m[3],"rgba(74,57,48,.08)");text(m[0],x+22,cy+23,"700 17px 'IBM Plex Mono',monospace","#6D5C50");text(m[1],x+22,cy+70,"900 31px 'IBM Plex Mono',monospace",t.ink);text(m[2],x+22,cy+132,"500 19px Prompt,sans-serif","#6D5C50");if(i===2)clock(x+222,cy+158,22,t.ink)});
 text("TIME IS RESPECT",540,1650,"900 26px sans-serif",t.ink,"center");
 text("เวลาของทุกคนมีค่าเท่ากัน",540,1694,"500 24px Prompt,sans-serif","#66564B","center");
 text("TANG MIU",540,1768,"700 16px 'IBM Plex Mono',monospace","#887568","center");
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
