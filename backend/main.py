# Imports and App Initialization
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import ccxt
import asyncio
import ccxt.async_support as ccxt_async
import sqlite3
import json
import time
from collections import defaultdict
from datetime import datetime

# FastAPI App and CORS Setup
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins during development; restrict to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get Perpetual Symbols for Each Exchange
@app.get("/api/perp-symbols")
def get_perp_symbols():
    """
    Returns a dictionary of all perpetual swap symbols for each supported exchange.
    This helps the frontend know which symbols are available for funding rate comparison.
    """
    exchanges = {
        "binance": ccxt.binance(),
        "bybit": ccxt.bybit(),
        "okx": ccxt.okx(),
    }
    result = {}
    for name, ex in exchanges.items():
        markets = ex.load_markets()
        # Only include symbols that are perpetual swaps ("swap": True)
        perp_symbols = [s for s, m in markets.items() if m.get("swap", False)]
        result[name] = perp_symbols
    return result

# Get Funding Rates for Major Symbols
@app.get("/api/funding-rates")
def get_funding_rates():
    """
    Returns the current funding rates for a small set of major symbols (BTC, ETH) across all exchanges.
    This is a simple example endpoint for quick funding rate checks.
    """
    exchanges = {
        "binance": ccxt.binance(),
        "bybit": ccxt.bybit(),
        "okx": ccxt.okx(),
    }
    symbols = ["BTC/USDT:USDT", "ETH/USDT:USDT"]
    result = {}
    for name, ex in exchanges.items():
        rates = {}
        for symbol in symbols:
            try:
                rate = ex.fetch_funding_rate(symbol)
                rates[symbol] = rate
            except Exception as e:
                rates[symbol] = {"error": str(e)}
        result[name] = rates
    return result

# Database Helper Functions
def get_db():
    """
    Opens a connection to the SQLite database for storing and retrieving funding/arbitrage snapshots.
    """
    return sqlite3.connect('funding_history.db')

def save_snapshot(data_type, data):
    """
    Saves a snapshot of funding or arbitrage data to the database with a timestamp.
    If the table does not exist, it is created automatically.
    """
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS funding_snapshot (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            data_type TEXT,
            data TEXT
        )
    ''')
    c.execute(
        'INSERT INTO funding_snapshot (data_type, data) VALUES (?, ?)',
        (data_type, json.dumps(data))
    )
    conn.commit()
    conn.close()

def get_latest_snapshot(data_type):
    """
    Retrieves the most recent snapshot of the given data_type (e.g., 'funding' or 'arbitrage').
    Returns the data and the timestamp it was created.
    """
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        SELECT data, created_at FROM funding_snapshot
        WHERE data_type=?
        ORDER BY created_at DESC LIMIT 1
    ''', (data_type,))
    row = c.fetchone()
    conn.close()
    if row:
        data, created_at = row
        return json.loads(data), created_at
    return None, None

# Get Common Funding Table (Top 50 by Volume)
@app.get("/api/common-funding-table")
async def common_funding_table():
    """
    Returns a table comparing funding rates for the top 50 USDT-margined perpetual symbols
    (by Binance 24h quote volume) that are listed on all supported exchanges.
    Uses caching (5 minutes) to reduce API load and improve performance.
    """
    cached, cached_time = get_latest_snapshot('funding')
    # Use cached data if it is less than 5 minutes old
    if cached and (time.time() - time.mktime(time.strptime(cached_time, "%Y-%m-%d %H:%M:%S"))) < 300:
        return cached

    # Initialize async exchange clients
    exchanges = {
        "binance": ccxt_async.binance(),
        "bybit": ccxt_async.bybit(),
        "okx": ccxt_async.okx(),
    }
    # Step 1: Get all perpetual symbols for each exchange
    symbol_sets = {}
    for name, ex in exchanges.items():
        markets = await ex.load_markets()
        perp_symbols = set([s for s, m in markets.items() if m.get("swap", False)])
        symbol_sets[name] = perp_symbols
    # Step 2: Find symbols that are listed on all exchanges (intersection)
    common_symbols = list(sorted(set.intersection(*symbol_sets.values())))
    # Step 3: Keep only USDT-margined perpetual contracts
    usdt_perp_symbols = [s for s in common_symbols if s.endswith(":USDT")]
    # Step 4: Remove duplicates by base symbol (e.g., only one BTC/USDT:USDT per base)
    def extract_base_symbol(symbol):
        return symbol.split('/')[0]
    unique_base = {}
    for symbol in usdt_perp_symbols:
        base = extract_base_symbol(symbol)
        if base not in unique_base:
            unique_base[base] = symbol
    filtered_symbols = list(unique_base.values())
    # Step 5: Get Binance 24h quote volume for each symbol and select top 50
    async def get_volume(symbol):
        try:
            ticker = await exchanges["binance"].fetch_ticker(symbol)
            return float(ticker.get("quoteVolume", 0)), ticker.get("quoteVolume", 0)
        except Exception:
            return 0, 0
    volume_results = await asyncio.gather(*[get_volume(symbol) for symbol in filtered_symbols])
    vol_list = list(zip(filtered_symbols, volume_results))
    vol_list.sort(key=lambda x: x[1][0], reverse=True)
    top_symbols = [symbol for symbol, _ in vol_list[:50]]
    top_volumes = {symbol: v[1] for symbol, v in vol_list[:50]}
    # Step 6: Fetch funding rates for each symbol on each exchange (async)
    async def fetch_rate(ex, symbol):
        try:
            rate = await ex.fetch_funding_rate(symbol)
            return rate.get("fundingRate")
        except Exception:
            return None
    table = []
    for symbol in top_symbols:
        row = {"symbol": symbol, "Volume (Binance)": top_volumes[symbol]}
        tasks = [fetch_rate(ex, symbol) for ex in exchanges.values()]
        results = await asyncio.gather(*tasks)
        for i, name in enumerate(exchanges.keys()):
            row[name] = results[i]
        table.append(row)
    # Always close all async exchange clients to avoid resource warnings
    await asyncio.gather(*[ex.close() for ex in exchanges.values()])
    # Save the result to the database for caching and history
    save_snapshot('funding', table)
    return table

# Get Top Arbitrage Opportunities (Top 10 by APR)
@app.get("/api/top-arbitrage")
async def top_arbitrage():
    """
    Returns the top 10 arbitrage opportunities (by annualized APR) for USDT-margined perpetuals
    that are listed on all supported exchanges. Uses 5-minute caching for efficiency.
    """
    cached, cached_time = get_latest_snapshot('arbitrage')
    # Use cached data if it is less than 5 minutes old
    if cached and (time.time() - time.mktime(time.strptime(cached_time, "%Y-%m-%d %H:%M:%S"))) < 300:
        return cached
    # Initialize async exchange clients
    exchanges = {
        "binance": ccxt_async.binance(),
        "bybit": ccxt_async.bybit(),
        "okx": ccxt_async.okx(),
    }
    # Step 1: Get all perpetual symbols for each exchange
    symbol_sets = {}
    for name, ex in exchanges.items():
        markets = await ex.load_markets()
        perp_symbols = set([s for s, m in markets.items() if m.get("swap", False)])
        symbol_sets[name] = perp_symbols
    # Step 2: Find symbols that are listed on all exchanges (intersection)
    common_symbols = list(sorted(set.intersection(*symbol_sets.values())))
    # Step 3: Keep only USDT-margined perpetual contracts
    usdt_perp_symbols = [s for s in common_symbols if s.endswith(":USDT")]
    # Step 4: Remove duplicates by base symbol
    def extract_base_symbol(symbol):
        return symbol.split('/')[0]
    unique_base = {}
    for symbol in usdt_perp_symbols:
        base = extract_base_symbol(symbol)
        if base not in unique_base:
            unique_base[base] = symbol
    filtered_symbols = list(unique_base.values())
    # Step 5: Fetch funding rates for each symbol on each exchange (async)
    async def fetch_rate(ex, symbol):
        try:
            rate = await ex.fetch_funding_rate(symbol)
            return rate.get("fundingRate")
        except Exception:
            return None
    table = []
    for symbol in filtered_symbols:
        rates = {}
        tasks = [fetch_rate(ex, symbol) for ex in exchanges.values()]
        results = await asyncio.gather(*tasks)
        for i, name in enumerate(exchanges.keys()):
            rates[name] = results[i]
        # Only consider symbols with at least 2 valid funding rates
        valid_rates = {k: v for k, v in rates.items() if v is not None}
        if len(valid_rates) < 2:
            continue
        # Find the exchange with the lowest (long) and highest (short) funding rates
        long_ex, long_rate = min(valid_rates.items(), key=lambda x: x[1])
        short_ex, short_rate = max(valid_rates.items(), key=lambda x: x[1])
        diff = short_rate - long_rate
        # Funding rate is per 8 hours, so annualize: diff * 3 (per day) * 365 (per year) * 100 (percent)
        apr = diff * 3 * 365 * 100
        table.append({
            "symbol": symbol,
            "long_exchange": f"{long_ex} ({long_rate:.6%})",
            "short_exchange": f"{short_ex} ({short_rate:.6%})",
            "apr": apr
        })
    # Sort by APR in descending order and keep the top 10
    table.sort(key=lambda x: x["apr"], reverse=True)
    table = table[:10]
    # Save the result to the database for caching and history
    save_snapshot('arbitrage', table)
    return table

# Get Historical Snapshots (Optional)
@app.get("/api/history/{data_type}")
def get_history(data_type: str, limit: int = 10):
    """
    Returns a list of historical snapshots for the given data_type (e.g., 'funding' or 'arbitrage').
    Each snapshot includes an id, timestamp, and the data at that time.
    The limit parameter controls how many recent snapshots are returned (default: 10).
    """
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        SELECT id, created_at, data FROM funding_snapshot
        WHERE data_type=?
        ORDER BY created_at DESC LIMIT ?
    ''', (data_type, limit))
    rows = c.fetchall()
    conn.close()
    return [
        {
            "id": row[0],
            "created_at": row[1],
            "data": json.loads(row[2])
        }
        for row in rows
    ]

@app.get("/api/history/arbitrage/hourly")
def get_hourly_top_arbitrage():
    conn = sqlite3.connect("funding_history.db")
    cursor = conn.cursor()
    cursor.execute("SELECT created_at, data FROM funding_snapshot WHERE data_type='arbitrage' ORDER BY created_at ASC")
    rows = cursor.fetchall()
    conn.close()

    hourly = defaultdict(list)
    for created_at, data_json in rows:
        dt = datetime.fromisoformat(created_at)
        hour_key = dt.replace(minute=0, second=0, microsecond=0)
        data = json.loads(data_json)
        hourly[hour_key].append(data)

    result = []
    for hour, data_list in hourly.items():
        all_coins = [coin for snapshot in data_list for coin in snapshot]
        if not all_coins:
            continue
        top = max(all_coins, key=lambda x: x.get("apr", float('-inf')))
        result.append({
            "hour": hour.isoformat(),
            "symbol": top["symbol"],
            "apr": top["apr"]
        })
    result.sort(key=lambda x: x["hour"])
    return result 