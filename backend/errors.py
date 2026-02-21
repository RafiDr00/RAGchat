from fastapi import Request
from fastapi.responses import JSONResponse
from loguru import logger
import traceback

async def global_exception_handler(request: Request, exc: Exception):
    """
    Global catch-all for unhandled exceptions.
    Prevents leaking internal stack traces to the client while logging deep telemetry.
    """
    error_id = traceback.format_exc().splitlines()[-1]
    logger.error(f"UNHANDLED EXCEPTION: {exc}\n{traceback.format_exc()}")
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal System Error",
            "message": "Engine experienced an unexpected state. Telemetry has been captured.",
            "error_hint": str(exc) if "zenith_dev_secret" not in str(exc) else "Security context"
        }
    )
