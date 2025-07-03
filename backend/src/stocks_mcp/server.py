import yfinance as yf
from mcp.server.fastmcp import FastMCP

# Initialize MCP server
mcp = FastMCP("stockdataserver")


@mcp.tool()
def stock_price(stock_ticker: str) -> str:
    """Retrieve the last month's closing prices for a given stock ticker.

    Args:
        stock_ticker (str): Alphanumeric stock ticker (e.g., 'NVDA').

    Returns:
        str: String representation of the last month's closing prices.
    """
    try:
        dat = yf.Ticker(stock_ticker)
        historical_prices = dat.history(period='1mo')
        last_months_closes = historical_prices['Close']
        return f"Stock price over the last month for {stock_ticker}: {last_months_closes.to_string()}"
    except Exception as e:
        return f"Error retrieving stock price for {stock_ticker}: {e}"

@mcp.tool()
def stock_info(stock_ticker: str) -> str:
    """Retrieve background information for a given stock ticker.

    Args:
        stock_ticker (str): Alphanumeric stock ticker (e.g., 'IBM').

    Returns:
        str: Background information about the company.
    """
    try:
        dat = yf.Ticker(stock_ticker)
        return f"Background information for {stock_ticker}: {dat.info}"
    except Exception as e:
        return f"Error retrieving info for {stock_ticker}: {e}"


if __name__ == "__main__":
    mcp.run(transport="stdio")