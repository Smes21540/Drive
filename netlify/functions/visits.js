// netlify/functions/visits.js
import fetch from "node-fetch";

export async function handler(event) {
  const params = new URLSearchParams(event.queryStringParameters || {});
  const site = params.get("site") || "Default"; // ex: Drive, Oxyane...
  const fileName = "visits.json"; // toujours le même nom
  const DRIVE_URL = "https://smes21540.netlify.app/.netlify/functions/drive";
  const folder = site; // dossier courant sur le Drive

  // 🔹 Lecture du fichier existant sur le Drive
  let data = {};
  try {
    const res = await fetch(`${DRIVE_URL}?file=${fileName}&site=${folder}`);
    if (res.ok) {
      data = await res.json();
    } else {
      console.log(`Aucun fichier ${fileName} trouvé — il sera créé.`);
    }
  } catch (e) {
    console.warn("⚠️ Erreur lecture Drive :", e);
  }

  // 🔹 Si pas de contenu valide, on initialise
  if (typeof data !== "object" || data === null) data = {};
  if (typeof data.note !== "number") data.note = 0;

  // 🔹 Incrémentation de la note
  data.note++;
  data.lastUpdate = new Date().toISOString();

  // 🔹 Sauvegarde du nouveau JSON sur le Drive
  try {
    await fetch(`${DRIVE_URL}?file=${fileName}&site=${folder}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.warn("⚠️ Erreur écriture Drive :", e);
  }

  // 🔹 Réponse CORS autorisant tes sites
  const origin = event.headers.origin || "";
  const allowed = [
    "https://smes21540.github.io",
    "https://smes21540.github.io/Drive",
    "https://smes21540.github.io/Oxyane",
    "https://smes21540.github.io/Invivo_St_Usage",
    "https://smes21540.netlify.app"
  ];
  const corsOrigin = allowed.find(o => origin.startsWith(o))
    ? origin
    : "https://smes21540.github.io";

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ site, note: data.note, lastUpdate: data.lastUpdate })
  };
}
