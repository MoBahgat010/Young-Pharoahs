"""
Google Places Service
=====================
Provides nearby place search (restaurants, hotels) using the Google Places API.
"""

import logging
from typing import Optional
from urllib.parse import urlparse, parse_qs

import requests

logger = logging.getLogger(__name__)

NEARBY_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"


class PlacesService:
    """Service for searching nearby places via Google Places API."""

    def __init__(self, settings):
        self.api_key = settings.google_places_api_key
        self.default_radius = settings.places_radius

    def _search_nearby(
        self,
        lat: float,
        lng: float,
        place_type: str,
        radius: int | None = None,
    ) -> list[dict]:
        """
        Call Google Places Nearby Search for a single type.

        Args:
            lat: Latitude of the location.
            lng: Longitude of the location.
            place_type: Google place type (e.g. "restaurant", "lodging").
            radius: Search radius in meters.

        Returns:
            List of place dicts with name, address, rating, location, etc.
        """
        if not self.api_key:
            raise RuntimeError("GOOGLE_PLACES_API_KEY is not configured")

        params = {
            "location": f"{lat},{lng}",
            "radius": radius or self.default_radius,
            "type": place_type,
            "key": self.api_key,
        }

        try:
            resp = requests.get(NEARBY_SEARCH_URL, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as exc:
            logger.error("Google Places API request failed: %s", exc)
            raise RuntimeError(f"Google Places API request failed: {exc}") from exc

        if data.get("status") not in ("OK", "ZERO_RESULTS"):
            logger.error("Google Places API error: %s", data.get("status"))
            raise RuntimeError(f"Google Places API error: {data.get('status')}")

        results = []
        for place in data.get("results", []):
            loc = place.get("geometry", {}).get("location", {})
            results.append({
                "name": place.get("name"),
                "address": place.get("vicinity"),
                "rating": place.get("rating"),
                "total_ratings": place.get("user_ratings_total"),
                "location": {
                    "lat": loc.get("lat"),
                    "lng": loc.get("lng"),
                },
                "open_now": (
                    place.get("opening_hours", {}).get("open_now")
                ),
                "place_id": place.get("place_id"),
                "types": place.get("types", []),
            })

        return results

    def get_nearby_services(
        self,
        lat: float,
        lng: float,
        place_type: str = "both",
        radius: int | None = None,
    ) -> dict:
        """
        Fetch nearby restaurants and/or hotels for a location.

        Args:
            lat: Latitude.
            lng: Longitude.
            place_type: "restaurant", "hotel", or "both".
            radius: Search radius in meters (optional, uses config default).

        Returns:
            Dict with "restaurants" and/or "hotels" lists.
        """
        result: dict = {}

        if place_type in ("restaurant", "both"):
            result["restaurants"] = self._search_nearby(lat, lng, "restaurant", radius)
            logger.info("Found %d restaurants near (%.4f, %.4f)", len(result["restaurants"]), lat, lng)

        if place_type in ("hotel", "both"):
            result["hotels"] = self._search_nearby(lat, lng, "lodging", radius)
            logger.info("Found %d hotels near (%.4f, %.4f)", len(result["hotels"]), lat, lng)

        return result

    # ── Coordinate helpers ──────────────────────────────────────────────────

    @staticmethod
    def extract_coords_from_url(location_url: str) -> tuple[float, float]:
        """
        Extract (lat, lng) from a Google Maps URL like:
        https://www.google.com/maps/search/?api=1&query=22.3372,31.6258

        Raises ValueError if coordinates cannot be parsed.
        """
        parsed = urlparse(location_url)
        qs = parse_qs(parsed.query)
        query_val = qs.get("query", [None])[0]
        if not query_val:
            raise ValueError(f"No 'query' parameter in URL: {location_url}")

        parts = query_val.split(",")
        if len(parts) != 2:
            raise ValueError(f"Cannot parse coordinates from: {query_val}")

        try:
            return float(parts[0].strip()), float(parts[1].strip())
        except ValueError:
            raise ValueError(f"Invalid coordinate values: {query_val}")
