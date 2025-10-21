export default async (event) => {
  const { request } = event;

  // 🪣 Entêtes CORS universels
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // 🔍 Logge tout ce qu'on reçoit
  console.log("📨 Nouvelle requête notes :", request.method, request.url);

  // Si pré-requête CORS
  if (request.method === "OPTIONS") {
    console.log("⚙️ Pré-requête OPTIONS reçue");
    return new Response("", { status: 200, headers: corsHeaders });
  }

  // URL de ton script Google Apps Script
  const googleScriptUrl =
    "https://script.google.com/macros/s/AKfycbxtJvuT2gKRAwEMf6ZQJAffu0vR031u5aEdmEZIJTyf-0098kUSy5VphP6a4zQ1thEu4w/exec";

  try {
    const body = await request.text();
    console.log("🧾 Corps reçu :", body);

    // Envoi à Google
    const gRes = await fetch(googleScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const text = await gRes.text();
    console.log("📤 Réponse Google :", gRes.status, text.slice(0, 120));

    // Retour au navigateur
    return new Response(text, {
      status: gRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("💥 Erreur proxy :", err);
    const error = JSON.stringify({ error: err.message });
    return new Response(error, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};
