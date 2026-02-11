"""
Uber Service
============
Provides integration with Uber for ride requests and deep linking.
"""

import json
import logging
from typing import Optional
from pathlib import Path
import urllib.parse

logger = logging.getLogger(__name__)

class UberService:
    """Service for Uber integration."""

    def __init__(self, settings):
        self.credentials_file = settings.uber_credentials_file
        self.client_id = None
        self._load_credentials()

    def _load_credentials(self):
        """Load Uber credentials from JSON file."""
        try:
            path = Path(self.credentials_file)
            if not path.is_absolute():
                # Try to resolve relative to current working directory
                # or relative to the file location if needed, but standard is CWD
                pass
            
            if path.exists():
                with open(path, "r") as f:
                    data = json.load(f)
                    self.client_id = data.get("application_id")
                    if not self.client_id:
                        logger.warning("Uber credentials file found but 'application_id' is missing.")
            else:
                logger.warning(f"Uber credentials file not found at: {path}")
                
        except Exception as e:
            logger.error(f"Failed to load Uber credentials: {e}")

    def get_deep_link(
        self, 
        dest_lat: float, 
        dest_lng: float, 
        nickname: Optional[str] = None
    ) -> str:
        """
        Generate a Universal Link to open Uber with the destination set.
        
        Args:
            dest_lat: Destination latitude.
            dest_lng: Destination longitude.
            nickname: Optional nickname for the destination (e.g. restaurant name).
            
        Returns:
            The deep link URL.
        """
        # Deep link format: 
        # https://m.uber.com/ul/?client_id=<CLIENT_ID>&action=setPickup&pickup=my_location&dropoff[latitude]=...
        
        base_url = "https://m.uber.com/ul/?action=setPickup&pickup=my_location"
        
        params = [
            f"dropoff[latitude]={dest_lat}",
            f"dropoff[longitude]={dest_lng}"
        ]
        
        if self.client_id:
            params.append(f"client_id={self.client_id}")
            
        if nickname:
            encoded_nick = urllib.parse.quote(nickname)
            params.append(f"dropoff[nickname]={encoded_nick}")
            
        return f"{base_url}&{'&'.join(params)}"
