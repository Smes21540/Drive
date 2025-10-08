// === Variables globales (gardées tant que la fonction reste chaude) ===
let sessionStart = null;
let blockedUntil = null;

// === Nom d’accès à bloquer ===
// 👉 Si le paramètre &site= correspond à cette valeur → accès limité
const BLOCKED_KEY = "Smes_Accès";

export async function handler(event, context) {
  const id = event.queryStringParameters.id;
  const name = event.queryStringParameters.name || "";
  const list = event.queryStringParameters.list === "true";
  const site = event.queryStringParameters.site || ""; // ⬅️ transmis par index.html

  if (!id) {
    return { statusCode: 400, body: "Missing id parameter" };
  }

  const key = process.env.API_KEY;
  const origin = event.headers.origin || "";
  const allowedOrigins = [
    "https://smes21540.github.io/Drive",
    "https://smes21540.github.io/Oxyane",
    "https://smes21540.github.io/Invivo_St_Usage",
    "file://",
    ""
  ];
  const allowOrigin = allowedOrigins.find(o => origin.startsWith(o)) || "*";

  // 🕓 Si le site correspond à la clé bloquée → activer la limite
  if (site === BLOCKED_KEY) {
    const now = Date.now();

    console.log(`[${site}] Vérif chrono`, {
      now,
      sessionStart,
      blockedUntil,
      depuis: sessionStart ? Math.round((now - sessionStart) / 1000) : null
    });

    // Déjà bloqué ?
    if (blockedUntil && now < blockedUntil) {
      console.log(`[${site}] ⛔ Blocage actif encore ${(blockedUntil - now)/1000}s`);
      return {
        statusCode: 403,
        headers: {
          "Access-Control-Allow-Origin": allowOrigin,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        },
        body: "Accès suspendu : merci de régulariser votre abonnement."
      };
    }

    // Démarrage de session
    if (!sessionStart) sessionStart = now;

    // ⏱️ 8 minute d’accès gratuit
    if (now - sessionStart > 8 * 60 * 1000) {
      blockedUntil = now + 60 * 60 * 1000; // blocage 1h
      sessionStart = null;
      console.log(`[${site}] 🔒 Blocage activé pour 1h`);
      return {
        statusCode: 403,
        headers: {
          "Access-Control-Allow-Origin": allowOrigin,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        },
        body: "Accès suspendu : merci de régulariser votre abonnement."
      };
    }
  }

  // === Si autorisé, comportement normal ===
  try {
    const base = "https://www.googleapis.com/drive/v3/files/";
    if (list) {
      const url = `${base}?q='${id}'+in+parents+and+trashed=false&key=${key}&fields=files(id,name,mimeType,size,createdTime,modifiedTime)`;
      const r = await fetch(url);
      const data = await r.json();
      return {
        statusCode: r.ok ? 200 : r.status,
        headers: {
          "Access-Control-Allow-Origin": allowOrigin,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Cache-Control": "public, max-age=30, must-revalidate",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      };
    }

    const url = `${base}${id}?alt=media&key=${key}`;
    const r = await fetch(url);
    if (!r.ok) return { statusCode: r.status, body: "Erreur Google Drive" };

    const data = await r.arrayBuffer();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const cacheSeconds = name.includes(today) ? 60 : 3600;

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": `public, max-age=${cacheSeconds}, must-revalidate`,
        "Content-Type":
          r.headers.get("content-type") || "application/octet-stream"
      },
      body: Buffer.from(data).toString("base64"),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error("Erreur proxy Drive:", err);
    return { statusCode: 500, body: "Erreur interne proxy Drive" };
  }
}
