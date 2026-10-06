async function verify(){
 const out=document.getElementById('out');
 out.textContent='Checking...';
 const r=await fetch('/api/key/verify',{method:'POST',headers:{'content-type':'application/json'},
 body:JSON.stringify({key:document.getElementById('key').value,device_id:document.getElementById('device').value})});
 out.textContent=JSON.stringify(await r.json(),null,2);
}