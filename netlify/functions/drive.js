export async function handler(event, context) {
  const id = event.queryStringParameters.id;
  const name = event.queryStringParameters.name || "";
  const list = event.queryStringParameters.list === "true";

  if (!id) {
    return {
      statusCode: 400,
      body: "Missing id parameter"
    };
  }

  // 🔐 Clé API stockée sur Netlify
  const key = process.env.API_KEY;

  try {
    // 🗂️ Si ?list=true → renvoie la liste des fichiers du dossier
    if (list) {
      const url = `https://www.googleapis.com/drive/v3/files?q='${id}'+in+parents+and+trashed=false&key=${key}&fields=files(id,name,mimeType,size,createdTime,modifiedTime)`;
      const response = await fetch(url);
      const data = await response.json();

      return {
        statusCode: response.ok ? 200 : response.status,
        headers: {
          "Access-Control-Allow-Origin": "https://smes21540.github.io",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Cache-Control": "public, max-age=30, must-revalidate",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      };
    }

    // 🧾 Sinon → télécharge le fichier (CSV, JPG, etc.)
    const url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${key}`;
    const response = await fetch(url);

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: "Erreur Google Drive"
      };
    }

    const data = await response.arrayBuffer();

    // 📅 Détection du fichier du jour pour cache intelligent
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const isTodayFile = name.includes(today);
    const cacheSeconds = isTodayFile ? 60 : 3600; // 1 min si fichier du jour, sinon 1h

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://smes21540.github.io",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": `public, max-age=${cacheSeconds}, must-revalidate`,
        "Content-Type": response.headers.get("content-type") || "application/octet-stream"
      },
      body: Buffer.from(data).toString("base64"),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error("Erreur proxy Drive:", err);
    return {
      statusCode: 500,
      body: "Erreur interne proxy Drive"
    };
  }
}
