import React from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <div className="landing-content">
        <h1>Funding Rate Arbitrage Tracker</h1>
        <p className="subtitle">
          Real-time crypto funding rate comparison and arbitrage opportunity explorer.
        </p>

        <section className="feature-section">
          <h2>Project Vision & Motivation</h2>
          <p>
            In the rapidly evolving crypto landscape, assets are listed on multiple exchanges simultaneously, unlike traditional finance. This leads to price discrepancies and market inefficiencies, which manifest as arbitrage opportunities and funding rate gaps. Historically, only institutions could exploit these inefficiencies. Our mission is to democratize access to these opportunities, empower retail traders, and contribute to a more efficient and innovative financial future.
          </p>
          <p>
            By tracking the top 50 coins by trading volume across Binance, Bybit, and OKX, we provide transparent, real-time funding rate comparisons and highlight the top 10 arbitrage opportunities. <b>This project is open-source and designed to be run locally on your own machine for learning, research, or personal use.</b> All data is processed and visualized in real time on your local environment.
          </p>
        </section>

        <section className="feature-section">
          <h2>Main Features</h2>
          <ul>
            <li>Real-time funding rate comparison for USDT-margined perpetual futures</li>
            <li>Top 10 arbitrage opportunities, with APR and long/short exchange info</li>
            <li>Volume, color-coded rates, and responsive UI</li>
            <li>Open-source, transparent, and retail-friendly</li>
            <li><b>Runs locally—no public deployment required</b></li>
          </ul>
        </section>

        <section className="feature-section">
          <h2>Tech Stack</h2>
          <ul>
            <li>Frontend: React.js</li>
            <li>Backend: FastAPI, ccxt</li>
            <li>Database: SQLite (for caching and history)</li>
            <li><b>Local Development:</b> Python 3.9+, Node.js 14+, npm</li>
            <li><b>How to use:</b> Clone the repo and follow the README to run locally</li>
          </ul>
        </section>

        <section className="feature-section">
          <h2>About the Exchanges</h2>
          <div className="exchange-cards">
            <div className="exchange-card">
              <b>Binance</b>
              <p>The world's largest exchange, high liquidity, and a wide range of coins.</p>
            </div>
            <div className="exchange-card">
              <b>Bybit</b>
              <p>Derivatives-focused, fast matching engine, and global user base.</p>
            </div>
            <div className="exchange-card">
              <b>OKX</b>
              <p>Diverse financial products, global service, and robust API.</p>
            </div>
          </div>
        </section>

        <section className="feature-section">
          <h2>About the Developer</h2>
          <p>
            Hi, I'm Jaden Kang. I'm passionate about crypto, financial innovation, and building tools that make markets more accessible and efficient for everyone.
          </p>
        </section>

        <button className="go-tracker-btn" onClick={() => navigate("/tracker")}>
          Go to Tracker
        </button>
      </div>
    </div>
  );
}

export default LandingPage;
