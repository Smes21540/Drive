// netlify/functions/visits.js
import fetch from "node-fetch";

const TOKEN = process.env.GITHUB_TOKEN;

export async function handler(event) {
  const params = new URLSearchParams(event.queryStringParameters || {});
  const site = params.get("site") || "Drive"; // nom du projet
  const repo = `smes21540/${site}`;           // dépôt GitHub correspondant
  const file = `visits_${site}.json`;         // fichier de stockage

  const now = new Date();
  const year = now.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const week = Math.ceil((((now - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  const weekKey = `${year}-W${String(week).padStart(2, "0")}`;
  const ip = event.headers["x-nf-client-connection-ip"] || "inconnue";

  // --- Étape 1 : lire le fichier sur GitHub ---
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${file}`;
  let data = {};
  let sha = null;
  try {
    const res = await fetch(apiUrl, { headers: { Authorization: `token ${TOKEN}` } });
    const json = await res.json();
    if (json.content) {
      data = JSON.parse(Buffer.from(json.content, "base64").toString("utf8"));
      sha = json.sha;
    }
  } catch (e) {
    console.warn("⚠️ Lecture GitHub échouée :", e);
  }

  if (typeof data !== "object" || data === null) data = {};

  // --- Étape 2 : incrément si ce n’est pas ton IP admin ---
  if (ip !== "88.164.133.145") {
    data[weekKey] = (data[weekKey] || 0) + 1;
    data.lastUpdate = new Date().toISOString();
  }

  const visits = data[weekKey] || 0;
  const info = ip === "88.164.133.142" ? "(admin non compté)" : "";

  // --- Étape 3 : envoyer la mise à jour sur GitHub ---
  const newContent = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");
  try {
    await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `update visits ${weekKey}`,
        content: newContent,
        sha
      })
    });
  } catch (e) {
    console.warn("⚠️ Écriture GitHub échouée :", e);
  }

  // --- Réponse CORS ---
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
