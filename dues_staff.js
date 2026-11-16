const API_URL = "https://script.google.com/macros/s/AKfycbzhYFcW9RB7zFKMsn0CURttmL-t3j3Uk8PFTyx-FKUBA8mQKXVu0Yb5R4RDsZcGh6Gy4g/exec";
const token = sessionStorage.getItem("axomToken") || localStorage.getItem("axomToken") || "";
const $ = id => document.getElementById(id);
const money = v => "₹" + Number(v || 0).toLocaleString("en-IN", {minimumFractionDigits:2, maximumFractionDigits:2});
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let duesData = {gaming:[], manual:[], history:[]};
let selectedDue = null;
let maxManualDue = null;
const role = (localStorage.getItem("axomRole") || "Admin").toLowerCase();

async function api(action, payload={}) {
  if (!token) throw new Error("Please log in through the main AXOM dashboard first.");
  const response = await fetch(API_URL, {method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify({action,token,...payload})});
  if (!response.ok) throw new Error("Unable to connect to AXOM server.");
  const data = await response.json();
  if (!data.success) throw new Error(data.message || "Request failed.");
  return data;
}
function notice(message,error=false){$("notice").textContent=message;$("notice").classList.toggle("error",error);$("notice").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});}
function hideNotice(){$("notice").classList.add("hidden");}
function dateToday(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);}
function renderGaming(){
  const rows=duesData.gaming||[];
  $("gamingBody").innerHTML=rows.length?rows.map(x=>`<tr><td><strong>${esc(x.customerName)}</strong></td><td>${esc(x.phone||"—")}</td><td>${esc(x.bookingId)}</td><td>${esc(x.date||"—")}</td><td>${money(x.finalBill)}</td><td class="amount-due">${money(x.dueAmount)}</td><td><button class="collect-button" data-type="gaming" data-id="${esc(x.bookingId)}">Collect</button></td></tr>`).join(""):`<tr><td colspan="7" class="empty">No outstanding gaming dues.</td></tr>`;
  $("gamingTotal").textContent=money(rows.reduce((s,x)=>s+Number(x.dueAmount||0),0));
}
function renderManual(){
  const q=$("searchManual").value.trim().toLowerCase();
  const rows=(duesData.manual||[]).filter(x=>[x.customerName,x.phone,x.description,x.manualDueId].some(v=>String(v||"").toLowerCase().includes(q)));
  $("manualBody").innerHTML=rows.length?rows.map(x=>`<tr><td><strong>${esc(x.customerName)}</strong></td><td>${esc(x.phone||"—")}</td><td>${esc(x.description)}</td><td>${esc(x.dueDate||"—")}</td><td>${money(x.totalAmount)}</td><td>${money(x.paidAmount)}</td><td class="amount-due">${money(x.dueAmount)}</td><td><button class="collect-button" data-type="manual" data-id="${esc(x.manualDueId)}">Collect</button></td></tr>`).join(""):`<tr><td colspan="8" class="empty">No outstanding manual dues.</td></tr>`;
  $("manualTotal").textContent=money((duesData.manual||[]).reduce((s,x)=>s+Number(x.dueAmount||0),0));
}
function renderHistory(){
  const rows=duesData.history||[];
  $("historyBody").innerHTML=rows.length?rows.map(x=>`<tr><td>${esc(x.paymentDate||"—")}</td><td><strong>${esc(x.customerName)}</strong><span class="muted">${esc(x.phone||"")}</span></td><td>${esc(x.type||"")}</td><td>${esc(x.reference||"")}</td><td>${esc(x.paymentMethod||"")}</td><td class="amount-due">${money(x.amount)}</td></tr>`).join(""):`<tr><td colspan="6" class="empty">No collections recorded.</td></tr>`;
}
function renderAll(){
  renderGaming();renderManual();renderHistory();
  const gaming=(duesData.gaming||[]).reduce((s,x)=>s+Number(x.dueAmount||0),0);
  const manual=(duesData.manual||[]).reduce((s,x)=>s+Number(x.dueAmount||0),0);
  $("combinedTotal").textContent=money(gaming+manual);
  if(maxManualDue!==null){
    const amountField=document.querySelector('#manualForm [name="amount"]');
    if(amountField){amountField.max=maxManualDue;amountField.title=`Staff manual due limit: ${money(maxManualDue)}`;}
    const note=document.getElementById("staffDueLimitNote");
    if(note) note.textContent=`Staff can create a manual due up to ${money(maxManualDue)} per record. Higher amounts need owner approval.`;
  }
}
async function loadData(){
  hideNotice();$("refreshBtn").disabled=true;
  try{const data=await api("getDuesData");duesData=data;maxManualDue=data.maxManualDue??null;renderAll();}
  catch(e){notice(e.message,true);}
  finally{$("refreshBtn").disabled=false;}
}
function openPayment(type,id){
  const item=type==="manual"?(duesData.manual||[]).find(x=>x.manualDueId===id):(duesData.gaming||[]).find(x=>x.bookingId===id);
  if(!item)return;
  selectedDue={type,id,balance:Number(item.dueAmount||0)};
  $("paymentType").value=type;$("paymentId").value=id;
  $("paymentCustomer").textContent=`${item.customerName} · ${item.phone||"No phone"} · ${id}`;
  $("paymentBalance").textContent=money(selectedDue.balance);
  $("paymentAmount").value=selectedDue.balance.toFixed(2);$("paymentAmount").max=selectedDue.balance;
  $("paymentError").textContent="";$("paymentModal").classList.remove("hidden");
}
function closePayment(){$("paymentModal").classList.add("hidden");selectedDue=null;}
$("gamingBody").addEventListener("click",e=>{const b=e.target.closest("[data-type]");if(b)openPayment(b.dataset.type,b.dataset.id);});
$("manualBody").addEventListener("click",e=>{const b=e.target.closest("[data-type]");if(b)openPayment(b.dataset.type,b.dataset.id);});
$("searchManual").addEventListener("input",renderManual);
$("refreshBtn").addEventListener("click",loadData);
$("closeModal").addEventListener("click",closePayment);
$("cancelPayment").addEventListener("click",closePayment);
$("paymentModal").addEventListener("click",e=>{if(e.target===$("paymentModal"))closePayment();});
$("manualForm").addEventListener("submit",async e=>{
  e.preventDefault();hideNotice();const form=e.currentTarget;const data=Object.fromEntries(new FormData(form).entries());data.amount=Number(data.amount);
  if(maxManualDue!==null&&data.amount>maxManualDue){notice(`Staff due limit is ${money(maxManualDue)}. Ask the owner to approve a higher amount.`,true);return;}
  const button=$("addDueBtn");button.disabled=true;button.textContent="Saving due…";
  try{const result=await api("addManualDue",data);form.reset();$("dueDate").value=dateToday();await loadData();notice(result.message||"Manual due added.");}
  catch(err){notice(err.message,true);}
  finally{button.disabled=false;button.textContent="＋ Add manual due";}
});
$("paymentForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!selectedDue)return;const amount=Number($("paymentAmount").value);const method=$("paymentMethod").value;
  if(!Number.isFinite(amount)||amount<=0||amount>selectedDue.balance){$("paymentError").textContent="Enter a valid amount no greater than the outstanding balance.";return;}
  const button=$("collectBtn");button.disabled=true;button.textContent="Saving…";$("paymentError").textContent="";
  try{const result=await api("collectDuePayment",{type:selectedDue.type,id:selectedDue.id,amount,paymentMethod:method});closePayment();await loadData();notice(result.message);}
  catch(err){$("paymentError").textContent=err.message;}
  finally{button.disabled=false;button.textContent="Save collection";}
});
$("dueDate").min=dateToday();$("dueDate").value=dateToday();
const staffNote=document.createElement("p");staffNote.id="staffDueLimitNote";staffNote.className="form-hint";if(role==="staff")$("manualForm").appendChild(staffNote);
if(!token)notice("Please log in through the main dashboard first.",true);else loadData();
