import fetch from "node-fetch";

export async function handler(event) {
  const token = process.env.GITHUB_TOKEN;
  const path = "visits.json";
  const repo = "smes21540/Drive"; // ⚠️ Mets ton vrai dépôt central (celui où sera stocké visits.json)

  // site = nom passé dans l’URL ?site=Drive
  const site = event.queryStringParameters.site || "Default";

  // --- CORS : autoriser GitHub Pages + Netlify ---
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

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  // 🔹 IP pour exclure l’admin
  const ip = event.headers["x-nf-client-connection-ip"] || "inconnue";
  const isAdmin = ip === "88.164.133.142";

  try {
    // 1️⃣ Lire le fichier visits.json depuis GitHub
    const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!getRes.ok) throw new Error(`Erreur lecture GitHub (${getRes.status})`);

    const getData = await getRes.json();
    const sha = getData.sha;
    const content = Buffer.from(getData.content, "base64").toString("utf8");
    const data = JSON.parse(content || "{}");

    // 2️⃣ Semaine courante
    const now = new Date();
    const year = now.getFullYear();
    const week = Math.ceil((((now - new Date(year, 0, 1)) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);
    const weekKey = `${year}-W${String(week).padStart(2, "0")}`;

    // 3️⃣ Initialiser le site si absent
    if (!data[site]) data[site] = {};
    if (!data[site][weekKey]) data[site][weekKey] = 0;

    // 4️⃣ Incrémenter uniquement si ce n’est pas l’admin
    if (!isAdmin) data[site][weekKey]++;

    // 5️⃣ Sauvegarde sur GitHub
    const updatedContent = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");
    const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Update visits for ${site} (${weekKey})`,
        content: updatedContent,
        sha,
      }),
    });
    if (!putRes.ok) throw new Error(`Erreur écriture GitHub (${putRes.status})`);

    const visits = data[site][weekKey];
    const info = isAdmin ? "(admin non compté)" : "";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ site, week: weekKey, visits, info })
    };
  } catch (err) {
    console.error("❌ Erreur visits.js:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Erreur compteur" })
    };
  }
}
