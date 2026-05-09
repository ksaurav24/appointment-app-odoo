export type GeocodeSuggestion = {
  formattedAddress: string
  latitude: number
  longitude: number
  placeId: string
  city: string
  state: string
}

type GeocodeApiResponse = {
  status: string
  error_message?: string
  results?: GeocodeApiResult[]
}

type GeocodeApiResult = {
  formatted_address: string
  place_id: string
  geometry: { location: { lat: number; lng: number } }
  address_components: Array<{
    long_name: string
    short_name: string
    types: string[]
  }>
}

function pickAddressComponent(
  components: GeocodeApiResult["address_components"],
  type: string
): string | null {
  const component = components.find((entry) => entry.types.includes(type))
  return component?.long_name ?? null
}

export async function geocodeIndianAddress(
  query: string
): Promise<GeocodeSuggestion[]> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) {
    throw new Error(
      "Google Maps API key is missing. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY."
    )
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json")
  url.searchParams.set("address", query)
  url.searchParams.set("components", "country:IN")
  url.searchParams.set("key", key)

  const response = await fetch(url.toString())
  const payload = (await response.json()) as GeocodeApiResponse

  if (!response.ok) {
    throw new Error("Google Maps request failed.")
  }
  if (payload.status === "ZERO_RESULTS") return []
  if (payload.status !== "OK" || !payload.results) {
    throw new Error(payload.error_message ?? "Unable to fetch map results.")
  }

  return payload.results.slice(0, 5).map((result) => {
    const city =
      pickAddressComponent(result.address_components, "locality") ??
      pickAddressComponent(
        result.address_components,
        "administrative_area_level_2"
      ) ??
      ""
    const state =
      pickAddressComponent(
        result.address_components,
        "administrative_area_level_1"
      ) ?? ""

    return {
      formattedAddress: result.formatted_address,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      placeId: result.place_id,
      city,
      state,
    }
  })
}
