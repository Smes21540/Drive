// netlify/functions/visits.js
import fetch from "node-fetch";

export async function handler(event) {
  const params = new URLSearchParams(event.queryStringParameters || {});
  const site = params.get("site") || "Default";
  const fileName = `visits_${site}.json`;

  // ton proxy existant
  const DRIVE_URL = "https://smes21540.netlify.app/.netlify/functions/drive";
  const ip = event.headers["x-nf-client-connection-ip"] || "inconnue";

  // --- Calcul semaine en cours ---
  const now = new Date();
  const year = now.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const week = Math.ceil((((now - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  const weekKey = `${year}-W${String(week).padStart(2, "0")}`;

  // --- Lecture du fichier JSON existant sur le Drive ---
  let data = {};
  try {
    const res = await fetch(`${DRIVE_URL}?file=${fileName}&site=Smes_Acces`);
    if (res.ok) {
      data = await res.json();
    } else {
      console.warn(`Aucun fichier ${fileName} trouvé, création...`);
    }
  } catch (e) {
    console.warn("⚠️ Lecture Drive échouée :", e);
  }

  // --- Si pas de contenu JSON valide, on initialise ---
  if (typeof data !== "object" || data === null) data = {};

  // --- Incrément si ce n’est pas ton IP admin ---
  if (ip !== "88.164.133.142") {
    data[weekKey] = (data[weekKey] || 0) + 1;
    data.lastUpdate = new Date().toISOString();
  }

  const visits = data[weekKey] || 0;
  const info = ip === "88.164.133.142" ? "(admin non compté)" : "";

  // --- Sauvegarde du JSON mis à jour dans le Drive ---
  try {
    await fetch(`${DRIVE_URL}?file=${fileName}&site=Smes_Acces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.warn("⚠️ Sauvegarde Drive échouée :", e);
  }

  // --- CORS multi-sites ---
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

  // --- Réponse finale ---
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      site,
      week: weekKey,
      visits,
      lastUpdate: data.lastUpdate || null,
      info
    })
  };
}
