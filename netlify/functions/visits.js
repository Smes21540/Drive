import fetch from "node-fetch";

export async function handler(event) {
  try {
    const { site = "default", add = "1" } = event.queryStringParameters;
    const increment = parseInt(add, 10) || 1;

    const repo = "smes21540/visits-data"; // dépôt GitHub cible
    const path = `${site}.json`;           // un fichier JSON par site
    const token = process.env.GITHUB_TOKEN;

    // 1️⃣ Lire le fichier actuel
    const resGet = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "NetlifyFunction" },
    });
    const jsonGet = await resGet.json();
    let count = 0, sha = null;

    if (jsonGet.content) {
      const data = JSON.parse(Buffer.from(jsonGet.content, "base64").toString());
      count = data.visits || 0;
      sha = jsonGet.sha;
    }

    // 2️⃣ Mettre à jour
    count += increment;

    const newContent = Buffer.from(JSON.stringify({ visits: count }, null, 2)).toString("base64");

    // 3️⃣ Commit unique
    await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "NetlifyFunction",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Update visits for ${site}`,
        content: newContent,
        sha,
        branch: "main",
      }),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ site, visits: count }),
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
