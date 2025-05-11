# Funding Rate Arbitrage Tracker

## Vision & Purpose

In the rapidly evolving landscape of cryptocurrency markets, we're witnessing a fundamental shift in how financial markets operate. Unlike traditional finance where assets are typically listed on a single exchange (e.g., Tesla on NASDAQ), cryptocurrencies are simultaneously listed across multiple exchanges. This unique characteristic of crypto markets presents both challenges and opportunities.

### The Problem: Market Inefficiency

The current cryptocurrency market exhibits significant inefficiencies, particularly in perpetual futures markets. These inefficiencies manifest through funding rates - a mechanism that reflects the imbalance between long and short positions. When funding rates are high, it indicates an overabundance of long positions relative to shorts, creating a divergence between spot and futures prices. Conversely, negative funding rates suggest an excess of short positions.

### Our Solution: Democratizing Arbitrage

Historically, arbitrage opportunities in cryptocurrency markets have been primarily accessible to institutional players with sophisticated infrastructure. Our project aims to democratize this access by providing retail traders with real-time insights into funding rate disparities across major exchanges.

By tracking funding rates for the top 50 cryptocurrencies by 24-hour trading volume across Binance, Bybit, OKX, and Hyperliquid, we identify and present arbitrage opportunities in an accessible format. This transparency not only benefits individual traders but also contributes to market efficiency by:

1. Making arbitrage opportunities more accessible to retail traders
2. Encouraging market participants to act on price discrepancies
3. Contributing to the overall price efficiency of cryptocurrency markets
4. Supporting the broader mission of financial innovation in the crypto space

## Features

- **Real-time Funding Rate Comparison**
  - Tracks funding rates for USDT-margined perpetual futures
  - Shows rates from Binance, Bybit, OKX, and Hyperliquid
  - Displays volume and other relevant metrics
  - Color-coded for easy comparison

- **Arbitrage Opportunities**
  - Identifies top 10 arbitrage opportunities
  - Calculates potential APR for each opportunity
  - Shows long/short positions for each trade
  - Updates in real-time

## Tech Stack

- **Frontend**: React.js
- **Backend**: FastAPI (Python)
- **Deployment**:
  - Frontend: Vercel
  - Backend: Vultr VPS
  - Domain: Namecheap (jadenkk.xyz)
  - SSL: Let's Encrypt
  - Reverse Proxy: Nginx

## Live Demo

Visit [https://jadenkk.xyz](https://jadenkk.xyz) to see the application in action.

## Project Video

[Watch the project demo video](https://youtube.com/watch?v=YOUR_VIDEO_ID)

## Local Development

### Prerequisites

- Python 3.9+
- Node.js 14+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8080
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## API Endpoints

- `GET /api/common-funding-table`: Returns funding rates for common pairs
- `GET /api/arbitrage-opportunities`: Returns top arbitrage opportunities

## Contributing

We welcome contributions to help democratize access to cryptocurrency market opportunities. Feel free to submit issues and enhancement requests!

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Jaden Kim - [GitHub](https://github.com/Jadenkkk) 