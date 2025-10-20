// === Variables globales (stockées en mémoire tant que la fonction reste chaude) ===
import { google } from "googleapis";

let invivoSessionStart = null;
let invivoBlockedUntil = null;

/* === Fonction : génération automatique du token Drive via compte de service === */
async function getAccessTokenFromServiceAccount() {
  try {
    const serviceJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
const auth = new google.auth.GoogleAuth({
  credentials: serviceJson,
  scopes: ["https://www.googleapis.com/auth/drive"]
});

    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token.token;
  } catch (err) {
    console.error("Erreur génération token service account:", err);
    return null;
  }
}

export async function handler(event, context) {
  const method = event.httpMethod;
  const key = process.env.API_KEY;
  const origin = event.headers.origin || "";

  // 🔓 Autoriser GitHub Pages et ton domaine Netlify
  const baseAllowed = [
    "https://smes21540.github.io",
    "https://smes21540.netlify.app"
  ];
  const allowOrigin = baseAllowed.includes(origin)
    ? origin
    : "https://smes21540.github.io";

  // ✅ Réponse préflight (CORS)
  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: ""
    };
  }

  // ✏️ --- Bloc d'upload de notes (POST via service account) ---
  if (method === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      if (!body.upload || !body.parentId || !body.name || !body.content) {
        return { statusCode: 400, body: "Paramètres manquants pour upload" };
      }

      // Génération du token Drive
      const token = await getAccessTokenFromServiceAccount();
      if (!token) {
        return { statusCode: 500, body: "Impossible de générer un token Drive" };
      }

      const metadata = {
        name: body.name,
        parents: [body.parentId],
        mimeType: body.mimeType || "text/plain"
      };

      const boundary = "-------smesuploadboundary" + Date.now();
      const multipartBody =
        `--${boundary}\r\n` +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) + "\r\n" +
        `--${boundary}\r\n` +
        `Content-Type: ${metadata.mimeType}\r\n\r\n` +
        body.content + "\r\n" +
        `--${boundary}--`;

      const uploadUrl =
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      });

      if (!res.ok) {
        const errTxt = await res.text();
        console.error("Erreur upload:", errTxt);
        return {
          statusCode: res.status,
          headers: {
            "Access-Control-Allow-Origin": allowOrigin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          },
          body: "Erreur upload Drive"
        };
      }

      const result = await res.json();
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": allowOrigin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ success: true, id: result.id })
      };
    } catch (err) {
      console.error("Erreur upload proxy:", err);
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": allowOrigin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        },
        body: "Erreur interne upload"
      };
    }
  }

  // ==========================
  // 🧾  Partie lecture (GET) — version stable
  // ==========================
  const id = event.queryStringParameters.id;
  const name = event.queryStringParameters.name || "";
  const list = event.queryStringParameters.list === "true";

  if (!id) {
    return { statusCode: 400, body: "Missing id parameter" };
  }

  // 🕓 Contrôle spécifique pour Invivo_St_Usage
  if (origin.includes("Invivo_St_Usage")) {
    const now = Date.now();
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
    if (!invivoSessionStart) invivoSessionStart = now;
    if (now - invivoSessionStart > 5 * 60 * 1000) {
      invivoBlockedUntil = now + 60 * 60 * 1000;
      invivoSessionStart = null;
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

  try {
    // 🗂️ Liste de fichiers Drive (API publique)
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

    // 🧾 Téléchargement du fichier (API publique)
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
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: "Erreur interne proxy Drive"
    };
  }
}
