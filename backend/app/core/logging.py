import logging
import sys
import json
from typing import Any
from app.core.config import settings

def setup_logging():
    """Configures structured logging for the Aura backend."""
    
    # Define log format
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        datefmt=date_format,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Set levels for specific libraries
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    
    # Aura logger
    logger = logging.getLogger("app")
    logger.setLevel(logging.DEBUG) # Default to DEBUG for internal app logic

    logger.info("Logging initialized.")

class StructuredLogger:
    """Helper for logging structured data as JSON-like strings if needed, 
    or just ensuring consistent metadata."""
    
    @staticmethod
    def log_request(method: str, path: str, params: Any = None):
        logging.getLogger("app.api").info(
            f"Incoming Request: {method} {path} | Params: {params}"
        )

    @staticmethod
    def log_response(method: str, path: str, status_code: int, duration: float):
        logging.getLogger("app.api").info(
            f"Outgoing Response: {method} {path} | Status: {status_code} | Duration: {duration:.4f}s"
        )
