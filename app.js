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
 const bg=p.tone==="early"?"#E4F2E6":p.tone==="ontime"?"#DDF2F6":p.tone==="near"?"#FFF0C7":"#FBE2E7";
 const accent=p.tone==="early"?"#76C58A":p.tone==="ontime"?"#65BFD4":p.tone==="near"?"#E5B84E":"#E88391";
 const left=84,right=996,width=912;
 ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1920);ctx.fillStyle=accent;ctx.fillRect(0,0,1080,22);
 ctx.fillStyle="#4A3930";ctx.font="700 40px 'IBM Plex Mono',monospace";ctx.fillText("TIME IS RESPECT",left,205);
 ctx.fillStyle="#806D5F";ctx.font="500 22px 'IBM Plex Mono',monospace";ctx.fillText("YOUR TIME PERSONALITY",left,260);
 ctx.strokeStyle="#D8C8B3";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(left,315);ctx.lineTo(right,315);ctx.stroke();
 ctx.font="190px sans-serif";ctx.fillText(p.emoji,left,355);
 ctx.fillStyle=accent;ctx.font="700 28px 'IBM Plex Mono',monospace";ctx.fillText(p.tag,left,565);
 ctx.fillStyle="#4A3930";ctx.font="800 92px Prompt,sans-serif";ctx.fillText(p.name,left,620);
 ctx.fillStyle="#705C4E";ctx.font="500 34px Prompt,sans-serif";
 const wrap=(text,maxWidth)=>{const chars=Array.from(String(text||"")),lines=[];let line="";for(const ch of chars){const test=line+ch;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=ch}else line=test}if(line)lines.push(line);return lines};
 const lines=wrap(p.desc,width),lineHeight=52;let y=750;for(const l of lines){ctx.fillText(l,left,y);y+=lineHeight}
 const top=Math.min(y+38,1085);ctx.fillStyle="#D8C8B3";ctx.fillRect(left,top,width,3);
 const vals=[["ESTIMATE",formatMinutes(estimate)+" MIN"],["ACTUAL",formatMinutes(actual)+" MIN"],["DIFFERENCE",(diff>0?"+":"")+formatMinutes(diff)+" MIN"]];
 let sy=top+42;for(const[a,b]of vals){ctx.fillStyle="#927F70";ctx.font="600 21px 'IBM Plex Mono',monospace";ctx.fillText(a,left,sy);ctx.fillStyle="#4A3930";ctx.font="700 42px 'IBM Plex Mono',monospace";ctx.fillText(b,left,sy+34);sy+=112}
 ctx.fillStyle=accent;ctx.font="700 25px 'IBM Plex Mono',monospace";ctx.fillText("SAVE THIS. SEND IT TO THE GROUP CHAT.",left,1335);
 ctx.fillStyle="#705C4E";ctx.font="500 30px Prompt,sans-serif";const quoteLines=wrap("เวลาของคุณมีค่า เวลาของคนที่รอก็เหมือนกัน.",width);let qy=1395;for(const l of quoteLines){ctx.fillText(l,left,qy);qy+=46}
 ctx.fillStyle="#806D5F";ctx.font="500 19px 'IBM Plex Mono',monospace";ctx.fillText("BASE ON · TANG MIU",left,1650);ctx.fillText("TIME IS RESPECT",left,1690);
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
