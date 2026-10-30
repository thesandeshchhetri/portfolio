const SOUND=true;
const body=document.body,btn=document.getElementById('thr'),lbl=document.getElementById('lbl'),ov=document.getElementById('ov');
const rpmValue=document.getElementById('rpm-value'),rpmStatus=document.getElementById('rpm-status');
document.getElementById('yrs').textContent=new Date().getFullYear()-2017;
let busy=false;
function setSide(s){body.dataset.side=s;btn.setAttribute('aria-pressed',String(s==='bike'));lbl.textContent=s==='bike'?'Ride':'Work';document.title=s==='bike'?'Yukin':'Sandesh Chhetri';try{history.replaceState(null,'','#'+s)}catch{}scrollTo(0,0)}
function playEngine(direction){
  if(!SOUND)return;
  try{
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx)return;
    const c=new AudioCtx(),o=c.createOscillator(),g=c.createGain(),filter=c.createBiquadFilter(),t=c.currentTime;
    o.type='sawtooth';filter.type='lowpass';filter.frequency.setValueAtTime(900,t);
    const start=direction==='bike'?75:390,end=direction==='bike'?390:75,peak=direction==='bike'?520:115;
    o.frequency.setValueAtTime(start,t);
    o.frequency.exponentialRampToValueAtTime(peak,t+.72);
    o.frequency.exponentialRampToValueAtTime(end,t+1.55);
    filter.frequency.exponentialRampToValueAtTime(direction==='bike'?1800:500,t+.7);
    filter.frequency.exponentialRampToValueAtTime(650,t+1.55);
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.045,t+.16);g.gain.setValueAtTime(.035,t+.72);g.gain.exponentialRampToValueAtTime(.0001,t+1.55);
    o.connect(filter).connect(g).connect(c.destination);o.start(t);o.stop(t+1.6);
    o.onended=()=>c.close();
  }catch{}
}
function rpmAt(p,direction){
  if(direction==='bike'){
    if(p<.58){const q=p/.58;return 1000+7600*Math.pow(q,1.45)}
    const q=(p-.58)/.42;return 8600-5100*(1-Math.pow(1-q,1.35));
  }
  if(p<.18){const q=p/.18;return 3500+1900*Math.sin(q*Math.PI)}
  const q=(p-.18)/.82;return 3500-2500*Math.pow(q,.82);
}
function updateGauge(rpm,direction){
  const angle=-126+(rpm/10000)*252;
  ov.style.setProperty('--rpm-angle',angle+'deg');
  if(rpmValue)rpmValue.textContent=(rpm/1000).toFixed(1);
  if(rpmStatus)rpmStatus.textContent=direction==='bike'?(rpm>7000?'ENGINE REVVING':'RIDE MODE ENGAGED'):(rpm>4000?'ENGINE WINDING DOWN':'WORK MODE ENGAGED');
}
function twist(){
  if(busy)return;
  busy=true;
  const from=body.dataset.side||'work',to=from==='work'?'bike':'work',direction=to==='bike'?'bike':'work';
  ov.dataset.to=to;ov.classList.add('on');
  playEngine(direction);
  if(navigator.vibrate)navigator.vibrate(direction==='bike'?[55,35,90,35,150]:[100,45,65]);
  const start=performance.now(),D=1700;let swapped=false;
  (function frame(now){
    const p=Math.min((now-start)/D,1);
    const eased=p*p*(3-2*p);
    updateGauge(rpmAt(eased,direction),direction);
    if(p>=.57&&!swapped){swapped=true;setSide(to)}
    if(p<1)requestAnimationFrame(frame);
    else{updateGauge(direction==='bike'?3500:1000,direction);ov.classList.remove('on');busy=false}
  })(start);
}
btn.addEventListener('click',twist);
const bar=document.getElementById('bar');
addEventListener('scroll',()=>{bar.style.width=scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)*100+'%'},{passive:true});
addEventListener('keydown',e=>{if(e.key.toLowerCase()==='t'&&!e.metaKey&&!e.ctrlKey&&!e.altKey)twist()});
if(location.hash==='#bike')setSide('bike');
