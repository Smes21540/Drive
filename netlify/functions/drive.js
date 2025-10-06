import fetch from "node-fetch";

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "Missing id parameter" });
  }

  const API_KEY = process.env.GOOGLE_API_KEY || "AIzaSyCbEV3CS9bOcxq5eK-QXbjczGHjvzyXS6M";

  try {
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${API_KEY}`;
    const response = await fetch(driveUrl);

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send(text);
    }

    // ✅ Détermination du cache intelligent
    // Si le nom du fichier contient la date du jour → cache très court
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const isTodayFile = req.query.name?.includes(today);
    const cacheSeconds = isTodayFile ? 60 : 3600; // 1 min pour le jour, 1 h sinon

    res.setHeader("Cache-Control", `public, max-age=${cacheSeconds}, must-revalidate`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Erreur proxy Drive:", err);
    res.status(500).json({ error: "Erreur lors de la récupération du fichier Drive" });
  }
}
