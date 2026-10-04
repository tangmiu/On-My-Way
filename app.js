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
 const bg=p.tone==="early"?"#E7F0E7":p.tone==="ontime"?"#E4F1F2":p.tone==="near"?"#FFF0CF":"#F7E3E7";
 const accent=p.tone==="early"?"#76B98A":p.tone==="ontime"?"#63B9CA":p.tone==="near"?"#E2B34F":"#DE7E8D";
 const brown="#30363A",soft="#766E67",paper="#FFF9EC",paper2="#F4EBDD",line="#D7C8B6",ink="#30363A";
 const left=64,right=1016,width=952;
 const round=(x,y,w,h,r,fill)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()};
 const circle=(x,y,r,fill)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()};
 const line=(x1,y1,x2,y2,color,w=2)=>{ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()};
 const wrap=(text,maxWidth)=>{const chars=Array.from(String(text||"")),lines=[];let current="";for(const ch of chars){const test=current+ch;if(ctx.measureText(test).width>maxWidth&&current){lines.push(current);current=ch}else current=test}if(current)lines.push(current);return lines};
 const tape=(x,y,w,h,rot)=>{ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(rot);ctx.globalAlpha=.72;ctx.fillStyle="#E9D6B4";ctx.fillRect(-w/2,-h/2,w,h);ctx.globalAlpha=1;ctx.restore()};
 const star=(x,y,s,color=ink)=>{ctx.save();ctx.strokeStyle=color;ctx.lineWidth=4;ctx.beginPath();for(let i=0;i<10;i++){const r=i%2?s:s*.35,ang=-Math.PI/2+i*Math.PI/5,px=x+Math.cos(ang)*r,py=y+Math.sin(ang)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.stroke();ctx.restore()};
 const paperTexture=(x,y,w,h,alpha=.12)=>{ctx.save();ctx.globalAlpha=alpha;for(let i=0;i<170;i++){const px=x+((i*73)%w),py=y+((i*127)%h),r=1+(i%3)*.45;circle(px,py,r,"#A99682")}ctx.restore()};
 ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1920);
 // warm scrapbook paper background
 ctx.fillStyle="#F1E7D6";ctx.fillRect(0,0,1080,1920);paperTexture(0,0,1080,1920,.09);
 ctx.fillStyle=accent;ctx.fillRect(0,0,1080,14);
 ctx.fillStyle=ink;ctx.font="800 39px Prompt,sans-serif";ctx.fillText("TIME",64,48);ctx.fillText("IS RESPECT",64,92);
 ctx.fillStyle=soft;ctx.font="600 15px 'IBM Plex Mono',monospace";ctx.fillText("THE REAL-TIME EXCUSE DASHBOARD",64,145);
 // hand-drawn clock mark
 ctx.strokeStyle=ink;ctx.lineWidth=5;ctx.beginPath();ctx.arc(925,92,43,0,Math.PI*2);ctx.stroke();line(925,92,925,65,ink,5);line(925,92,942,101,ink,5);circle(925,92,5,ink);
 // Top art/photo zone
 round(52,185,976,610,38,paper);
 paperTexture(52,185,976,610,.08);
 // decorative taped photo frame
 tape(95,205,150,38,-.10);tape(842,206,150,38,.09);
 // Polaroid-style mini photo
 round(82,260,220,245,8,"#FDFCF7");
 ctx.fillStyle="#B7D1D1";ctx.fillRect(98,276,188,165);
 ctx.fillStyle="#D8C0A1";ctx.beginPath();ctx.moveTo(98,420);ctx.lineTo(150,365);ctx.lineTo(183,397);ctx.lineTo(220,350);ctx.lineTo(286,441);ctx.closePath();ctx.fill();
 ctx.fillStyle="#8DA7A0";ctx.beginPath();ctx.arc(245,325,27,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=ink;ctx.font="600 16px 'IBM Plex Mono',monospace";ctx.fillText("SEE YOU ON TIME.",112,459);
 // Decorative paper note
 round(790,282,190,112,10,"#F3DCC0");ctx.save();ctx.translate(885,338);ctx.rotate(.08);ctx.fillStyle=ink;ctx.font="800 23px Prompt,sans-serif";ctx.textAlign="center";ctx.fillText("GOOD THINGS",0,-28);ctx.fillText("TAKE TIME",0,3);ctx.font="700 28px sans-serif";ctx.fillText("☺",0,40);ctx.restore();
 // Character shadow
 ctx.fillStyle="rgba(48,54,58,.13)";ctx.beginPath();ctx.ellipse(565,740,230,31,0,0,Math.PI*2);ctx.fill();
 const cx=610;
 // legs
 round(cx-112,620,92,145,38,"#596979");round(cx+20,620,92,145,38,"#596979");
 round(cx-134,735,116,34,17,ink);round(cx+28,735,116,34,17,ink);
 // oversized jacket
 round(cx-154,430,315,240,70,"#526A7C");round(cx-102,454,211,202,50,"#72899A");
 // shirt
 ctx.fillStyle=paper;ctx.beginPath();ctx.moveTo(cx-50,448);ctx.lineTo(cx,493);ctx.lineTo(cx+50,448);ctx.lineTo(cx+34,632);ctx.lineTo(cx-34,632);ctx.closePath();ctx.fill();
 // jacket seams
 line(cx-118,476,cx-88,626,"#91A4B1",4);line(cx+118,476,cx+88,626,"#91A4B1",4);
 // arms + hands
 round(cx-188,460,60,195,30,"#526A7C");round(cx+128,460,60,195,30,"#526A7C");
 circle(cx-158,665,30,"#F0C3B0");circle(cx+158,665,30,"#F0C3B0");
 // neck
 round(cx-42,356,84,94,25,"#F0C3B0");
 // ears
 circle(cx-112,270,29,"#F0C3B0");circle(cx+112,270,29,"#F0C3B0");
 // face
 ctx.fillStyle="#F3C7B4";ctx.beginPath();ctx.moveTo(cx-108,185);ctx.quadraticCurveTo(cx-126,315,cx,388);ctx.quadraticCurveTo(cx+126,315,cx+108,185);ctx.quadraticCurveTo(cx,112,cx-108,185);ctx.closePath();ctx.fill();
 // hair
 ctx.fillStyle="#B7A39B";ctx.beginPath();ctx.moveTo(cx-126,245);ctx.quadraticCurveTo(cx-140,125,cx-35,100);ctx.quadraticCurveTo(cx+90,65,cx+137,164);ctx.quadraticCurveTo(cx+101,158,cx+67,143);ctx.quadraticCurveTo(cx+75,186,cx+44,216);ctx.quadraticCurveTo(cx+20,168,cx-10,145);ctx.quadraticCurveTo(cx-52,213,cx-118,232);ctx.closePath();ctx.fill();
 // hair strands
 ctx.strokeStyle="#E6D4CC";ctx.lineWidth=7;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(cx-74,144);ctx.quadraticCurveTo(cx-38,92,cx+8,90);ctx.moveTo(cx-35,154);ctx.quadraticCurveTo(cx+5,100,cx+45,112);ctx.moveTo(cx+34,126);ctx.quadraticCurveTo(cx+81,127,cx+106,170);ctx.stroke();
 // headphones
 ctx.strokeStyle="#697783";ctx.lineWidth=22;ctx.beginPath();ctx.arc(cx,250,133,Math.PI*1.04,Math.PI*1.96);ctx.stroke();circle(cx-128,265,27,"#697783");circle(cx+128,265,27,"#697783");
 // glasses
 ctx.strokeStyle=ink;ctx.lineWidth=6;ctx.fillStyle="rgba(255,249,236,.45)";ctx.beginPath();ctx.roundRect(cx-91,248,75,49,16);ctx.fill();ctx.stroke();ctx.beginPath();ctx.roundRect(cx+16,248,75,49,16);ctx.fill();ctx.stroke();line(cx-16,270,cx+16,270,ink,5);
 // eyes/brows
 line(cx-73,231,cx-34,226,ink,5);line(cx+34,226,cx+73,231,ink,5);circle(cx-53,272,6,ink);circle(cx+53,272,6,ink);
 // nose + smile
 line(cx,287,cx-7,313,"#B66F68",4);line(cx-7,313,cx+8,316,"#B66F68",4);ctx.strokeStyle="#A75F68";ctx.lineWidth=5;ctx.beginPath();ctx.arc(cx,327,24,.15,Math.PI-.15);ctx.stroke();
 // little cat on shoulder
 circle(cx-176,410,42,"#9B9A91");circle(cx-176,383,33,"#B2B0A8");
 ctx.fillStyle="#8C8A83";ctx.beginPath();ctx.moveTo(cx-202,365);ctx.lineTo(cx-191,340);ctx.lineTo(cx-178,368);ctx.moveTo(cx-151,365);ctx.lineTo(cx-160,340);ctx.lineTo(cx-173,368);ctx.fill();
 circle(cx-187,383,4,ink);circle(cx-165,383,4,ink);line(cx-176,395,cx-176,402,"#6B665F",3);
 // character accessory clock
 circle(cx+92,520,30,paper);ctx.strokeStyle=accent;ctx.lineWidth=5;ctx.beginPath();ctx.arc(cx+92,520,20,0,Math.PI*2);ctx.stroke();line(cx+92,520,cx+92,505,accent,4);line(cx+92,520,cx+104,527,accent,4);
 // art labels around character
 star(350,235,28,ink);star(850,545,20,accent);
 ctx.fillStyle=ink;ctx.font="800 20px 'IBM Plex Mono',monospace";ctx.fillText("TIME RECEIPT",335,650);
 ctx.fillStyle=soft;ctx.font="600 14px 'IBM Plex Mono',monospace";ctx.fillText("A LITTLE PORTRAIT OF YOUR TIMING",335,680);
 // ripped-paper transition
 ctx.fillStyle=paper;ctx.beginPath();ctx.moveTo(48,790);for(let x=48;x<=1032;x+=28){ctx.lineTo(x,790+((x*17)%13)-6)}ctx.lineTo(1032,1578);ctx.lineTo(48,1578);ctx.closePath();ctx.fill();paperTexture(48,790,984,788,.11);
 // Main information — deliberately dominant
 ctx.fillStyle=soft;ctx.font="700 17px 'IBM Plex Mono',monospace";ctx.fillText("YOUR TIME PERSONALITY",92,835);
 ctx.fillStyle=accent;ctx.font="800 22px 'IBM Plex Mono',monospace";ctx.fillText(p.tag,92,870);
 ctx.fillStyle=ink;ctx.font="800 86px Prompt,sans-serif";const nameLines=wrap(p.name,830);let ny=908;for(const l of nameLines.slice(0,2)){ctx.fillText(l,92,ny);ny+=88}
 ctx.fillStyle="#5E5751";ctx.font="500 25px Prompt,sans-serif";const descLines=wrap(p.desc,850);let dy=Math.max(ny+16,1080);for(const l of descLines.slice(0,2)){ctx.fillText(l,92,dy);dy+=39}
 // Strong metric cards
 const metricY=1190,metricW=280,gap=34;
 const metrics=[["ESTIMATE",formatMinutes(estimate)+" MIN","#F4DDB2"],["ACTUAL",formatMinutes(actual)+" MIN","#F1C7D0"],["DIFFERENCE",(diff>0?"+":"")+formatMinutes(diff)+" MIN",accent]];
 metrics.forEach((v,i)=>{const x=92+i*(metricW+gap);round(x,metricY,metricW,190,30,v[2]);ctx.fillStyle=ink;ctx.font="700 17px 'IBM Plex Mono',monospace";ctx.fillText(v[0],x+22,metricY+25);ctx.fillStyle=ink;ctx.font="800 42px 'IBM Plex Mono',monospace";ctx.fillText(v[1],x+22,metricY+72);ctx.fillStyle=soft;ctx.font="500 16px Prompt,sans-serif";ctx.fillText(i===0?"เวลาที่คาด":i===1?"เวลาที่ถึงจริง":"ACTUAL − ESTIMATE",x+22,metricY+135);});
 // Small receipt strip
 round(92,1410,896,100,24,"#F5EFE5");line(390,1430,390,1490,line,2);line(690,1430,690,1490,line,2);
 ctx.fillStyle=soft;ctx.font="700 14px 'IBM Plex Mono',monospace";ctx.fillText("YOUR RESULT",120,1430);ctx.fillText("TIME IS",430,1430);ctx.fillText("RESPECT",735,1430);
 ctx.fillStyle=ink;ctx.font="800 24px Prompt,sans-serif";ctx.fillText(p.name,120,1460);ctx.fillText("YOUR",430,1460);ctx.fillText("OTHERS",735,1460);
 // Closing note / collage
 ctx.fillStyle=accent;ctx.globalAlpha=.48;ctx.beginPath();ctx.ellipse(545,1585,310,78,-.04,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 ctx.fillStyle=ink;ctx.font="700 22px Prompt,sans-serif";ctx.textAlign="center";ctx.fillText("เวลาของคุณมีค่า เวลาของคนที่รอก็เหมือนกัน.",545,1560);
 ctx.font="500 18px Prompt,sans-serif";ctx.fillText("ทุกนาทีที่ต่างกัน คือเวลาของใครบางคนที่กำลังรอ",545,1595);
 ctx.textAlign="left";
 // bottom collage details
 round(70,1690,260,140,10,"#E7DED0");ctx.save();ctx.translate(200,1760);ctx.rotate(-.07);ctx.fillStyle="#5E6669";ctx.fillRect(-82,-35,164,70);ctx.fillStyle="#B8C8C5";ctx.beginPath();ctx.arc(55,-3,22,0,Math.PI*2);ctx.fill();ctx.restore();
 tape(105,1665,120,28,-.14);
 ctx.fillStyle=ink;ctx.font="700 15px 'IBM Plex Mono',monospace";ctx.fillText("BETTER",92,1835);ctx.fillText("ON TIME.",92,1857);
 round(748,1700,260,118,10,"#F2DDBB");ctx.save();ctx.translate(878,1758);ctx.rotate(.08);ctx.fillStyle=ink;ctx.font="800 18px Prompt,sans-serif";ctx.textAlign="center";ctx.fillText("KEEP YOUR",0,-20);ctx.fillText("TIME KIND.",0,8);ctx.font="700 26px sans-serif";ctx.fillText("☺",0,39);ctx.restore();
 tape(840,1678,120,28,.10);
 ctx.fillStyle=soft;ctx.font="700 16px 'IBM Plex Mono',monospace";ctx.fillText("BASE ON · TANG MIU",392,1770);
 ctx.fillStyle=ink;ctx.font="800 22px Prompt,sans-serif";ctx.fillText("TIME IS RESPECT",392,1802);
 ctx.fillStyle=soft;ctx.font="500 13px 'IBM Plex Mono',monospace";ctx.fillText("9:16 STORY  ·  YOUR TIME, YOUR RECEIPT",392,1835);
 return{canvas,status:p.tag,diff}
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
