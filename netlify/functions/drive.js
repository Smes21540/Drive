export async function handler(event, context) {
  const id = event.queryStringParameters.id;
  const key = process.env.API_KEY; // Clé stockée sur Netlify

  const url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${key}`;
  const response = await fetch(url);

  if (!response.ok) {
    return { statusCode: response.status, body: "Erreur Google Drive" };
  }

  const data = await response.arrayBuffer();

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": response.headers.get("content-type") || "application/octet-stream",
    },
    body: Buffer.from(data).toString("base64"),
    isBase64Encoded: true,
  };
}
