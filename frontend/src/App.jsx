import React, { useEffect, useRef, useState } from "react";
import { Crosshair, Database, Search } from "lucide-react";
import * as Cesium from "cesium";

import { askAgent, getSatellitePosition, listSatellites } from "./api/client";
import { Button } from "./components/ui/button";
import "./styles/index.css";

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN || "";

export default function App() {
  const viewerRef = useRef(null);
  const containerRef = useRef(null);
  const [satellites, setSatellites] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("Zoom into Starlink satellite 42");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    viewerRef.current = new Cesium.Viewer(containerRef.current, {
      animation: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      timeline: false,
      navigationHelpButton: false,
      terrain: Cesium.Terrain.fromWorldTerrain(),
    });
    viewerRef.current.scene.globe.enableLighting = true;
    return () => viewerRef.current?.destroy();
  }, []);

  useEffect(() => {
    listSatellites()
      .then(setSatellites)
      .catch((err) => setError(err.message));
  }, []);

  function renderSatellite(position) {
    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }
    viewer.entities.removeAll();
    const point = Cesium.Cartesian3.fromDegrees(
      position.longitude,
      position.latitude,
      position.altitude_km * 1000,
    );
    viewer.entities.add({
      id: String(position.norad_id),
      name: position.name,
      position: point,
      point: { pixelSize: 11, color: Cesium.Color.CYAN, outlineColor: Cesium.Color.BLACK, outlineWidth: 2 },
      label: {
        text: position.name,
        font: "14px sans-serif",
        fillColor: Cesium.Color.WHITE,
        pixelOffset: new Cesium.Cartesian2(0, -22),
      },
    });
    viewer.camera.flyTo({ destination: point, duration: 1.2 });
  }

  async function selectSatellite(identifier) {
    setError("");
    const position = await getSatellitePosition(identifier);
    setSelected(position);
    setAnswer("");
    renderSatellite(position);
  }

  async function submitQuery(event) {
    event.preventDefault();
    setError("");
    try {
      const response = await askAgent(query);
      setAnswer(response.answer);
      if (response.satellite) {
        setSelected(response.satellite);
        renderSatellite(response.satellite);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="grid h-full grid-cols-[360px_1fr] bg-space text-slate-100">
      <aside className="flex min-h-0 flex-col border-r border-slate-800 bg-slate-950/95 p-5">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold">Omniverse-Geo</h1>
          <p className="mt-1 text-sm text-slate-400">Live orbital intelligence on CesiumJS</p>
        </div>
        <form className="mb-5 flex gap-2" onSubmit={submitQuery}>
          <input
            className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm outline-none focus:border-signal"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button title="Ask satellite agent" type="submit">
            <Search size={16} />
          </Button>
        </form>
        {answer && <p className="mb-4 rounded-md bg-slate-900 p-3 text-sm text-slate-200">{answer}</p>}
        {error && <p className="mb-4 rounded-md bg-red-950 p-3 text-sm text-red-100">{error}</p>}
        <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
          <Database size={16} />
          <span>{satellites.length} cached satellites</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {satellites.map((satellite) => (
            <button
              key={satellite.norad_id}
              className="mb-2 flex w-full items-center justify-between rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-left text-sm hover:border-signal"
              onClick={() => selectSatellite(satellite.norad_id)}
              type="button"
            >
              <span className="truncate">{satellite.name}</span>
              <Crosshair size={15} />
            </button>
          ))}
        </div>
        {selected && (
          <dl className="mt-4 grid grid-cols-2 gap-2 rounded-md bg-slate-900 p-3 text-sm">
            <Metric label="Altitude" value={`${selected.altitude_km.toFixed(1)} km`} />
            <Metric label="Velocity" value={`${selected.velocity_km_s.toFixed(2)} km/s`} />
            <Metric label="Latitude" value={selected.latitude.toFixed(2)} />
            <Metric label="Longitude" value={selected.longitude.toFixed(2)} />
          </dl>
        )}
      </aside>
      <section ref={containerRef} className="min-h-0" />
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-100">{value}</dd>
    </div>
  );
}
