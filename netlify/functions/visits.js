import fetch from "node-fetch";

export async function handler(event) {
  try {
    const { site = "default", add = "1" } = event.queryStringParameters;
    const increment = parseInt(add, 10) || 1;

    const repo = "smes21540/visits-data"; // dépôt GitHub cible
    const path = "visits.json";            // un seul fichier commun à tous les sites
    const token = process.env.GITHUB_TOKEN;

    // 1️⃣ Lire le fichier actuel
    const resGet = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "NetlifyFunction" },
    });
    const jsonGet = await resGet.json();
    let data = {};
    let sha = null;

    if (jsonGet.content) {
      data = JSON.parse(Buffer.from(jsonGet.content, "base64").toString());
      sha = jsonGet.sha;
    }

    // 2️⃣ Calcul de la semaine courante
    const now = new Date();
    const year = now.getFullYear();
    const week = Math.ceil((((now - new Date(year, 0, 1)) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);
    const weekKey = `${year}-W${String(week).padStart(2, "0")}`;

    // 3️⃣ Mettre à jour le site et la semaine
    if (!data[site]) data[site] = {};
    data[site][weekKey] = (data[site][weekKey] || 0) + increment;

    const newContent = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");

    // 4️⃣ Commit unique sur GitHub
    await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "NetlifyFunction",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Update visits for ${site} (${weekKey})`,
        content: newContent,
        sha,
        branch: "main",
      }),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ site, week: weekKey, visits: data[site][weekKey] }),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    };
  } catch (err) {
    console.error("Erreur visits.js :", err);
    return { statusCode: 500, body: "Erreur interne" };
  }
}
