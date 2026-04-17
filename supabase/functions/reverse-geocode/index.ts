// Reverse geocoding via OpenStreetMap Nominatim (no API key required)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lat, lng } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "lat/lng required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MediGo/1.0 (hyperlocal-medicine-delivery)" },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Geocoding failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const a = data.address ?? {};
    const line1 = [a.house_number, a.road || a.pedestrian || a.neighbourhood].filter(Boolean).join(" ");
    const line2 = [a.suburb, a.village, a.town].filter(Boolean).join(", ");
    const city = a.city || a.town || a.village || a.county || "";
    const state = a.state || "";
    const pincode = a.postcode || "";

    return new Response(
      JSON.stringify({
        display_name: data.display_name,
        line1: line1 || data.display_name?.split(",")[0] || "",
        line2,
        city,
        state,
        pincode,
        lat,
        lng,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
