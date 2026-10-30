(() => {
  'use strict';
  const body=document.body;
  const btn=document.getElementById('thr');
  const lbl=document.getElementById('lbl');
  const ov=document.getElementById('ov');
  const rpmValue=document.getElementById('rpm-value');
  const rpmStatus=document.getElementById('rpm-status');
  const bar=document.getElementById('bar');
  const soundBtn=document.getElementById('sound-toggle');
  const soundLabel=document.getElementById('sound-label');
  let soundEnabled=false;
  try{soundEnabled=localStorage.getItem('portfolio-engine-sound')==='on'}catch(_){}
  function paintSound(){if(soundBtn){soundBtn.setAttribute('aria-pressed',String(soundEnabled));soundBtn.setAttribute('aria-label',soundEnabled?'Disable transition engine sound':'Enable transition engine sound')}if(soundLabel)soundLabel.textContent=soundEnabled?'Sound on':'Sound off'}
  paintSound();
  if(soundBtn)soundBtn.addEventListener('click',()=>{soundEnabled=!soundEnabled;try{localStorage.setItem('portfolio-engine-sound',soundEnabled?'on':'off')}catch(_){}paintSound()});
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(!body||!btn||!ov)return;

  const DURATION=reducedMotion.matches?950:1900;
  let busy=false;
  let audioEngine=null;

  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const easeInOut=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

  function setSide(side){
    body.dataset.side=side;
    btn.setAttribute('aria-pressed',String(side==='bike'));
    lbl.textContent=side==='bike'?'Ride':'Work';
    document.title=side==='bike'?'Yukin':'Sandesh Chhetri';
    try{history.replaceState(null,'','#'+side)}catch(_){}
    window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'auto'});
  }

  function engineStart(direction){
    if(!window.AudioContext&&!window.webkitAudioContext)return null;
    try{
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      const ctx=new AudioCtx();
      const master=ctx.createGain();
      const filter=ctx.createBiquadFilter();
      const low=ctx.createOscillator();
      const bodyTone=ctx.createOscillator();
      const pulse=ctx.createOscillator();
      const pulseGain=ctx.createGain();
      const lowGain=ctx.createGain();
      const bodyGain=ctx.createGain();
      filter.type='lowpass';filter.frequency.value=650;filter.Q.value=1.1;
      master.gain.value=.0001;
      low.type='sawtooth';bodyTone.type='triangle';pulse.type='square';
      lowGain.gain.value=.48;bodyGain.gain.value=.22;pulseGain.gain.value=0.08;
      low.connect(lowGain).connect(filter);
      bodyTone.connect(bodyGain).connect(filter);
      pulse.connect(pulseGain).connect(master.gain);
      filter.connect(master).connect(ctx.destination);
      const now=ctx.currentTime;
      low.start(now);bodyTone.start(now);pulse.start(now);
      master.gain.setTargetAtTime(.075,now,.08);
      audioEngine={ctx,master,filter,low,bodyTone,pulse,pulseGain,direction};
      if(ctx.state==='suspended')ctx.resume().catch(()=>{});
      return audioEngine;
    }catch(_){return null}
  }

  function engineUpdate(engine,rpm){
    if(!engine||engine.ctx.state==='closed')return;
    const t=engine.ctx.currentTime;
    const hz=clamp(rpm/60,18,165);
    engine.low.frequency.setTargetAtTime(hz,t,.035);
    engine.bodyTone.frequency.setTargetAtTime(hz*2.02,t,.04);
    engine.pulse.frequency.setTargetAtTime(hz*1.01,t,.04);
    engine.filter.frequency.setTargetAtTime(480+rpm*.19,t,.06);
    engine.pulseGain.gain.setTargetAtTime(.035+rpm/10000*.12,t,.04);
    engine.master.gain.setTargetAtTime(.035+rpm/10000*.045,t,.06);
  }

  function engineStop(engine){
    if(!engine)return;
    try{
      const t=engine.ctx.currentTime;
      engine.master.gain.cancelScheduledValues(t);
      engine.master.gain.setTargetAtTime(.0001,t,.07);
      setTimeout(()=>engine.ctx.close().catch(()=>{}),420);
    }catch(_){}
    if(audioEngine===engine)audioEngine=null;
  }

  function rpmAt(progress,direction){
    if(direction==='bike'){
      if(progress<.56){
        const p=progress/.56;
        return 1000+8500*Math.pow(p,1.22);
      }
      const p=(progress-.56)/.44;
      return 9500-6000*(1-Math.pow(1-p,1.5));
    }
    if(progress<.2){
      const p=progress/.2;
      return 3500+1800*Math.sin(p*Math.PI/2);
    }
    const p=(progress-.2)/.8;
    return 5300-4300*Math.pow(p,.78);
  }

  function updateGauge(rpm,direction,progress){
    const normalized=clamp((rpm-1000)/9000,0,1);
    const angle=-55+normalized*110;
    ov.style.setProperty('--rpm-angle',angle+'deg');
    ov.style.setProperty('--transition-progress',String(progress));
    if(rpmValue)rpmValue.textContent=(rpm/1000).toFixed(1);
    if(rpmStatus){
      rpmStatus.textContent=direction==='bike'
        ?(progress<.22?'IGNITION / CLUTCH IN':progress<.62?'ENGINE REVVING':'RIDE MODE ENGAGED')
        :(progress<.2?'DOWNSHIFT / DECELERATE':progress<.72?'ENGINE WINDING DOWN':'WORK MODE ONLINE');
    }
  }

  function twist(){
    if(busy)return;
    busy=true;
    const from=body.dataset.side||'work';
    const to=from==='work'?'bike':'work';
    const direction=to==='bike'?'bike':'work';
    const engine=soundEnabled?engineStart(direction):null;
    ov.dataset.to=to;
    ov.style.setProperty('--transition-progress','0');
    ov.classList.remove('on');
    void ov.offsetWidth;
    ov.classList.add('on');
    btn.disabled=true;
    if(soundBtn)soundBtn.disabled=true;
    if(navigator.vibrate&&!reducedMotion.matches){
      try{navigator.vibrate(direction==='bike'?[45,30,85,30,120]:[75,35,55])}catch(_){}
    }
    const start=performance.now();
    let swapped=false;
    function frame(now){
      const progress=clamp((now-start)/DURATION,0,1);
      const eased=easeInOut(progress);
      const rpm=rpmAt(eased,direction);
      updateGauge(rpm,direction,eased);
      engineUpdate(engine,rpm);
      if(!swapped&&progress>=.61){
        swapped=true;
        setSide(to);
      }
      if(progress<1){
        requestAnimationFrame(frame);
      }else{
        updateGauge(direction==='bike'?3500:1000,direction,1);
        engineUpdate(engine,direction==='bike'?3500:1000);
        window.setTimeout(()=>{
          ov.classList.remove('on');
          engineStop(engine);
          btn.disabled=false;
          if(soundBtn)soundBtn.disabled=false;
          busy=false;
        },reducedMotion.matches?60:180);
      }
    }
    requestAnimationFrame(frame);
  }

  btn.addEventListener('click',twist);
  window.addEventListener('keydown',event=>{
    const target=event.target;
    const typing=target&&(target.isContentEditable||/INPUT|TEXTAREA|SELECT/.test(target.tagName));
    if(!typing&&event.key.toLowerCase()==='t'&&!event.metaKey&&!event.ctrlKey&&!event.altKey){
      event.preventDefault();twist();
    }
  });
  if(bar){
    window.addEventListener('scroll',()=>{
      const total=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
      bar.style.width=(window.scrollY/total*100)+'%';
    },{passive:true});
  }
  if(location.hash==='#bike')setSide('bike');
  else setSide('work');
})();