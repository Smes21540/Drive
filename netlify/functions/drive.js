// === Variables globales (stockées en mémoire tant que la fonction reste chaude) ===
let invivoSessionStart = null;
let invivoBlockedUntil = null;

export async function handler(event, context) {
  const id = event.queryStringParameters.id;
  const name = event.queryStringParameters.name || "";
  const list = event.queryStringParameters.list === "true";

  if (!id) {
    return { statusCode: 400, body: "Missing id parameter" };
  }

  // 🔐 Clé API stockée sur Netlify
  const key = process.env.API_KEY;

  // 🌍 Autorisation multi-origines (3 sous-sites + local)
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

    // 🧾 Log du compteur Invivo dans la console Netlify
    console.log("[Invivo Timer]", {
      now,
      invivoSessionStart,
      invivoBlockedUntil,
      secondsSinceStart: invivoSessionStart ? Math.round((now - invivoSessionStart) / 1000) : null,
      secondsUntilUnblock: invivoBlockedUntil ? Math.round((invivoBlockedUntil - now) / 1000) : null
    });

    // Si déjà bloqué
    if (invivoBlockedUntil && now < invivoBlockedUntil) {
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

    // Première utilisation → démarrage du chrono
    if (!invivoSessionStart) invivoSessionStart = now;

    // Si plus de 1 min écoulée → blocage pour 1h
    if (now - invivoSessionStart > 1 * 60 * 1000) { // ⏱️ 1 minute
      invivoBlockedUntil = now + 60 * 60 * 1000; // 1h de blocage
      invivoSessionStart = null;
      console.log("[Invivo Timer] 🔒 Accès bloqué pour 1h à partir de maintenant.");
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

  // === Si autorisé, traitement normal ===
  try {
    // 🗂️ Liste de fichiers Drive
    if (list) {
      const url = `https://www.googleapis.com/drive/v3/files?q='${id}'+in+parents+and+trashed=false&key=${key}&fields=files(id,name,mimeType,size,createdTime,modifiedTime)`;
      const response = await fetch(url);
      const data = await response.json();

      return {
        statusCode: response.ok ? 200 : response.status,
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

    // 🧾 Téléchargement du fichier
    const url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${key}`;
    const response = await fetch(url);
    if (!response.ok) {
      return { statusCode: response.status, body: "Erreur Google Drive" };
    }

    const data = await response.arrayBuffer();

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const isTodayFile = name.includes(today);
    const cacheSeconds = isTodayFile ? 60 : 3600;

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": `public, max-age=${cacheSeconds}, must-revalidate`,
        "Content-Type":
          response.headers.get("content-type") || "application/octet-stream"
      },
      body: Buffer.from(data).toString("base64"),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error("Erreur proxy Drive:", err);
    return { statusCode: 500, body: "Erreur interne proxy Drive" };
  }
}
