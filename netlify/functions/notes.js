export default async function handler(event) {
  const request = event.request;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  console.log("📨 Requête entrante :", request.method, request.url);

  if (request.method === "OPTIONS") {
    console.log("⚙️ Pré-requête OPTIONS traitée");
    return new Response("", { status: 200, headers: corsHeaders });
  }

  const googleScriptUrl =
    "https://script.google.com/macros/s/AKfycbxtJvuT2gKRAwEMf6ZQJAffu0vR031u5aEdmEZIJTyf-0098kUSy5VphP6a4zQ1thEu4w/exec";

  try {
    const body = await request.text();
    console.log("🧾 Corps reçu :", body);

    const gRes = await fetch(googleScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const text = await gRes.text();
    console.log("📤 Réponse Google :", gRes.status, text.slice(0, 120));

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
}
