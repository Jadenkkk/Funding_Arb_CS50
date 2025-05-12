import React, { useEffect, useState } from "react";
import './App.css';
import { useNavigate } from "react-router-dom";
import { Tabs, Tab, Box, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, LabelList } from 'recharts';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Create a dark theme for the application
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

// TabPanel component for handling tab content visibility
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

// Main TrackerPage component for displaying funding rates and arbitrage opportunities
function TrackerPage() {
  // State management for various features
  const [value, setValue] = useState(0);                    // Current active tab
  const [fundingData, setFundingData] = useState([]);       // Funding rate data
  const [arbitrageData, setArbitrageData] = useState([]);   // Arbitrage opportunities
  const [lastUpdated, setLastUpdated] = useState(null);     // Last data update timestamp
  const [isLoading, setIsLoading] = useState(true);         // Loading state
  const [error, setError] = useState(null);                 // Error state
  const [historyData, setHistoryData] = useState([]);       // Historical data
  const [historyLoading, setHistoryLoading] = useState(true); // History loading state
  const [hourlyData, setHourlyData] = useState([]);         // Hourly data
  const [hourlyLoading, setHourlyLoading] = useState(true); // Hourly data loading state
  const navigate = useNavigate();

  // Handle tab change event
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  // Fetch all required data from the backend API endpoints
  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch funding rates, arbitrage opportunities, and history data concurrently
      const [fundingResponse, arbitrageResponse, historyResponse] = await Promise.all([
        fetch('http://localhost:8080/api/common-funding-table'),
        fetch('http://localhost:8080/api/top-arbitrage'),
        fetch('http://localhost:8080/api/history/arbitrage')
      ]);

      if (!fundingResponse.ok || !arbitrageResponse.ok || !historyResponse.ok) {
        throw new Error('Network response was not ok');
      }

      // Parse JSON responses
      const [funding, arbitrage, history] = await Promise.all([
        fundingResponse.json(),
        arbitrageResponse.json(),
        historyResponse.json()
      ]);

      // Update state with fetched data
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

  // Fetch historical arbitrage data with a limit of 50 entries
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

  // Fetch hourly arbitrage data for the bar chart
  const fetchHourlyHistory = async () => {
    setHourlyLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/history/arbitrage/hourly');
      const json = await res.json();
      setHourlyData(json);
    } catch (e) {
      setHourlyData([]);
    }
    setHourlyLoading(false);
  };

  // Initial data fetch on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Set up periodic data refresh every 5 minutes
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchData();
    }, 5 * 60 * 1000); // 5 minutes in milliseconds
    return () => clearInterval(intervalId);
  }, []);

  // Fetch history data when history tab is selected
  useEffect(() => {
    if (value === 2) {
      fetchHistory();
      fetchHourlyHistory();
    }
  }, [value]);

  // Format date to local string
  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString();
  };

  // Safely format numbers with fixed decimal places
  const safeToFixed = (value, digits) => {
    return (typeof value === 'number' && !isNaN(value)) ? value.toFixed(digits) : '-';
  };

  // Safely format numbers with locale string
  const safeToLocaleString = (value) => {
    return (typeof value === 'number' && !isNaN(value)) ? value.toLocaleString() : '-';
  };

  // Get top 5 coins by APR from the most recent snapshot
  const allSymbols = historyData.length
    ? [...historyData[0].data]
        .sort((a, b) => b.apr - a.apr)
        .slice(0, 5)
        .map(x => x.symbol)
    : [];

  // Process historical data for chart display
  const chartData = historyData
    .slice()
    .reverse()
    .map(item => {
      const row = { timestamp: new Date(item.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) };
      allSymbols.forEach(symbol => {
        const found = item.data.find(x => x.symbol === symbol);
        row[symbol] = found ? found.apr : 0;
      });
      return row;
    });

  // Get UTC date of the latest snapshot
  const latestUTCDate = historyData.length > 0 ? new Date(historyData[0].created_at).toISOString().slice(0, 10) : '';

  // Get top 5 coins by APR from the latest snapshot
  const latestTop5 = React.useMemo(() => {
    if (!historyData.length) return [];
    const latest = historyData[0].data;
    return [...latest].sort((a, b) => b.apr - a.apr).slice(0, 5).map(x => x.symbol);
  }, [historyData]);

  // Extract base symbol from trading pair (e.g., "BTC/USDT" -> "BTC")
  const getBaseSymbol = (symbol) => {
    if (!symbol) return '';
    return symbol.split('/')[0];
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="App">
        {/* Header section with title and last updated timestamp */}
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

        {/* Main content container */}
        <Box sx={{ width: '100%' }}>
          {/* Tab navigation */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={value}
              onChange={handleChange}
              aria-label="basic tabs example"
              textColor="inherit"
              indicatorColor="primary"
              sx={{
                '& .MuiTab-root': { color: '#b0c4d4' }, // Inactive tab text color
                '& .Mui-selected': { color: '#00bfff' }, // Active tab text color
                background: 'transparent'
              }}
            >
              <Tab label="Funding Rates" />
              <Tab label="Top Arbitrage" />
              <Tab label="History Chart" />
            </Tabs>
          </Box>

          {/* Error message display */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Loading state display */}
          {isLoading ? (
            <div className="loading">Loading...</div>
          ) : (
            <TabPanel value={value} index={0}>
              {/* Funding Rates Table Section */}
              <div className="table-section">
                <h2>Funding Rate Comparison</h2>
                <table className="funding-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Binance</th>
                      <th>Bybit</th>
                      <th>OKX</th>
                      <th>Binance Futures Volume (24h)</th>
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

          {value === 2 && (
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
                      <Tooltip formatter={value => value ? value.toFixed(2) + '%' : '-'} />
                      <Legend />
                      {allSymbols.map((symbol, index) => (
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

          {hourlyLoading ? (
            <div className="loading">Loading chart...</div>
          ) : (
            <TabPanel value={value} index={2}>
              <div className="table-section">
                <h2>Hourly Top Arbitrage APR (Bar Chart)</h2>
                <Box sx={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <BarChart data={hourlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid stroke="#444" strokeDasharray="3 3" />
                      <XAxis dataKey="hour" tickFormatter={h => h.slice(11, 16)} />
                      <YAxis label={{ value: 'APR (%)', angle: -90, position: 'insideLeft', fill: '#b0c4d4' }} />
                      <Tooltip
                        formatter={(value, name, props) => [`${value}%`, 'APR']}
                        labelFormatter={l => `Hour: ${l.slice(11, 16)}`}
                      />
                      <Bar dataKey="apr" fill="#8884d8">
                        <LabelList
                          dataKey="symbol"
                          position="top"
                          content={({ x, y, width, value }) => (
                            <text
                              x={x + width / 2}
                              y={y - 8}
                              fill="#fff"
                              textAnchor="middle"
                              fontSize={13}
                              fontWeight={700}
                            >
                              {getBaseSymbol(value)}
                            </text>
                          )}
                        />
                      </Bar>
                    </BarChart>
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