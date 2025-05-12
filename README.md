# Funding Rate Arbitrage Tracker

## Vision & Purpose

In the rapidly evolving landscape of cryptocurrency markets, we're witnessing a fundamental shift in how financial markets operate. Unlike traditional finance where assets are typically listed on a single exchange (e.g., Tesla on NASDAQ), cryptocurrencies are simultaneously listed across multiple exchanges. This unique characteristic of crypto markets presents both challenges and opportunities.

### The Problem: Market Inefficiency

The current cryptocurrency market exhibits significant inefficiencies, particularly in perpetual futures markets. These inefficiencies manifest through funding rates - a mechanism that reflects the imbalance between long and short positions. When funding rates are high, it indicates an overabundance of long positions relative to shorts, creating a divergence between spot and futures prices. Conversely, negative funding rates suggest an excess of short positions.

### Our Solution: Democratizing Arbitrage

Historically, arbitrage opportunities in cryptocurrency markets have been primarily accessible to institutional players with sophisticated infrastructure. My project aims to democratize this access by providing retail traders with real-time insights into funding rate disparities across major exchanges.

By tracking funding rates for the top 50 cryptocurrencies by 24-hour trading volume across Binance, Bybit, OKX, and Hyperliquid, we identify and present arbitrage opportunities in an accessible format. This transparency not only benefits individual traders but also contributes to market efficiency by:

1. Making arbitrage opportunities more accessible to retail traders
2. Encouraging market participants to act on price discrepancies
3. Contributing to the overall price efficiency of cryptocurrency markets
4. Supporting the broader mission of financial innovation in the crypto space

### Product Demo: 

## Features

- **Real-time Funding Rate Comparison**
  - Tracks funding rates for USDT-margined perpetual futures
  - Shows rates from Binance, Bybit, OKX (Top 3 Global Exchange)
  - Displays volume and other relevant metrics
  - Color-coded for easy comparison

- **Arbitrage Opportunities**
  - Identifies top 10 arbitrage opportunities
  - Calculates potential APR for each opportunity
  - Shows long/short positions for each trade
  - Updates in real-time

- **Top Arbitrage APR History (Line Chart)**
  - Visualizes the APR history of the top 5 arbitrage coins over time as a line chart
  - Helps users track how arbitrage opportunities evolve

- **Hourly Top Arbitrage APR (Bar Chart)**
  - Shows, for each hour, the coin with the highest arbitrage APR and its value as a bar chart
  - Makes it easy to spot the best hourly arbitrage opportunities

## Tech Stack

- **Frontend**: React.js
  - Material-UI for components
  - Recharts for data visualization
  - Axios for API calls
  - Responsive design
- **Backend**: FastAPI (Python)
  - Async data collection
  - SQLite database
  - Exchange API integration
- **Development Environment**:
  - Local development server
  - SQLite database for historical data
  - Real-time data fetching from exchanges

## Project Structure

```
Funding_Arb_CS50/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── funding_history.db   # SQLite database
└── frontend/
    ├── src/                 # React source code
    │   ├── components/     # React components
    │   ├── services/       # API services
    │   └── App.js          # Main application component
    ├── public/             # Static files
    └── package.json        # Node.js dependencies
```

## Frontend Components

### Main Components
- `App.js`: Main application component
- `LandingPage.js`: Project introduction and navigation
- `TrackerPage.js`: Main tracker interface with tables and charts
  

### Key Features
1. **Funding Rate Table**
   - Real-time data updates
   - Color-coded rates
   - Volume information
   - Exchange comparison

2. **Arbitrage Table**
   - Top opportunities
   - APR calculation
   - Position details
   - Auto-refresh

3. **History Chart**
   - Historical APR visualization
   - Top 5 coins
   - Interactive timeline
   - Data aggregation

## Local Development & Testing

### Prerequisites

- Python 3.9+
- Node.js 14+
- npm or yarn
- Git

### Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/Jadenkkk/Funding_Arb_CS50.git
   cd Funding_Arb_CS50
   ```

2. Backend Setup:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 8080
   ```

   The backend will be available at: http://localhost:8080

3. Frontend Setup:
   Open a new terminal window:
   ```bash
   cd frontend
   npm install
   npm start
   ```

   The frontend will be available at: http://localhost:3000

### Testing the Application

1. Open http://localhost:3000 in your web browser
2. You should see:
   - Landing page with project overview
   - Funding rate comparison table
   - Arbitrage opportunities table
   - Top Arbitrage APR History (Line Chart)
   - Hourly Top Arbitrage APR (Bar Chart)

### API Endpoints

Test these endpoints in your browser or using curl:
- http://localhost:8080/api/common-funding-table
- http://localhost:8080/api/arbitrage-opportunities
- http://localhost:8080/api/history/arbitrage

### Troubleshooting

If you encounter any issues:
1. Ensure both backend and frontend servers are running
2. Check that ports 8080 and 3000 are available
3. Verify all dependencies are installed correctly
4. Check the console for any error messages
5. Make sure you have an active internet connection for exchange API access

## Development Guidelines

### Frontend
1. Use functional components with hooks
2. Follow React best practices
3. Maintain consistent code style
4. Handle errors gracefully
5. Implement loading states

### Backend
1. Use async/await for API calls
2. Implement proper error handling
3. Follow FastAPI best practices
4. Maintain clean code structure
5. Document API endpoints

## Author

Jaden Kang - [GitHub](https://github.com/Jadenkkk) 