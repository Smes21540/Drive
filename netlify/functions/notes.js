export default async function handler(req, res) {
  const googleScriptUrl = "https://script.google.com/macros/s/AKfycbxcCMBlv-jKanUSjJ1LG10Ceo_8t9tLsNbNiT35N60oROBVBNS8-1e9znmObCQ6Uqc99w/exec";

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  try {
    const r = await fetch(googleScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });
    const text = await r.text();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(r.status).send(text);
  } catch (err) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ error: err.message });
  }
}

