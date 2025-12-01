// netlify/functions/visits.js
import fs from "fs";

export async function handler(event) {
  const FILE = "/tmp/visits.json";
  const ip = event.headers["x-nf-client-connection-ip"] || "inconnue";

  // Charger les données existantes
  let data = {};
  try {
    if (fs.existsSync(FILE)) {
      data = JSON.parse(fs.readFileSync(FILE, "utf8"));
    }
  } catch (e) {
    console.warn("⚠️ Lecture compteur échouée :", e);
  }

  // Calcul semaine courante
  const now = new Date();
  const year = now.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const week = Math.ceil((((now - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  const weekKey = `${year}-W${String(week).padStart(2, "0")}`;

  // Incrément si ce n'est pas toi
  if (ip !== "88.164.133.142") {
    data[weekKey] = (data[weekKey] || 0) + 1;
    try {
      fs.writeFileSync(FILE, JSON.stringify(data), "utf8");
    } catch (e) {
      console.warn("⚠️ Écriture compteur échouée :", e);
    }
  }

  const visits = data[weekKey] || 0;
  const info = ip === "88.164.133.142" ? "(admin non compté)" : "";

  // ✅ CORS autorise GitHub Pages
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "https://smes21540.github.io",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  };

  // Réponse aux requêtes CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  // Réponse normale
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ week: weekKey, visits, ip, info })
  };
}
