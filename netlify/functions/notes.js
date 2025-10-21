export default async function handler(event) {
  const request = event.request;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const csvName = body.csvName || "SA_inconnu.json";
    const note = body.note || {};

    const token = JSON.parse(process.env.GDRIVE_TOKEN);
    const ACCESS_TOKEN = token.access_token;

    const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

    const boundary = "foo_bar_baz";
    const metadata = {
      name: csvName.replace(/\.csv$/i, ".json"),
      mimeType: "application/json",
      parents: ["1k_rLI_bt5YibXv7n2Q2xLZ3sOAnRk0Am"], // dossier cible
    };

    const bodyContent =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) + "\r\n" +
      `--${boundary}\r\n` +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(note, null, 2) + "\r\n" +
      `--${boundary}--`;

    const gRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: bodyContent,
    });

const gData = await gRes.text();

if (gRes.ok) {
  return new Response(
    JSON.stringify({
      status: "ok",
      message: "Note sauvegardée sur Drive",
      details: gData,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

return new Response(
  JSON.stringify({
    error: "Erreur Google Drive",
    details: gData,
  }),
  {
    status: gRes.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  }
);


  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
