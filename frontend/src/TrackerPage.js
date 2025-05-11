import React, { useEffect, useState } from "react";
import './App.css';
import { useNavigate } from "react-router-dom";
import { Tabs, Tab, Box, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function TrackerPage() {
  const [value, setValue] = useState(0);
  const [fundingData, setFundingData] = useState([]);
  const [arbitrageData, setArbitrageData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const navigate = useNavigate();

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [fundingResponse, arbitrageResponse, historyResponse] = await Promise.all([
        fetch('http://localhost:8080/api/common-funding-table'),
        fetch('http://localhost:8080/api/top-arbitrage'),
        fetch('http://localhost:8080/api/history/arbitrage')
      ]);

      if (!fundingResponse.ok || !arbitrageResponse.ok || !historyResponse.ok) {
        throw new Error('Network response was not ok');
      }

      const [funding, arbitrage, history] = await Promise.all([
        fundingResponse.json(),
        arbitrageResponse.json(),
        historyResponse.json()
      ]);

      setFundingData(funding);
      setArbitrageData(arbitrage);
      setHistoryData(history);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch data. Please try again later.');
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/history/arbitrage?limit=50');
      const json = await res.json();
      setHistoryData(json);
    } catch (e) {
      setHistoryData([]);
    }
    setHistoryLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchData();
    }, 5 * 60 * 1000); // 5 minutes in milliseconds
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (value === 2) {
      fetchHistory();
    }
  }, [value]);

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString();
  };

  const safeToFixed = (value, digits) => {
    return (typeof value === 'number' && !isNaN(value)) ? value.toFixed(digits) : '-';
  };
  const safeToLocaleString = (value) => {
    return (typeof value === 'number' && !isNaN(value)) ? value.toLocaleString() : '-';
  };

  // 차트 데이터 변환 (UTC 시:분, 최신이 오른쪽)
  const chartData = historyData
    .slice()
    .reverse()
    .map(item => ({
      timestamp: new Date(item.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }),
      ...item.data.reduce((acc, curr) => ({
        ...acc,
        [curr.symbol]: curr.apr
      }), {})
    }));

  // 최신 스냅샷의 UTC 날짜 (YYYY-MM-DD)
  const latestUTCDate = historyData.length > 0 ? new Date(historyData[0].created_at).toISOString().slice(0, 10) : '';

  // 최신 스냅샷의 top 5 코인 기준 (APR 내림차순)
  const latestTop5 = React.useMemo(() => {
    if (!historyData.length) return [];
    const latest = historyData[0].data;
    return [...latest].sort((a, b) => b.apr - a.apr).slice(0, 5).map(x => x.symbol);
  }, [historyData]);

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="App">
        <header className="App-header">
          <h1>Funding Rate Arbitrage Tracker</h1>
          {lastUpdated && (
            <p className="last-updated">
              Last Updated (every 5 mins): {formatDate(lastUpdated)}
            </p>
          )}
          <button className="go-home-btn" onClick={() => navigate("/")}>
            Home
          </button>
        </header>

        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={value}
              onChange={handleChange}
              aria-label="basic tabs example"
              textColor="inherit"
              indicatorColor="primary"
              sx={{
                '& .MuiTab-root': { color: '#b0c4d4' }, // 비활성 탭 글씨색
                '& .Mui-selected': { color: '#00bfff' }, // 활성 탭 글씨색
                background: 'transparent'
              }}
            >
              <Tab label="Funding Rates" />
              <Tab label="Top Arbitrage" />
              <Tab label="History Chart" />
            </Tabs>
          </Box>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="loading">Loading...</div>
          ) : (
            <TabPanel value={value} index={0}>
              <div className="table-section">
                <h2>Funding Rate Comparison</h2>
                <table className="funding-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Binance</th>
                      <th>Bybit</th>
                      <th>OKX</th>
                      <th>Volume (24h)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundingData.map((item, index) => (
                      <tr key={index}>
                        <td>{item.symbol}</td>
                        <td className={item.binance > 0 ? 'positive' : 'negative'}>
                          {safeToFixed(item.binance, 4)}%
                        </td>
                        <td className={item.bybit > 0 ? 'positive' : 'negative'}>
                          {safeToFixed(item.bybit, 4)}%
                        </td>
                        <td className={item.okx > 0 ? 'positive' : 'negative'}>
                          {safeToFixed(item.okx, 4)}%
                        </td>
                        <td>${safeToLocaleString(item["Volume (Binance)"])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabPanel>
          )}

          {isLoading ? (
            <div className="loading">Loading...</div>
          ) : (
            <TabPanel value={value} index={1}>
              <div className="table-section">
                <h2>Top Arbitrage Opportunities</h2>
                <table className="arbitrage-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Long Exchange</th>
                      <th>Short Exchange</th>
                      <th>APR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arbitrageData.map((item, index) => (
                      <tr key={index}>
                        <td>{item.symbol}</td>
                        <td>{item.long_exchange}</td>
                        <td>{item.short_exchange}</td>
                        <td className="positive">{safeToFixed(item.apr, 2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabPanel>
          )}

          {historyLoading ? (
            <div className="loading">Loading chart...</div>
          ) : (
            <TabPanel value={value} index={2}>
              <div className="table-section">
                <h2>Top Arbitrage APR History</h2>
                {latestUTCDate && (
                  <div style={{ color: '#b0c4d4', marginBottom: 8, fontSize: 15 }}>
                    Date (UTC): {latestUTCDate}
                  </div>
                )}
                <Box sx={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="#444" strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis label={{ value: 'APR (%)', angle: -90, position: 'insideLeft', fill: '#b0c4d4' }} tickFormatter={v => v.toFixed(0)} />
                      <Tooltip formatter={(value) => value ? value.toFixed(2) + '%' : '-'} />
                      <Legend />
                      {latestTop5.map((symbol, index) => (
                        <Line
                          key={symbol}
                          type="monotone"
                          dataKey={symbol}
                          stroke={`hsl(${index * 72}, 70%, 50%)`}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </div>
            </TabPanel>
          )}
        </Box>
      </div>
    </ThemeProvider>
  );
}

export default TrackerPage; 