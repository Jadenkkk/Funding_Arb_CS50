import React, { useEffect, useState } from "react";

function formatRate(rate) {
  if (rate === null || rate === undefined) return "-";
  // 소수점 4자리, 퍼센트 변환
  const percent = (parseFloat(rate) * 100).toFixed(4) + "%";
  return percent;
}

function formatRateShort(rate) {
  if (rate === null || rate === undefined) return "-";
  // 이미 퍼센트 단위로 들어온다면 100을 곱하지 않고, 소수점 2자리로 반올림
  const num = parseFloat(rate);
  return num.toFixed(2) + "%";
}

function rateColor(rate) {
  if (rate === null || rate === undefined) return "#aaa";
  if (parseFloat(rate) > 0) return "#16c784"; // 초록
  if (parseFloat(rate) < 0) return "#ea3943"; // 빨강
  return "#aaa"; // 0 또는 기타
}

function formatVolumeMillion(volume) {
  if (!volume || isNaN(volume)) return "-";
  const million = Number(volume) / 1_000_000;
  // 소수점 없이 반올림, 천 단위 콤마, 앞에 $ 추가
  return "$ " + Math.round(million).toLocaleString();
}

function formatApr(apr) {
  if (apr === null || apr === undefined) return "-";
  return apr.toLocaleString(undefined, { maximumFractionDigits: 0 }) + "%";
}

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [arbData, setArbData] = useState([]);
  const [arbLoading, setArbLoading] = useState(true);

  useEffect(() => {
    fetch("/api/common-funding-table")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      });
    fetch("/api/top-arbitrage")
      .then((res) => res.json())
      .then((json) => {
        setArbData(json);
        setArbLoading(false);
      });
  }, []);

  return (
    <div
      style={{
        padding: 40,
        background: "#0d2321",
        minHeight: "100vh",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 32 }}>
        Funding Rate Comparison
      </h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            background: "#162624",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 2px 16px #0002",
          }}
        >
          <thead>
            <tr style={{ background: "#1e3932" }}>
              <th style={{ padding: 12, textAlign: "left" }}>Symbol</th>
              <th style={{ padding: 12 }}>Perp Volume (Binance, $mm)</th>
              <th style={{ padding: 12 }}>Binance</th>
              <th style={{ padding: 12 }}>Bybit</th>
              <th style={{ padding: 12 }}>OKX</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.symbol}
                style={{
                  borderBottom: "1px solid #233c36",
                  transition: "background 0.2s",
                }}
                onMouseOver={e => (e.currentTarget.style.background = "#233c36")}
                onMouseOut={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: 12, fontWeight: 500 }}>{row.symbol}</td>
                <td style={{ padding: 12, color: "#fff" }}>
                  {row["Volume (Binance)"] ? formatVolumeMillion(row["Volume (Binance)"]) : "-"}
                </td>
                <td style={{ padding: 12, color: rateColor(row.binance) }}>
                  {formatRate(row.binance)}
                </td>
                <td style={{ padding: 12, color: rateColor(row.bybit) }}>
                  {formatRate(row.bybit)}
                </td>
                <td style={{ padding: 12, color: rateColor(row.okx) }}>
                  {formatRate(row.okx)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ fontSize: 28, fontWeight: 700, margin: "48px 0 24px 0" }}>
        Top 10 Funding Rate Arbitrage
      </h2>
      {arbLoading ? (
        <p>Loading...</p>
      ) : (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            background: "#162624",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 2px 16px #0002",
          }}
        >
          <thead>
            <tr style={{ background: "#1e3932" }}>
              <th style={{ padding: 12, textAlign: "left" }}>Symbol</th>
              <th style={{ padding: 12 }}>Long Exchange</th>
              <th style={{ padding: 12 }}>Short Exchange</th>
              <th style={{ padding: 12 }}>APR</th>
            </tr>
          </thead>
          <tbody>
            {arbData.map((row) => (
              <tr
                key={row.symbol}
                style={{
                  borderBottom: "1px solid #233c36",
                  transition: "background 0.2s",
                }}
                onMouseOver={e => (e.currentTarget.style.background = "#233c36")}
                onMouseOut={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: 12, fontWeight: 500 }}>{row.symbol}</td>
                <td style={{ padding: 12 }}>{
                  row.long_exchange && row.long_exchange.includes("(")
                    ? row.long_exchange.replace(/\(([^)]+)\)/, (m, rate) => `(${formatRateShort(rate.replace("%", ""))})`)
                    : row.long_exchange
                }</td>
                <td style={{ padding: 12 }}>{
                  row.short_exchange && row.short_exchange.includes("(")
                    ? row.short_exchange.replace(/\(([^)]+)\)/, (m, rate) => `(${formatRateShort(rate.replace("%", ""))})`)
                    : row.short_exchange
                }</td>
                <td style={{ padding: 12, color: row.apr > 0 ? "#16c784" : row.apr < 0 ? "#ea3943" : "#fff" }}>
                  {formatApr(row.apr)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
