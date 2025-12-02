// netlify/functions/visits.js
import fetch from "node-fetch";

export async function handler(event) {
  const params = new URLSearchParams(event.queryStringParameters || {});
  const site = params.get("site") || "Default";

  // Ton endpoint Drive Netlify
  const DRIVE_URL = "https://smes21540.netlify.app/.netlify/functions/drive";

  // Calcul de la semaine courante
  const now = new Date();
  const year = now.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const week = Math.ceil((((now - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  const weekKey = `${year}-W${String(week).padStart(2, "0")}`;

  const ip = event.headers["x-nf-client-connection-ip"] || "inconnue";

  // Nom du fichier sur le Drive
  const fileName = `visits_${site}.json`;

  // Lire le fichier existant
  let data = {};
  try {
    const res = await fetch(`${DRIVE_URL}?file=${fileName}&site=Smes_Acces`);
    if (res.ok) data = await res.json();
  } catch (e) {
    console.warn("⚠️ Lecture Drive échouée :", e);
  }

  // Si pas de fichier ou format incorrect
  if (typeof data !== "object" || data === null) data = {};

  // Incrément si ce n’est pas ton IP
  if (ip !== "88.164.133.142") {
    data[weekKey] = (data[weekKey] || 0) + 1;
  }

  const visits = data[weekKey] || 0;
  const info = ip === "88.164.133.142" ? "(admin non compté)" : "";

  // Sauvegarder le nouveau JSON sur le Drive
  try {
    await fetch(`${DRIVE_URL}?file=${fileName}&site=Smes_Acces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.warn("⚠️ Sauvegarde Drive échouée :", e);
  }

  // Réponse CORS
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
    body: JSON.stringify({ site, week: weekKey, visits, info })
  };
}
