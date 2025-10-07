// === Variables globales (gardées tant que la fonction reste chaude) ===
let invivoSessionStart = null;
let invivoBlockedUntil = null;

export async function handler(event, context) {
  const id = event.queryStringParameters.id;
  const name = event.queryStringParameters.name || "";
  const list = event.queryStringParameters.list === "true";

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
  const allowOrigin =
    allowedOrigins.find(o => origin.startsWith(o)) || "*";

  // 🕓 Contrôle spécifique pour Invivo_St_Usage
  if (origin.includes("Invivo_St_Usage")) {
    const now = Date.now();

    console.log("[Invivo Timer]", {
      now,
      invivoSessionStart,
      invivoBlockedUntil,
      secondsSinceStart: invivoSessionStart
        ? Math.round((now - invivoSessionStart) / 1000)
        : null,
      secondsUntilUnblock: invivoBlockedUntil
        ? Math.round((invivoBlockedUntil - now) / 1000)
        : null
    });

    // Déjà bloqué ?
    if (invivoBlockedUntil && now < invivoBlockedUntil) {
      console.log("[Invivo Timer] 🚫 Blocage toujours actif.");
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

    // Démarrage de la session
    if (!invivoSessionStart) invivoSessionStart = now;

    // ⏱️ 1 minute de session gratuite
    if (now - invivoSessionStart > 1 * 60 * 1000) {
      invivoBlockedUntil = now + 60 * 60 * 1000; // blocage 1 h
      invivoSessionStart = null;
      console.log("[Invivo Timer] 🔒 Blocage déclenché pour 1 heure.");
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
