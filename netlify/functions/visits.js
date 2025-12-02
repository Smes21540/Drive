import fetch from "node-fetch";

export async function handler(event) {
  const repo = "TonNomUtilisateur/TonDepot";   // <-- ex: smes21540/Oxyane_Drive
  const path = "visits.json";
  const token = process.env.GITHUB_TOKEN;
  const site = event.queryStringParameters.site || "default";

  try {
    // Lecture du fichier JSON sur GitHub
    const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const getData = await getRes.json();
    const sha = getData.sha;
    const content = Buffer.from(getData.content, "base64").toString("utf8");
    const data = JSON.parse(content);

    // Incrément
    if (!data[site]) data[site] = { visits: 0 };
    data[site].visits++;

    // Mise à jour sur GitHub
    const updatedContent = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");
    const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Update visits for ${site}`,
        content: updatedContent,
        sha,
      }),
    });

    if (!putRes.ok) throw new Error(`Erreur écriture GitHub: ${putRes.status}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ site, visits: data[site].visits }),
    };
  } catch (err) {
    console.error("Erreur visits:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur compteur" }),
    };
  }
}
