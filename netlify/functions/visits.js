// netlify/functions/visits.js
import fs from "fs";

export async function handler(event) {
  const params = new URLSearchParams(event.queryStringParameters || {});
  const site = params.get("site") || "Default"; // nom du projet
  const FILE = `/tmp/visits_${site}.json`;

  const ip = event.headers["x-nf-client-connection-ip"] || "inconnue";

  // Domaines autorisés (tous tes GitHub Pages + ton Netlify)
  const allowedOrigins = [
    "https://smes21540.github.io",
    "https://smes21540.github.io/Drive",
    "https://smes21540.github.io/Oxyane",
    "https://smes21540.github.io/Invivo_St_Usage",
    "https://smes21540.netlify.app"
  ];
  const origin = event.headers.origin || "";
  const corsOrigin = allowedOrigins.find(o => origin.startsWith(o))
    ? origin
    : "https://smes21540.github.io";

  // Charger le compteur correspondant
  let data = {};
  try {
    if (fs.existsSync(FILE)) {
      data = JSON.parse(fs.readFileSync(FILE, "utf8"));
    }
  } catch (e) {
    console.warn(`⚠️ Lecture compteur ${site} échouée :`, e);
  }

  // Calcul semaine courante
  const now = new Date();
  const year = now.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const week = Math.ceil((((now - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  const weekKey = `${year}-W${String(week).padStart(2, "0")}`;

  // Incrément si ce n’est pas ton IP
  if (ip !== "88.164.133.142") {
    data[weekKey] = (data[weekKey] || 0) + 1;
    try {
      fs.writeFileSync(FILE, JSON.stringify(data), "utf8");
    } catch (e) {
      console.warn(`⚠️ Écriture compteur ${site} échouée :`, e);
    }
  }

  const visits = data[weekKey] || 0;
  const info = ip === "88.164.133.142" ? "(admin non compté)" : "";

  // CORS
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ site, week: weekKey, visits, ip, info })
  };
}
