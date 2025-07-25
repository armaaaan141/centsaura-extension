// content-script.js
console.log('[Centsaura] content-script loaded on', location.href);

// 1) Helpers
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[randInt(0,arr.length-1)];}

// 2) Mock personal context (as before)
const CTX = {
  daysLeft:        randInt(0,29),
  upcomingBills:   Array.from({length:randInt(0,3)}, ()=>randInt(200,1200)),
  categoryOverPct: Math.random()*50,
  recurringPct:    Math.random()*30,
  mood:            pick(['Anxious','Bored','Neutral','Happy']),
  pastRegrets:     randInt(0,5),
  savingsConflict: Math.random()*40,
  debtLoadPct:     Math.random()*100,
  daysToPay:       randInt(0,30),
};

// 3) Read purchase amount
function getOrderTotal(){
  const el=document.querySelector('span.a-color-price');
  if(!el) return 0;
  return parseFloat(el.textContent.replace(/[^0-9.]/g,''))||0;
}
const purchaseAmt=getOrderTotal();

// 4) Scoring weights & functions
const W={budget:20,bills:20,category:10,recurring:10,mood:10,regrets:10,savings:10,debt:5,paycheck:5};
const sBudget    = d=> (1-d/30)*W.budget;
const sBills     = b=> Math.max(0,W.bills*(1-b.reduce((a,v)=>a+v,0)/2000));
const sCat       = p=> Math.max(0,W.category*(1-p/100));
const sRec       = p=> Math.max(0,W.recurring*(1-p/100));
const sMood      = m=> ({Anxious:0,Bored:5,Neutral:7.5,Happy:10}[m]||0);
const sRegrets   = r=> Math.max(0,W.regrets*(1-r/5));
const sSavings   = p=> Math.max(0,W.savings*(1-p/100));
const sDebt      = p=> Math.max(0,W.debt*(1-p/100));
const sPaycheck  = d=> Math.max(0,W.paycheck*(1-d/30));

const subscores=[
  {k:'budget',  v:sBudget(CTX.daysLeft)},
  {k:'bills',   v:sBills(CTX.upcomingBills)},
  {k:'category',v:sCat(CTX.categoryOverPct)},
  {k:'recurring',v:sRec(CTX.recurringPct)},
  {k:'mood',    v:sMood(CTX.mood)},
  {k:'regrets', v:sRegrets(CTX.pastRegrets)},
  {k:'savings', v:sSavings(CTX.savingsConflict)},
  {k:'debt',    v:sDebt(CTX.debtLoadPct)},
  {k:'paycheck',v:sPaycheck(CTX.daysToPay)},
];
const rawScore=subscores.reduce((sum,f)=>sum+f.v,0);
const score=Math.round(Math.max(0,Math.min(100,rawScore)));

// 5) Text descriptions & advice
const DESC={
  budget:   `Only ${CTX.daysLeft} day(s) left in your budget cycle.`,
  bills:    `Upcoming bills: \$${CTX.upcomingBills.join(', ')}.`,
  category:`${CTX.categoryOverPct.toFixed(1)}% over in a spending category.`,
  recurring:`${CTX.recurringPct.toFixed(1)}% of income on subscriptions.`,
  mood:     `Mood: ${CTX.mood}.`,
  regrets:  `${CTX.pastRegrets} past regret(s).`,
  savings:  `${CTX.savingsConflict.toFixed(1)}% conflict with savings goals.`,
  debt:     `${CTX.debtLoadPct.toFixed(1)}% of credit used.`,
  paycheck: `Next paycheck in ${CTX.daysToPay} day(s).`
};
const ADVICE={
  budget:   ["Try moving non‑essentials to next cycle."],
  bills:    ["Set reminders so bills aren’t a surprise."],
  category:["Switch to budget‑friendly options."],
  recurring:["Review and cancel unused subs."],
  mood:     {Anxious:["Take 3 deep breaths."],Bored:["Wait 10 minutes before buying."],Neutral:["Review your goals first."],Happy:["Celebrate within budget!"]},
  regrets:  ["Add to wishlist and revisit later."],
  savings:  ["Visualize your goal before buying."],
  debt:     ["Aim to keep utilization under 30%."],
  paycheck:["Consider waiting until after payday."]
};
subscores.sort((a,b)=>a.v-b.v);
const top3=subscores.slice(0,3).map(f=>f.k);

// 6) Build a bigger, friendlier overlay
const ov=document.createElement('div');
ov.id='centsaura-overlay';
Object.assign(ov.style,{
  position:'fixed',top:'5%',left:'5%',
  width:'90%',maxWidth:'500px',background:'#fff',
  border:'3px solid #0066c0',borderRadius:'10px',
  padding:'20px',boxShadow:'0 4px 12px rgba(0,0,0,0.25)',
  fontFamily:'Arial, sans-serif',fontSize:'16px',zIndex:1000000
});
ov.innerHTML=`
  <h2 style="margin:0 0 12px;color:#0066c0">🤗 Hey there!</h2>
  <p style="font-size:20px;margin:0 0 16px;">
    Are you sure you want to make this purchase of <strong>\$${purchaseAmt.toFixed(2)}</strong>?
  </p>
  <p>Your Centsaura score is 
    <span style="font-size:24px;font-weight:bold;color:${
      score<40?'red':score<70?'orange':'green'
    }">${score}</span>/100
  </p>
  <ul style="margin:12px 0 16px;padding-left:20px;">
    ${top3.map(k=>`<li>${DESC[k]}</li>`).join('')}
  </ul>
  <h4 style="margin:0 0 8px">Here’s something to try:</h4>
  <ul style="margin:0 0 16px;padding-left:20px;">
    ${top3.map(k=>{
      const pool=Array.isArray(ADVICE[k])?ADVICE[k]:ADVICE[k][CTX.mood]||[];
      return `<li>${pick(pool)||"Stay mindful of your goals!"}</li>`;
    }).join('')}
  </ul>
  <button id="censa-close" style="
    background:#0066c0;color:white;font-size:18px;
    padding:10px 20px;border:none;borderRadius:6px;
    cursor:pointer;
  ">Continue</button>
`;
document.body.appendChild(ov);
ov.querySelector('#censa-close').onclick=()=>ov.remove();
