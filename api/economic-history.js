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

    const requestedCode = String(rawCode)
      .trim()
      .split(",")[0]
      .trim();

    // ---------------------------------------
    // STEP 1: BusinessQuant catalog se code verify
    // ---------------------------------------

    const listParams = new URLSearchParams({
      code: requestedCode,
      api_key: apiKey
    });

    const listUrl =
      `https://data.businessquant.com/economic/list?${listParams}`;

    const listResponse = await fetch(listUrl, {
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    const listText = await listResponse.text();

    let listResult;

    try {
      listResult = JSON.parse(listText);
    } catch {
      listResult = {
        raw: listText
      };
    }

    if (!listResponse.ok) {
      return res.status(listResponse.status).json({
        success: false,
        error: "Indicator code BusinessQuant catalog mein nahi mila",
        requestedCode,
        upstreamStatus: listResponse.status,
        details: listResult
      });
    }

    const indicators =
      Array.isArray(listResult.data)
        ? listResult.data
        : [];

    if (indicators.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Is indicator ka historical series available nahi hai",
        requestedCode
      });
    }

    // BusinessQuant ka canonical code
    const canonicalCode =
      indicators[0].code || requestedCode;


    // ---------------------------------------
    // STEP 2: Historical data
    // ---------------------------------------

    const historyParams = new URLSearchParams({
      code: canonicalCode,
      period: "3mo",
      api_key: apiKey
    });

    const historyUrl =
      `https://data.businessquant.com/economic?${historyParams}`;

    const historyResponse = await fetch(historyUrl, {
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    const historyText = await historyResponse.text();

    let historyResult;

    try {
      historyResult = JSON.parse(historyText);
    } catch {
      historyResult = {
        raw: historyText
      };
    }


    if (!historyResponse.ok) {
      return res.status(historyResponse.status).json({
        success: false,
        error: "BusinessQuant historical data request failed",
        requestedCode,
        canonicalCode,
        upstreamStatus: historyResponse.status,
        details: historyResult
      });
    }


    // ---------------------------------------
    // STEP 3: Clean response
    // ---------------------------------------

    const data =
      Array.isArray(historyResult.data)
        ? historyResult.data
        : [];

    const metadata =
      Array.isArray(historyResult.metadata)
        ? historyResult.metadata
        : [];

    return res.status(200).json({
      success: true,
      source: "BusinessQuant",

      requestedCode,

      canonicalCode,

      period: "3mo",

      indicator:
        indicators[0] || null,

      metadata,

      total: data.length,

      data
    });


  } catch (error) {

    console.error(
      "Economic history error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Server error",
      message: error.message
    });
  }
}
