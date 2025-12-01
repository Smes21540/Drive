// netlify/functions/visits.js
import fs from "fs";

export async function handler(event) {
  const FILE = "/tmp/visits.json";

  // Récupérer l'IP du visiteur (transmise par Netlify)
  const ip = event.headers["x-nf-client-connection-ip"] || "inconnue";

  // Charger les données existantes (ou un objet vide)
  let data = {};
  try {
    if (fs.existsSync(FILE)) {
      data = JSON.parse(fs.readFileSync(FILE, "utf8"));
    }
  } catch (e) {
    console.warn("⚠️ Lecture compteur échouée :", e);
  }

  // Calcul de la semaine courante
  const now = new Date();
  const year = now.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const week = Math.ceil((((now - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  const weekKey = `${year}-W${String(week).padStart(2, "0")}`;

  // 👇 Si ce n'est PAS ton IP → incrément
  if (ip !== "88.164.133.142") {
    data[weekKey] = (data[weekKey] || 0) + 1;

    try {
      fs.writeFileSync(FILE, JSON.stringify(data), "utf8");
    } catch (e) {
      console.warn("⚠️ Écriture compteur échouée :", e);
    }
  }

  // 🔸 Si ton IP : juste renvoyer le compteur sans l'incrémenter
  const visits = data[weekKey] || 0;
  const info = ip === "88.164.133.142" ? "(admin non compté)" : "";

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ week: weekKey, visits, ip, info })
  };
}
