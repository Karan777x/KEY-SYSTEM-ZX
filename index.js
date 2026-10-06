const json = (data, status=200) =>
  new Response(JSON.stringify(data), {status, headers: {"content-type":"application/json","access-control-allow-origin":"*"}});

function auth(request, env) {
  return request.headers.get("authorization") === `Bearer ${env.ADMIN_TOKEN}`;
}

function randomKey() {
  const a = crypto.randomUUID().replaceAll("-", "").toUpperCase();
  return `KS-${a.slice(0,4)}-${a.slice(4,8)}-${a.slice(8,12)}-${a.slice(12,16)}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS")
      return new Response(null, {headers: {"access-control-allow-origin":"*", "access-control-allow-methods":"GET,POST,OPTIONS", "access-control-allow-headers":"content-type,authorization"}});

    if (url.pathname === "/api/key/verify" && request.method === "POST") {
      const body = await request.json().catch(()=>({}));
      const key = String(body.key || "").trim().toUpperCase();
      const deviceId = body.device_id ? String(body.device_id) : null;
      if (!key) return json({ok:false,error:"Key required"},400);

      const row = await env.DB.prepare("SELECT * FROM keys WHERE key = ?").bind(key).first();
      if (!row) return json({ok:false,error:"Invalid key"},404);

      const now = Math.floor(Date.now()/1000);
      if (row.status !== "active") return json({ok:false,error:`Key ${row.status}`},403);
      if (row.expires_at <= now) {
        await env.DB.prepare("UPDATE keys SET status='expired' WHERE id=?").bind(row.id).run();
        return json({ok:false,error:"Key expired"},403);
      }

      if (row.device_id && row.device_id !== deviceId)
        return json({ok:false,error:"Key is bound to another device"},403);

      if (!row.device_id && deviceId)
        await env.DB.prepare("UPDATE keys SET device_id=? WHERE id=?").bind(deviceId,row.id).run();

      return json({ok:true,key,expires_at:row.expires_at});
    }

    if (url.pathname === "/api/admin/keys" && request.method === "GET") {
      if (!auth(request,env)) return json({error:"Unauthorized"},401);
      const {results} = await env.DB.prepare("SELECT id,key,expires_at,status,device_id,created_at FROM keys ORDER BY id DESC LIMIT 200").all();
      return json({results});
    }

    if (url.pathname === "/api/admin/keys" && request.method === "POST") {
      if (!auth(request,env)) return json({error:"Unauthorized"},401);
      const body = await request.json().catch(()=>({}));
      const hours = Math.max(1, Math.min(Number(body.hours || 24), 87600));
      const key = randomKey();
      const now = Math.floor(Date.now()/1000);
      const expires = now + hours*3600;
      await env.DB.prepare("INSERT INTO keys(key,expires_at,status,created_at) VALUES(?,?, 'active',?)")
        .bind(key,expires,now).run();
      return json({ok:true,key,expires_at:expires});
    }

    if (url.pathname.startsWith("/api/admin/keys/") && request.method === "POST") {
      if (!auth(request,env)) return json({error:"Unauthorized"},401);
      const id = Number(url.pathname.split("/").pop());
      const body = await request.json().catch(()=>({}));
      if (body.action === "revoke") {
        await env.DB.prepare("UPDATE keys SET status='revoked' WHERE id=?").bind(id).run();
        return json({ok:true});
      }
    }

    if (url.pathname === "/api/health") return json({ok:true});
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response("KeySystem");
  }
};
