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

const shareCharacterImages={early:new Image(),ontime:new Image(),near:new Image(),late:new Image()};
shareCharacterImages.early.src="https://pikaso.cdnpk.net/private/production/5632892746/render.png?token=exp=1791331200~hmac=76f459454f002c9fbfb4e8bc308d3eee08361e3d987be6eeb959df223b78150a";
shareCharacterImages.ontime.src="https://pikaso.cdnpk.net/private/production/5632893843/render.png?token=exp=1791331200~hmac=6c4f8743e28decd52c85bb3f50493a0cbfe99d25a5f8a35f400068c078fd9825";
shareCharacterImages.near.src="https://pikaso.cdnpk.net/private/production/5632892898/render.png?token=exp=1791331200~hmac=0948d6b256c37cd3cc057dfbe9ffecc89f7408b9b206a08355e4122cb8f3b982";
shareCharacterImages.late.src="https://pikaso.cdnpk.net/private/production/5632893673/render.png?token=exp=1791331200~hmac=fe82a26470e895c85a620d4691610c08d2a7515adf2c702b9199fa9d3c5b17cd";const shareCharacterImage=new Image();shareCharacterImage.src=shareCharacterSprite;
function makeReceiptCanvas(){
 const p=getPersonality(),actual=Number(state.actualMinutes||0),estimate=Number(state.estimated||0),diff=actual-estimate;
 const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1920;
 const ctx=canvas.getContext("2d");ctx.textBaseline="top";
 const themes={
  early:{bg:"#E8F0E7",paper:"#FFF9EE",accent:"#719D7C",soft:"#D6E7D8",hair:"#C9B19A",coat:"#526A63",shirt:"#F4EEE5",skin:"#F0C6B0"},
  ontime:{bg:"#E7EEF0",paper:"#FFF9EE",accent:"#6799A7",soft:"#D4E5E9",hair:"#5A4A46",coat:"#496274",shirt:"#F4EEE5",skin:"#E9BFAE"},
  near:{bg:"#F2E8DA",paper:"#FFF9EE",accent:"#BD8750",soft:"#EAD8B9",hair:"#8B5C46",coat:"#806A57",shirt:"#F7EEE2",skin:"#EBC0A9"},
  late:{bg:"#F1E1E6",paper:"#FFF9EE",accent:"#C97889",soft:"#E8CCD4",hair:"#332E38",coat:"#654B61",shirt:"#F3E7E5",skin:"#E8B8AE"}
 };
 const t=themes[p.tone]||themes.ontime;
 const text=(v,x,y,font,fill="#34383A",align="left")=>{ctx.font=font;ctx.fillStyle=fill;ctx.textAlign=align;ctx.fillText(String(v??""),x,y);ctx.textAlign="left"};
 const rr=(x,y,w,h,r,fill,stroke)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}};
 const line=(x1,y1,x2,y2,c,w=3)=>{ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()};
 const tape=(x,y,w,h,r)=>{ctx.save();ctx.translate(x,y);ctx.rotate(r);ctx.fillStyle="rgba(220,190,145,.58)";ctx.fillRect(-w/2,-h/2,w,h);ctx.restore()};
 const wrap=(v,max,font)=>{ctx.font=font;const words=String(v||"").split(/\s+/),out=[];let z="";for(const word of words){const n=z?z+" "+word:word;if(ctx.measureText(n).width>max&&z){out.push(z);z=word}else z=n}if(z)out.push(z);return out};

 // Detailed illustrated character: deliberately hand-drawn/semi-realistic, not a minimal icon.
 const drawCharacter=(tone)=>{const img=shareCharacterImages[tone]||shareCharacterImages.ontime;ctx.save();ctx.beginPath();ctx.roundRect(42,190,996,850,26);ctx.clip();if(img.complete&&img.naturalWidth){ctx.drawImage(img,42,190,996,850)}else{ctx.fillStyle=t.soft;ctx.fillRect(42,190,996,850)}ctx.restore();};

 ctx.fillStyle=t.bg;ctx.fillRect(0,0,1080,1920);
 const bg=ctx.createLinearGradient(0,0,0,1920);bg.addColorStop(0,"rgba(255,255,255,.52)");bg.addColorStop(.58,"rgba(255,248,235,.08)");bg.addColorStop(1,"rgba(255,255,255,.5)");ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1920);
 text("TIME IS RESPECT",58,50,"900 italic 42px sans-serif","#304047");
 text("THE REAL-TIME EXCUSE DASHBOARD",60,105,"600 17px 'IBM Plex Mono',monospace","#716158");
 rr(850,48,170,116,18,"#F4E7D3","rgba(70,55,46,.08)");
 text("GOOD",875,69,"900 24px sans-serif","#30393B");text("THINGS",866,99,"900 24px sans-serif","#30393B");text("TAKE TIME",855,129,"900 21px sans-serif","#30393B");
 const px=42,py=190,pw=996,ph=850;
 rr(px-10,py-10,pw+20,ph+20,34,"#FFFDF7","rgba(70,55,46,.10)");
 ctx.save();ctx.beginPath();ctx.roundRect(px,py,pw,ph,26);ctx.clip();
 drawCharacter(p.tone);
 const portraitShade=ctx.createLinearGradient(0,180,0,850);portraitShade.addColorStop(0,"rgba(255,255,255,.05)");portraitShade.addColorStop(.68,"rgba(255,245,230,0)");portraitShade.addColorStop(1,"rgba(80,55,45,.16)");ctx.fillStyle=portraitShade;ctx.fillRect(0,0,pw,ph);ctx.restore();
 tape(125,205,130,36,-.08);tape(920,214,120,34,.1);
  rr(365,810,350,54,27,"rgba(47,57,58,.80)");text(p.tag,540,825,"800 18px 'IBM Plex Mono',monospace","#FFF9EE","center");
 rr(36,855,1008,850,40,t.paper,"rgba(73,58,49,.10)");
 tape(110,870,125,34,-.12);tape(970,873,115,32,.1);
 text("YOUR TIME PERSONALITY",82,910,"700 20px 'IBM Plex Mono',monospace","#76685F");
 text(p.name,82,954,"900 76px Prompt,sans-serif","#30383B");
 line(82,1048,998,1048,"rgba(75,59,49,.14)",2);
 const descLines=wrap(p.desc,850,"500 27px Prompt,sans-serif").slice(0,3);
 descLines.forEach((z,i)=>text(z,82,1080+i*42,"500 27px Prompt,sans-serif","#514844"));
 const cards=[["ESTIMATE",formatMinutes(estimate)+" MIN","เวลาที่คิดไว้","#F3DFC0"],["ACTUAL",formatMinutes(actual)+" MIN","เวลาที่ถึงจริง","#F0D5DC"],["DIFFERENCE",(diff>0?"+":"")+formatMinutes(diff)+" MIN","คลาดเคลื่อน",t.soft]];
 cards.forEach((m,i)=>{const x=82+i*306;rr(x,1230,282,214,28,m[3],"rgba(70,55,46,.08)");text(m[0],x+22,1253,"700 17px 'IBM Plex Mono',monospace","#6B5D55");text(m[1],x+22,1303,"900 31px 'IBM Plex Mono',monospace","#30383B");text(m[2],x+22,1368,"500 19px Prompt,sans-serif","#6B5D55")});
 text("TIME RECEIPT",82,1500,"900 34px sans-serif","#30383B");line(82,1546,345,1546,t.accent,6);
 text("เวลาของทุกคนมีค่าเท่ากัน",82,1580,"500 25px Prompt,sans-serif","#5D514B");
 rr(720,1500,250,104,18,"#F3E7D3","rgba(70,55,46,.08)");
 text("SEE YOU",845,1525,"800 18px 'IBM Plex Mono',monospace","#4D4541","center");text("ON TIME. ♡",845,1555,"900 23px sans-serif","#30383B","center");
 text("TANG MIU",540,1652,"700 16px 'IBM Plex Mono',monospace","#8A776B","center");
 ctx.strokeStyle=t.accent;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(930,1718);ctx.lineTo(948,1736);ctx.lineTo(976,1699);ctx.stroke();
 text("TIME IS RESPECT",540,1768,"900 27px sans-serif","#30383B","center");
 return{canvas,status:p.tag,diff};
}function canvasToFile(canvas){
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
