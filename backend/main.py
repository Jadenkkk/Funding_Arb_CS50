from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import ccxt
import asyncio
import ccxt.async_support as ccxt_async  # 비동기 ccxt
import sqlite3
import json
import time

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 중 전체 허용, 배포시 도메인 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/hello")
def hello():
    return {"msg": "Hello Funding Arb!"}

@app.get("/api/perp-symbols")
def get_perp_symbols():
    exchanges = {
        "binance": ccxt.binance(),
        "bybit": ccxt.bybit(),
        "okx": ccxt.okx(),
    }
    result = {}
    for name, ex in exchanges.items():
        markets = ex.load_markets()
        perp_symbols = [s for s, m in markets.items() if m.get("swap", False)]
        result[name] = perp_symbols
    return result

@app.get("/api/funding-rates")
def get_funding_rates():
    exchanges = {
        "binance": ccxt.binance(),
        "bybit": ccxt.bybit(),
        "okx": ccxt.okx(),
    }
    # 예시: BTC/USDT:USDT, ETH/USDT:USDT 등 주요 심볼만
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

def get_db():
    conn = sqlite3.connect('funding_history.db')
    return conn

def save_snapshot(data_type, data):
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

@app.get("/api/common-funding-table")
async def common_funding_table():
    cached, cached_time = get_latest_snapshot('funding')
    if cached and (time.time() - time.mktime(time.strptime(cached_time, "%Y-%m-%d %H:%M:%S"))) < 300:
        return cached

    exchanges = {
        "binance": ccxt_async.binance(),
        "bybit": ccxt_async.bybit(),
        "okx": ccxt_async.okx(),
    }
    # 1. 각 거래소의 perp 심볼 리스트 구하기
    symbol_sets = {}
    for name, ex in exchanges.items():
        markets = await ex.load_markets()
        perp_symbols = set([s for s, m in markets.items() if m.get("swap", False)])
        symbol_sets[name] = perp_symbols

    # 2. 교집합(공통 상장 심볼) 구하기
    common_symbols = list(sorted(set.intersection(*symbol_sets.values())))

    # 3. USDT 마진 perp만 남기기
    usdt_perp_symbols = [s for s in common_symbols if s.endswith(":USDT")]

    # 4. base symbol(기초자산) 기준으로 중복 제거 (대표 마켓만)
    def extract_base_symbol(symbol):
        return symbol.split('/')[0]

    unique_base = {}
    for symbol in usdt_perp_symbols:
        base = extract_base_symbol(symbol)
        if base not in unique_base:
            unique_base[base] = symbol
    filtered_symbols = list(unique_base.values())

    # 5. Binance 24h 거래량(quoteVolume) 기준 상위 50개 추출 및 거래량 저장
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

    # 6. 각 거래소별 funding rate 비동기 조회
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

    await asyncio.gather(*[ex.close() for ex in exchanges.values()])

    # 3. DB에 저장
    save_snapshot('funding', table)
    return table

@app.get("/api/debug-binance-info")
async def debug_binance_info():
    import ccxt.async_support as ccxt_async
    binance = ccxt_async.binance()
    await binance.load_markets()
    # 아무 perp 심볼 하나 선택 (예: BTC/USDT:USDT)
    for symbol, m in binance.markets.items():
        if m.get("swap", False):
            info = m["info"]
            await binance.close()
            return {"symbol": symbol, "info": info}
    await binance.close()
    return {"error": "No perp symbol found"}

@app.get("/api/top-arbitrage")
async def top_arbitrage():
    cached, cached_time = get_latest_snapshot('arbitrage')
    if cached and (time.time() - time.mktime(time.strptime(cached_time, "%Y-%m-%d %H:%M:%S"))) < 300:
        return cached

    exchanges = {
        "binance": ccxt_async.binance(),
        "bybit": ccxt_async.bybit(),
        "okx": ccxt_async.okx(),
    }
    # 1. 각 거래소의 perp 심볼 리스트 구하기
    symbol_sets = {}
    for name, ex in exchanges.items():
        markets = await ex.load_markets()
        perp_symbols = set([s for s, m in markets.items() if m.get("swap", False)])
        symbol_sets[name] = perp_symbols

    # 2. 교집합(공통 상장 심볼) 구하기
    common_symbols = list(sorted(set.intersection(*symbol_sets.values())))

    # 3. USDT 마진 perp만 남기기
    usdt_perp_symbols = [s for s in common_symbols if s.endswith(":USDT")]

    # 4. base symbol(기초자산) 기준으로 중복 제거 (대표 마켓만)
    def extract_base_symbol(symbol):
        return symbol.split('/')[0]

    unique_base = {}
    for symbol in usdt_perp_symbols:
        base = extract_base_symbol(symbol)
        if base not in unique_base:
            unique_base[base] = symbol
    filtered_symbols = list(unique_base.values())

    # 5. 각 거래소별 funding rate 비동기 조회
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
        # long: funding rate가 가장 낮은 거래소, short: 가장 높은 거래소
        valid_rates = {k: v for k, v in rates.items() if v is not None}
        if len(valid_rates) < 2:
            continue  # 2개 미만이면 arbitrage 불가
        long_ex, long_rate = min(valid_rates.items(), key=lambda x: x[1])
        short_ex, short_rate = max(valid_rates.items(), key=lambda x: x[1])
        diff = short_rate - long_rate
        apr = diff * 3 * 365 * 100  # 8시간 단위 funding rate 기준
        table.append({
            "symbol": symbol,
            "long_exchange": f"{long_ex} ({long_rate:.6%})",
            "short_exchange": f"{short_ex} ({short_rate:.6%})",
            "apr": apr
        })
    # APR 내림차순 정렬 후 상위 10개
    table.sort(key=lambda x: x["apr"], reverse=True)
    table = table[:10]

    save_snapshot('arbitrage', table)
    return table

# (선택) 과거 히스토리 조회 API
@app.get("/api/history/{data_type}")
def get_history(data_type: str, limit: int = 10):
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