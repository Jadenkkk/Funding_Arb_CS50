# Design Document: Funding Rate Arbitrage Tracker

## Technical Overview

This project implements a real-time cryptocurrency funding rate arbitrage tracker using a modern web stack. The system is designed to provide retail traders with institutional-grade market insights by tracking funding rates across multiple exchanges.


## Architecture Decisions

### 1. Technology Stack Selection

#### Frontend: React.js
- **Why React?**
  - Component-based architecture allows for efficient UI updates
  - Virtual DOM enables smooth real-time data updates without full page refreshes
  - Rich ecosystem of libraries (Material-UI, Recharts) for professional UI components


#### Backend: FastAPI
- **Why FastAPI?**
  - Native async support for handling multiple exchange API calls concurrently
  - Automatic API documentation with Swagger UI
  - Type hints and validation reduce runtime errors
  - High performance compared to traditional Python web frameworks

#### Database: SQLite
- **Why SQLite?**
  - Zero-configuration required, perfect for local development
  - Single file database makes deployment and backup simple
  - Sufficient for our read-heavy workload
  - No need for complex database setup or maintenance

### 2. Data Flow Architecture

```
Exchange APIs → Backend → SQLite DB → Frontend
```

- **Why this flow?**
  - Centralized data collection prevents rate limiting issues
  - Caching layer reduces API calls to exchanges
  - Historical data storage enables trend analysis

### 3. Exchange Integration

- **Why CCXT?**
  - Unified API for multiple exchanges
  - Handles authentication and rate limiting
  - Regular updates for new exchange features
  - Well-documented and maintained

### 4. Real-time Updates

- **Why 5-minute caching?**
  - Balances data freshness with API rate limits
  - Reduces server load
  - Provides sufficient granularity for arbitrage opportunities
  - Prevents excessive API calls

### 5. Frontend Components

#### Component Structure
- **Why this organization?**
  - **Separation of concerns for maintainability**
    - Each component has a single responsibility
    - `FundingTable`: Displays funding rates from different exchanges
    - `ArbitrageTable`: Shows arbitrage opportunities with APR calculations
    - `HistoryChart`: Visualizes historical APR data
    - This separation makes debugging and updates easier

  - **Reusable components reduce code duplication**
    - Common UI elements are extracted into reusable components
    - `DataTable`: Base component for both funding and arbitrage tables
    - `LoadingSpinner`: Used across all data-fetching components
    - `ErrorDisplay`: Consistent error message presentation
    - Reduces code duplication and ensures consistent UI

  - **Clear data flow between components**
    - Data flows in a predictable pattern:
    ```
    API Endpoints
        ↓
    App.js (Main Router)
        ↓
    TrackerPage (Main Container)
        ↓
    ┌─────────────┼─────────────┐
    ↓             ↓             ↓
    FundingTable  ArbitrageTable HistoryChart
    ```
    - Each component knows exactly where its data comes from
    - State management is centralized in parent components

  - **Easy to add new features**
    - Modular structure allows easy addition of new components
    - Example: Adding a new `VolumeChart` component:
      1. Create new component in `src/components/`
      2. Import and add to `TrackerPage.js`
      3. No need to modify existing components
    - Example: Adding new exchange data:
      1. Update API service
      2. Components automatically handle new data
      3. No UI changes required

#### State Management
- **Why React Hooks?**
  - **Simpler than class components**
    - Functional components with hooks are more concise
    - Example: `useEffect` for data fetching
    - Example: `useState` for local component state
  - **Better code organization**
    - Related logic is grouped together
    - Example: All chart-related logic in one place
  - **Easier testing and maintenance**
    - Pure functions are easier to test
    - Example: Testing data transformation functions
  - **Built-in performance optimizations**
    - React's automatic memoization
    - Example: `useMemo` for expensive calculations
    - Example: `useCallback` for stable function references

### 6. Backend Components

#### Core Structure
- **Why this organization?**
  - **Separation of concerns for maintainability**
    - Each module or function is responsible for a single aspect of backend logic
    - `data_collector`: Handles all exchange API requests and data normalization
    - `db_manager`: Manages SQLite database connections, queries, and snapshots
    - `api_endpoints`: Defines FastAPI routes and response models
    - This separation makes it easier to debug, test, and extend each part independently

  - **Reusable utility functions**
    - Common logic is extracted into helper functions
    - Example: `format_funding_rate()` for consistent number formatting
    - Example: `get_top_coins_by_volume()` for filtering and sorting
    - Reduces code duplication and ensures consistent data processing

  - **Clear data flow and async handling**
    - Data flows in a predictable pipeline:
    ```
    Exchange APIs (ccxt)
        ↓
    data_collector (async fetch & normalize)
        ↓
    db_manager (store/retrieve/caching)
        ↓
    api_endpoints (FastAPI routes)
        ↓
    Frontend (React fetch)
    ```
    - Async/await is used throughout to maximize throughput and responsiveness
    - Caching and snapshotting are handled at the database layer

  - **Easy to add new features or exchanges**
    - Modular structure allows new exchanges or endpoints to be added with minimal changes
    - Example: Adding a new exchange
      1. Implement new fetch logic in `data_collector`
      2. Update `get_top_coins_by_volume()` if needed
      3. No changes required to API endpoints or database logic
    - Example: Adding a new API endpoint
      1. Define new route in `api_endpoints`
      2. Use existing utility/database functions for data retrieval
      3. Minimal code duplication

#### Async Data Collection
- **Why async?**
  - Enables concurrent API calls to multiple exchanges, reducing total wait time
  - Example: Fetching funding rates from Binance, Bybit, OKX, and Hyperliquid in parallel
  - Improves scalability and responsiveness, especially under heavy load

#### Database Management
- **Why SQLite?**
  - Lightweight, file-based, and requires no server setup
  - Suitable for local development and small-to-medium scale deployments
  - Example: Storing funding rate snapshots every 5 minutes for historical analysis
  - Easy backup and migration (single file)

#### Error Handling & Logging
- **Why comprehensive error handling?**
  - Exchange APIs are unreliable and may fail or rate-limit
  - Example: Try/except blocks around all network/database operations
  - Graceful fallback and clear error messages to frontend
  - Logging of errors and warnings for debugging and monitoring

### 7. Performance Optimizations

- **Backend**
  - Async operations for concurrent API calls to exchanges
  - Caching and snapshotting to minimize redundant requests and DB writes
  - Efficient SQL queries for fast data retrieval

- **Frontend**
  - Component memoization and React hooks to prevent unnecessary rerenders
  - Lazy loading and efficient data structures for fast UI updates

### 8. Hourly Top Arbitrage APR Bar Chart

#### Feature Overview
- Visualizes, for each hour, the coin with the highest arbitrage APR and its value as a bar chart.
- Allows users to quickly spot which coin had the best arbitrage opportunity in each hour.

#### Backend Implementation
- Endpoint: `/api/history/arbitrage/hourly`
- For each hour, all arbitrage snapshots are grouped.
- Among all coins in that hour, the coin with the highest APR is selected.
- Returns a list of objects: `{ hour, symbol, apr }`.
- Example:
  ```json
  [
    { "hour": "2025-05-11T07:00:00", "symbol": "GAS/USDT:USDT", "apr": 123.45 },
    ...
  ]
  ```

#### Frontend Implementation
- The bar chart is rendered in `TrackerPage.js`.
- X-axis: hour (UTC), Y-axis: APR (%).
- Each bar represents the top arbitrage coin for that hour, with the coin symbol displayed above the bar.
- Color and label formatting for clarity.

#### Rationale
- This feature provides a clear, time-based view of the best arbitrage opportunities.
- Users can easily identify which coins consistently offer high APRs and when the best opportunities occur.
- The design supports both quick visual scanning and deeper analysis of arbitrage trends over time.


## Implementation Challenges & Solutions

- **Heterogeneous Exchange APIs**: Solved with CCXT for unified access and normalization.
- **API Rate Limits & Latency**: Addressed by async fetching and 5-minute caching.
- **Data Visualization Complexity**: Used Recharts for interactive, responsive charts.
- **Error Handling**: Comprehensive try/except and user-friendly error messages throughout stack.


## Future Improvements

- WebSocket support for true real-time updates
- More advanced caching and data aggregation
- User authentication and custom alerts
- Additional exchange integrations and analytics


## Conclusion

This project balances scalability, maintainability, and performance through modular design, async data handling, and clear separation of concerns. The architecture allows for easy expansion and robust operation, making institutional-grade arbitrage insights accessible to all users. 