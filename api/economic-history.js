export default async function handler(req, res) {
  try {
    const apiKey = process.env.BUSINESSQUANT_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "BUSINESSQUANT_API_KEY is not configured"
      });
    }

    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Economic indicator code is required"
      });
    }

    // Security: maximum 5 codes per request
    const codes = String(code)
      .split(",")
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 5);

    if (codes.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid economic indicator code"
      });
    }

    const params = new URLSearchParams();

    params.set("code", codes.join(","));
    params.set("period", "3mo");
    params.set("api_key", apiKey);

    const url =
      `https://data.businessquant.com/economic?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: "BusinessQuant historical data request failed",
        details: result
      });
    }

    return res.status(200).json({
      success: true,
      source: "BusinessQuant",
      period: "3mo",
      requestedCodes: codes,
      metadata: result.metadata || [],
      data: result.data || []
    });

  } catch (error) {
    console.error("Economic history error:", error);

    return res.status(500).json({
      success: false,
      error: "Server error",
      message: error.message
    });
  }
}
