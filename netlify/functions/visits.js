// netlify/functions/visits.js
import fs from "fs";

export async function handler(event) {
  const FILE = "/tmp/visits.json";

  // Récupération IP du visiteur (Netlify la met dans ce header)
  const ip = event.headers["x-nf-client-connection-ip"] || "inconnue";

  // 👇 IGNORER TON IP
  if (ip === "88.164.133.142") {
    console.log("🧠 Visite ignorée (Kevin - IP admin)");
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        week: "",
        visits: "(admin non compté)",
        ip
      })
    };
  }

  // Lecture du cache temporaire
  let data = {};
  try {
    if (fs.existsSync(FILE)) {
      data = JSON.parse(fs.readFileSync(FILE, "utf8"));
    }
  } catch (e) {
    console.warn("⚠️ Lecture compteur échouée :", e);
  }

  // Calcul semaine en cours
  const now = new Date();
  const year = now.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const week = Math.ceil((((now - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  const weekKey = `${year}-W${String(week).padStart(2,"0")}`;

  // Incrément
  data[weekKey] = (data[weekKey] || 0) + 1;

  // Sauvegarde sur /tmp
  try {
    fs.writeFileSync(FILE, JSON.stringify(data), "utf8");
  } catch (e) {
    console.warn("⚠️ Écriture compteur échouée :", e);
  }

  // Retourne le total
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ week: weekKey, visits: data[weekKey], ip })
  };
}

