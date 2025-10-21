export default async (event) => {
  const { request } = event;

  // CORS: toujours envoyer ces headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // OPTIONS → simple 200 immédiat
  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: corsHeaders });
  }

  const googleScriptUrl =
    "https://script.google.com/macros/s/AKfycbxtJvuT2gKRAwEMf6ZQJAffu0vR031u5aEdmEZIJTyf-0098kUSy5VphP6a4zQ1thEu4w/exec";

  try {
    const body = await request.text(); // récupère la chaîne brute
    const gRes = await fetch(googleScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const text = await gRes.text();
    return new Response(text, {
      status: gRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = JSON.stringify({ error: err.message });
    return new Response(error, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};
