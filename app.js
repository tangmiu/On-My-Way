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
   early:{bg:"#E7F1E8",paper:"#FFF9EF",accent:"#78C58C",soft:"#CFE6D3",hair:"#D7AE83",hair2:"#F0D1AF",jacket:"#6D8E7C",shirt:"#F8F2E8",skin:"#F2C6B4",shadow:"#D99583",ink:"#33433A"},
   ontime:{bg:"#E2F1F5",paper:"#FFF9EF",accent:"#66BDD1",soft:"#CBE7ED",hair:"#5A4B47",hair2:"#90756C",jacket:"#83AEBB",shirt:"#F8F2E8",skin:"#F1C5B5",shadow:"#D58E85",ink:"#34434A"},
   near:{bg:"#FFF0D0",paper:"#FFF9EF",accent:"#E2B458",soft:"#F5DEAF",hair:"#725249",hair2:"#B98670",jacket:"#C58E6E",shirt:"#F8F2E8",skin:"#F1C2AF",shadow:"#D78678",ink:"#4A3B36"},
   late:{bg:"#F7E1E7",paper:"#FFF9EF",accent:"#E18091",soft:"#EEC6CE",hair:"#48454E",hair2:"#786F7A",jacket:"#8C7184",shirt:"#F8F2E8",skin:"#EFC1B2",shadow:"#CC7D79",ink:"#463D45"}
 };
 const c=themes[p.tone]||themes.ontime;
 const left=64,width=952;
 const round=(x,y,w,h,r,fill,stroke)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}};
 const circle=(x,y,r,fill,stroke)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}};
 const path=(fill,stroke,lineWidth,fn)=>{ctx.beginPath();fn();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth||2;ctx.stroke()}};
 const line=(x1,y1,x2,y2,color,w=3)=>{ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()};
 const text=(v,x,y,font,fill,align="left")=>{ctx.font=font;ctx.fillStyle=fill;ctx.textAlign=align;ctx.fillText(String(v||""),x,y);ctx.textAlign="left"};
 const wrap=(value,maxWidth,font)=>{ctx.font=font;const words=String(value||"").split(/\s+/),lines=[];let cur="";for(const word of words){const test=cur?cur+" "+word:word;if(ctx.measureText(test).width>maxWidth&&cur){lines.push(cur);cur=word}else cur=test}if(cur)lines.push(cur);return lines};
 const star=(x,y,s,fill)=>path(fill,null,0,()=>{for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?s:s*.42,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath()});
 const clock=(x,y,r,color)=>{circle(x,y,r,"rgba(255,255,255,.7)",color);line(x,y,x,y-r*.48,color,4);line(x,y,x+r*.32,y+r*.18,color,4);circle(x,y,4,color)};
 const hairStrand=(x1,y1,cx,cy,x2,y2,color,w=4)=>{ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x1,y1);ctx.quadraticCurveTo(cx,cy,x2,y2);ctx.stroke()};

 // Paper editorial background.
 ctx.fillStyle=c.bg;ctx.fillRect(0,0,1080,1920);
 const wash=ctx.createLinearGradient(0,0,1080,1920);wash.addColorStop(0,"rgba(255,255,255,.5)");wash.addColorStop(.55,"rgba(255,248,234,.08)");wash.addColorStop(1,"rgba(255,255,255,.32)");ctx.fillStyle=wash;ctx.fillRect(0,0,1080,1920);
 ctx.globalAlpha=.55;circle(130,285,175,c.soft);circle(955,470,180,c.soft);circle(930,1700,205,c.soft);ctx.globalAlpha=1;

 text("TIME IS RESPECT",left,58,"800 34px 'IBM Plex Mono',monospace",c.ink);
 text("YOUR TIME PERSONALITY",left,105,"600 18px 'IBM Plex Mono',monospace","#796A5F");
 line(left,148,left+width,148,"rgba(74,57,48,.18)",2);

 // Main character card.
 round(left,186,width,650,44,c.paper,"rgba(74,57,48,.10)");
 ctx.save();
 ctx.globalAlpha=.42;circle(155,720,150,c.soft);circle(900,280,145,c.soft);ctx.globalAlpha=1;
 star(160,305,17,c.accent);star(914,700,13,c.accent);
 ctx.restore();

 const cx=540;
 ctx.fillStyle="rgba(74,57,48,.10)";ctx.beginPath();ctx.ellipse(cx,802,190,23,0,0,Math.PI*2);ctx.fill();

 // Detailed editorial/anime character illustration.
 // Body first: tailored silhouette, layered clothing, hands and neck.
 const bodyTop=585;
 round(cx-154,bodyTop,308,225,62,c.jacket);
 round(cx-184,650,65,152,31,c.jacket);
 round(cx+119,650,65,152,31,c.jacket);
 circle(cx-150,801,28,c.skin);circle(cx+150,801,28,c.skin);
 ctx.fillStyle=c.skin;ctx.fillRect(cx-39,495,78,105);

 // Collar / shirt.
 path(c.shirt,null,0,()=>{ctx.moveTo(cx-54,572);ctx.lineTo(cx,626);ctx.lineTo(cx+54,572);ctx.lineTo(cx+34,765);ctx.lineTo(cx-34,765);ctx.closePath()});
 line(cx-54,572,cx,626,"rgba(74,57,48,.18)",4);line(cx+54,572,cx,626,"rgba(74,57,48,.18)",4);
 line(cx-85,610,cx-40,760,"rgba(255,255,255,.25)",5);line(cx+85,610,cx+40,760,"rgba(255,255,255,.25)",5);

 // Face with jaw, ears and subtle cheek shading.
 circle(cx-111,405,27,c.skin);circle(cx+111,405,27,c.skin);
 path(c.skin,null,0,()=>{ctx.moveTo(cx-109,320);ctx.quadraticCurveTo(cx-118,455,cx,526);ctx.quadraticCurveTo(cx+118,455,cx+109,320);ctx.quadraticCurveTo(cx,238,cx-109,320);ctx.closePath()});
 ctx.globalAlpha=.18;circle(cx-72,438,24,c.shadow);circle(cx+72,438,24,c.shadow);ctx.globalAlpha=1;
 // Neck shadow and jaw accent.
 line(cx-38,515,cx-38,580,"rgba(150,88,82,.28)",8);line(cx+38,515,cx+38,580,"rgba(150,88,82,.20)",8);

 // Hair silhouette varies by personality.
 if(p.tone==="early"){
   path(c.hair,null,0,()=>{ctx.moveTo(cx-126,365);ctx.quadraticCurveTo(cx-137,242,cx-45,207);ctx.quadraticCurveTo(cx+45,170,cx+128,258);ctx.quadraticCurveTo(cx+115,302,cx+76,326);ctx.quadraticCurveTo(cx+46,277,cx+8,248);ctx.quadraticCurveTo(cx-12,304,cx-93,347);ctx.lineTo(cx-126,365);ctx.closePath()});
   hairStrand(cx-87,300,cx-48,235,cx-5,215,c.hair2,11);hairStrand(cx-36,282,cx+3,225,cx+45,219,c.hair2,9);hairStrand(cx+18,265,cx+55,232,cx+88,269,c.hair2,8);
 }else if(p.tone==="ontime"){
   path(c.hair,null,0,()=>{ctx.moveTo(cx-126,362);ctx.quadraticCurveTo(cx-130,225,cx,204);ctx.quadraticCurveTo(cx+130,225,cx+126,362);ctx.lineTo(cx+101,475);ctx.lineTo(cx+62,462);ctx.lineTo(cx+70,294);ctx.quadraticCurveTo(cx,257,cx-70,294);ctx.lineTo(cx-62,462);ctx.lineTo(cx-101,475);ctx.closePath()});
   hairStrand(cx-74,302,cx-36,235,cx,218,c.hair2,9);hairStrand(cx+12,219,cx+54,235,cx+82,300,c.hair2,9);
 }else if(p.tone==="near"){
   path(c.hair,null,0,()=>{ctx.moveTo(cx-128,370);ctx.quadraticCurveTo(cx-130,230,cx-32,205);ctx.quadraticCurveTo(cx+50,177,cx+130,266);ctx.quadraticCurveTo(cx+100,298,cx+58,282);ctx.quadraticCurveTo(cx+72,329,cx+30,354);ctx.lineTo(cx+8,287);ctx.quadraticCurveTo(cx-30,343,cx-100,362);ctx.closePath()});
   hairStrand(cx-84,300,cx-45,237,cx-3,218,c.hair2,9);hairStrand(cx-28,286,cx+14,226,cx+65,260,c.hair2,8);
 }else{
   path(c.hair,null,0,()=>{ctx.moveTo(cx-132,382);ctx.quadraticCurveTo(cx-139,212,cx,185);ctx.quadraticCurveTo(cx+148,204,cx+135,372);ctx.lineTo(cx+94,505);ctx.lineTo(cx+58,440);ctx.lineTo(cx+68,292);ctx.quadraticCurveTo(cx,248,cx-57,296);ctx.lineTo(cx-82,468);ctx.lineTo(cx-115,520);ctx.closePath()});
   hairStrand(cx-82,300,cx-40,224,cx+2,208,c.hair2,9);hairStrand(cx-20,270,cx+26,214,cx+75,252,c.hair2,8);
 }

 // Facial features: large expressive eyes, brows, nose, lips.
 ctx.strokeStyle=c.ink;ctx.lineWidth=5;ctx.lineCap="round";
 ctx.beginPath();ctx.moveTo(cx-78,349);ctx.quadraticCurveTo(cx-50,331,cx-19,343);ctx.moveTo(cx+19,343);ctx.quadraticCurveTo(cx+50,331,cx+78,349);ctx.stroke();
 // eyes
 circle(cx-50,382,17,"#FFFDF8",c.ink);circle(cx+50,382,17,"#FFFDF8",c.ink);
 circle(cx-50,384,8,c.ink);circle(cx+50,384,8,c.ink);
 circle(cx-47,380,3,"#FFFDF8");circle(cx+53,380,3,"#FFFDF8");
 // nose
 ctx.strokeStyle="#B97970";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx,399);ctx.quadraticCurveTo(cx-8,425,cx+7,430);ctx.stroke();
 // lips
 ctx.strokeStyle="#A75E65";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx-17,451);ctx.quadraticCurveTo(cx,442,cx+17,451);ctx.quadraticCurveTo(cx,465,cx-17,451);ctx.stroke();
 // subtle lower-lip highlight
 line(cx-9,462,cx+9,462,"rgba(255,255,255,.65)",3);
 // glasses only for the cooler late type.
 if(p.tone==="late"){
   ctx.strokeStyle=c.ink;ctx.lineWidth=6;
   ctx.strokeRect(cx-91,359,76,50);ctx.strokeRect(cx+15,359,76,50);line(cx-15,384,cx+15,384,c.ink,5);
 }
 // Headphone detail for early / late.
 if(p.tone==="early"||p.tone==="late"){
   ctx.strokeStyle="#77727A";ctx.lineWidth=17;ctx.beginPath();ctx.arc(cx,352,128,Math.PI*1.03,Math.PI*1.97);ctx.stroke();
   circle(cx-127,373,25,"#77727A");circle(cx+127,373,25,"#77727A");
   circle(cx-127,373,13,"#C9C3C3");circle(cx+127,373,13,"#C9C3C3");
 }
 // Personality-specific accessory.
 if(p.tone==="early"){
   // small lightning hair clip
   path(c.accent,null,0,()=>{ctx.moveTo(cx-128,285);ctx.lineTo(cx-103,285);ctx.lineTo(cx-116,309);ctx.lineTo(cx-89,299);ctx.lineTo(cx-110,333);ctx.lineTo(cx-107,313);ctx.lineTo(cx-132,320);ctx.closePath()});
 }else if(p.tone==="ontime"){
   circle(cx+104,520,10,c.accent);circle(cx+104,520,4,"#FFF9EF");
 }else if(p.tone==="near"){
   text("z",cx+112,480,"700 25px sans-serif",c.accent);text("z",cx+136,452,"700 19px sans-serif",c.accent);
 }else{
   line(cx+132,535,cx+192,515,c.accent,5);line(cx+142,558,cx+210,545,c.accent,4);
 }
 clock(cx+(p.tone==="late"?-110:110),650,28,c.accent);

 text("A PORTRAIT OF YOUR TIMING",540,850,"600 16px 'IBM Plex Mono',monospace","#887568","center");

 // Information card — deliberately clean and dominant.
 round(left,900,width,720,42,c.paper,"rgba(74,57,48,.10)");
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
 metrics.forEach((m,i)=>{
   const x=left+46+i*(mw+mg);round(x,my,mw,mh,30,m[3],"rgba(74,57,48,.10)");
   text(m[0],x+24,my+25,"700 17px 'IBM Plex Mono',monospace","#6D5C50");
   text(m[1],x+24,my+70,"800 33px 'IBM Plex Mono',monospace",c.ink);
   text(m[2],x+24,my+137,"500 20px Prompt,sans-serif","#6D5C50");
   if(i===2)clock(x+222,my+166,23,c.ink);
 });
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
