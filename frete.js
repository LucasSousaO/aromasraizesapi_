export default async function handler(req, res) {
  // CORS básico (pra sua página no GitHub Pages conseguir chamar)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { toPostalCode, products } = req.body || {};
    const cep = String(toPostalCode || "").replace(/\D/g, "");

    if (cep.length !== 8) {
      return res.status(400).json({ error: "CEP inválido" });
    }
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "products vazio" });
    }

    const payload = {
      from: { postal_code: "32404806" }, // seu CEP de origem
      to: { postal_code: cep },
      products,
      services: "1,2" // normalmente PAC + SEDEX (depende do retorno da conta)
    };

    const baseUrl =
      process.env.ME_ENV === "sandbox"
        ? "https://sandbox.melhorenvio.com.br"
        : "https://www.melhorenvio.com.br";

    const r = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ME_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);

    // Normaliza o retorno (pode vir como array)
    const list = Array.isArray(data) ? data : (data?.data || []);
    const options = list.map((s) => ({
      id: s.id,
      name: s.name,
      company: s.company?.name,
      price: s.custom_price ?? s.price,
      delivery_time: s.custom_delivery_time ?? s.delivery_time
    }));

    return res.status(200).json({ options });
  } catch (e) {
    return res.status(500).json({ error: "Unexpected error", details: String(e) });
  }
}
