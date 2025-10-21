export default async function handler(req, res) {
  // Toujours envoyer les en-têtes CORS dès le départ
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 1️⃣ Cas préflight OPTIONS — Netlify doit répondre immédiatement
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // 2️⃣ URL de ton script Google
  const googleScriptUrl = "https://script.google.com/macros/s/AKfycbxtJvuT2gKRAwEMf6ZQJAffu0vR031u5aEdmEZIJTyf-0098kUSy5VphP6a4zQ1thEu4w/exec";

  try {
    // 3️⃣ Récupère le corps JSON envoyé depuis viewer02
    let body = "";
    try {
      body = req.body ? JSON.stringify(req.body) : "{}";
    } catch {
      body = "{}";
    }

    // 4️⃣ Transmet la requête à ton Apps Script
    const response = await fetch(googleScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const text = await response.text();

    // 5️⃣ Renvoie la réponse à ton viewer avec CORS ouvert
    res.status(response.status);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(text);
  } catch (err) {
    console.error("Erreur proxy vers Google Apps Script :", err);
    res.status(500);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json({ error: err.message });
  }
}

