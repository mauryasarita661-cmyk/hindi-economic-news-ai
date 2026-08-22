export default async function handler(req, res) {
  try {
    const apiKey = process.env.BUSINESSQUANT_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "BUSINESSQUANT_API_KEY missing"
      });
    }

    const rawCode = req.query?.code;

    if (!rawCode) {
      return res.status(400).json({
        success: false,
        error: "Indicator code missing"
      });
    }

    // Calendar se aane wale code ko safely normalize karo
    const code = String(rawCode)
      .trim()
      .split(",")[0]
      .trim();

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Invalid indicator code"
      });
    }

    const params = new URLSearchParams({
      code: code,
      period: "3mo",
      mode: "original",
      api_key: apiKey
    });

    const url =
      `https://data.businessquant.com/economic?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    const text = await response.text();

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      result = {
        raw: text
      };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: "BusinessQuant historical data request failed",
        httpStatus: response.status,
        code: code,
        details: result
      });
    }

    return res.status(200).json({
      success: true,
      source: "BusinessQuant",
      code: code,
      period: "3mo",
      metadata: result.metadata || [],
      data: Array.isArray(result.data)
        ? result.data
        : []
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Server error",
      message: error.message
    });
  }
}
