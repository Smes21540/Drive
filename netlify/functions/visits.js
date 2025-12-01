// netlify/functions/visits.js
import fs from "fs";

export async function handler() {
  const FILE = "/tmp/visits.json";

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
  const weekKey = `${year}-W${String(week).padStart(2,"0")}`;

  // Incrément du compteur
  data[weekKey] = (data[weekKey] || 0) + 1;

  // Écriture dans le cache temporaire de la fonction
  try {
    fs.writeFileSync(FILE, JSON.stringify(data), "utf8");
  } catch (e) {
    console.warn("⚠️ Écriture compteur échouée :", e);
  }

  // Retourner le total de la semaine courante
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ week: weekKey, visits: data[weekKey] })
  };
}
