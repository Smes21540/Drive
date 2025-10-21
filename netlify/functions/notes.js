export default async function handler(req, res) {
  // Autorise toutes les origines et méthodes
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Si c'est une pré-requête CORS, on répond tout de suite
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // URL de ton script Google Apps Script
  const googleScriptUrl =
    "https://script.google.com/macros/s/AKfycbxtJvuT2gKRAwEMf6ZQJAffu0vR031u5aEdmEZIJTyf-0098kUSy5VphP6a4zQ1thEu4w/exec";

  try {
    // Relais de la requête vers ton script Google
    const gResponse = await fetch(googleScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
    });

    const text = await gResponse.text();

    // Re-envoi de la réponse au navigateur avec CORS ouvert
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(gResponse.status).send(text);
  } catch (err) {
    console.error("Erreur proxy:", err);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ error: err.message });
  }
}
