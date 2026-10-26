"""
Configuration Module for AI Orchestrator Service.
Uses pydantic-settings to load and validate environment variables with safe defaults.
"""

from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment or .env file."""
    
    # Server network settings
    host: str = Field(default="127.0.0.1", description="Binding host address")
    port: int = Field(default=8001, description="Binding port number")
    environment: str = Field(default="development", description="Runtime environment (development, staging, production)")
    log_level: str = Field(default="INFO", description="Logging severity level")

    # Service-to-service internal authentication
    internal_service_key: str = Field(
        default="dev-orchestrator-internal-key-change-in-prod",
        description="Shared secret for service-to-service internal authentication"
    )

    # Optional upstream Gemini API credentials
    gemini_api_key: Optional[str] = Field(default=None, description="Optional Gemini API key for workflow nodes")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


settings = Settings()
