export default async function handler(req, res) {
  try {
    const apiKey = process.env.BUSINESSQUANT_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "BUSINESSQUANT_API_KEY is not configured"
      });
    }

    // Today se next 90 days tak ka calendar
    const today = new Date();

    const fromDate = today.toISOString().slice(0, 10);

    const future = new Date(today);
    future.setDate(future.getDate() + 90);

    const tillDate = future.toISOString().slice(0, 10);

    const url =
      "https://data.businessquant.com/calendar/economic" +
      `?from_date=${fromDate}` +
      `&till_date=${tillDate}` +
      `&api_key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const text = await response.text();

      return res.status(response.status).json({
        success: false,
        error: "BusinessQuant API request failed",
        details: text
      });
    }

    const result = await response.json();

    const rows = Array.isArray(result.data)
      ? result.data
      : [];

    // Important USD economic events
    const importantPatterns = [
      /cpi/i,
      /consumer price/i,
      /inflation/i,
      /core inflation/i,
      /ppi/i,
      /producer price/i,
      /nonfarm/i,
      /non-farm/i,
      /payroll/i,
      /employment/i,
      /unemployment/i,
      /jobless/i,
      /job openings/i,
      /wage/i,
      /fomc/i,
      /federal funds/i,
      /interest rate/i,
      /retail sales/i,
      /gdp/i,
      /gross domestic/i,
      /ism/i,
      /manufacturing/i,
      /consumer confidence/i,
      /durable goods/i
    ];

    const events = rows
      .filter(item => {
        if (!item.next_release) return false;

        const name = String(item.name || "");

        return importantPatterns.some(pattern =>
          pattern.test(name)
        );
      })
      .map(item => {

        const name = String(item.name || "");

        let impact = "Medium";

        // High impact events
        if (
          /cpi|consumer price|inflation|nonfarm|non-farm|payroll|fomc|federal funds|interest rate|gdp|unemployment/i.test(name)
        ) {
          impact = "High";
        }

        // Low impact events
        if (
          /housing|home price|business inventories/i.test(name)
        ) {
          impact = "Low";
        }

        return {
          name: item.name || "Economic Event",

          country: "United States",

          release_date: item.next_release || null,

          next_release: item.next_release || null,

          days_until: item.days_until_next ?? null,

          impact: impact,

          actual: null,

          latest: item.latest_value ?? null,

          previous: item.prior_value ?? null,

          change: item.change_abs ?? null,

          change_percent: item.change_pct ?? null,

          category: item.category || "Economic",

          code: item.code || null,

          latest_date: item.latest_date || null,

          release_state: item.release_state || null
        };
      })
      .sort((a, b) => {
        return new Date(a.release_date) - new Date(b.release_date);
      });

    return res.status(200).json({
      success: true,

      source: "BusinessQuant",

      updatedAt: new Date().toISOString(),

      total: events.length,

      data: events
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
