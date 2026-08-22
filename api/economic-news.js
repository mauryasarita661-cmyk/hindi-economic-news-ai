export default async function handler(req, res) {
  try {
    const apiKey = process.env.BUSINESSQUANT_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "BUSINESSQUANT_API_KEY is not configured"
      });
    }

    const url =
      `https://data.businessquant.com/calendar/economic` +
      `?release_state=upcoming&api_key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();

      return res.status(response.status).json({
        success: false,
        error: "BusinessQuant API request failed",
        details: text
      });
    }

    const result = await response.json();

    const data = Array.isArray(result.data) ? result.data : [];

    // Important USD-related economic indicators
    const importantKeywords = [
      "CPI",
      "Inflation",
      "Nonfarm",
      "Non-Farm",
      "Payroll",
      "Unemployment",
      "Interest Rate",
      "Federal Funds",
      "FOMC",
      "GDP",
      "Retail Sales",
      "PPI",
      "Producer Price",
      "ISM",
      "Consumer Confidence",
      "Durable Goods",
      "Jobless Claims",
      "Initial Claims",
      "Employment"
    ];

    const filtered = data.filter((item) => {
      const name = String(item.name || "").toLowerCase();

      return importantKeywords.some((keyword) =>
        name.includes(keyword.toLowerCase())
      );
    });

    return res.status(200).json({
      success: true,
      source: "BusinessQuant",
      updatedAt: new Date().toISOString(),
      total: filtered.length,
      data: filtered
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server error",
      message: error.message
    });
  }
}
