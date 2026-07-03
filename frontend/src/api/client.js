const API_URL = import.meta.env.VITE_API_URL || "http://localhost:19011";

export async function listSatellites() {
  const response = await fetch(`${API_URL}/satellites`);
  if (!response.ok) {
    throw new Error("Unable to load satellites");
  }
  return response.json();
}

export async function getSatellitePosition(identifier) {
  const response = await fetch(`${API_URL}/satellites/${encodeURIComponent(identifier)}/position`);
  if (!response.ok) {
    throw new Error("Satellite position unavailable");
  }
  return response.json();
}

export async function askAgent(query) {
  const response = await fetch(`${API_URL}/satellites/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) {
    throw new Error("Agent request failed");
  }
  return response.json();
}
