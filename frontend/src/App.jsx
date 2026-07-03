import React, { useEffect, useRef, useState } from "react";
import { Crosshair, Database, Search } from "lucide-react";
import * as Cesium from "cesium";

import { askAgent, getSatelliteOrbit, getSatellitePosition, listSatellites } from "./api/client";
import { Button } from "./components/ui/button";
import "./styles/index.css";

const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN || "";
if (ionToken) {
  Cesium.Ion.defaultAccessToken = ionToken;
}

export default function App() {
  const viewerRef = useRef(null);
  const containerRef = useRef(null);
  const [satellites, setSatellites] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("Zoom into Starlink satellite 42");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const viewerOpts = {
      animation: true,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      timeline: true,
      navigationHelpButton: false,
      shouldAnimate: true,
    };

    if (ionToken) {
      viewerOpts.terrain = Cesium.Terrain.fromWorldTerrain();
    } else {
      viewerOpts.baseLayer = new Cesium.ImageryLayer(
        new Cesium.OpenStreetMapImageryProvider({
          url: "https://tile.openstreetmap.org/",
        })
      );
    }

    viewerRef.current = new Cesium.Viewer(containerRef.current, viewerOpts);
    viewerRef.current.scene.globe.enableLighting = true;
    return () => viewerRef.current?.destroy();
  }, []);

  useEffect(() => {
    listSatellites()
      .then(setSatellites)
      .catch((err) => setError(err.message));
  }, []);

  function renderOrbit(orbitData) {
    const viewer = viewerRef.current;
    if (!viewer || !orbitData.positions.length) return;

    viewer.entities.removeAll();

    const start = Cesium.JulianDate.fromIso8601(orbitData.positions[0].time);
    const stop = Cesium.JulianDate.fromIso8601(orbitData.positions[orbitData.positions.length - 1].time);

    viewer.clock.startTime = start.clone();
    viewer.clock.stopTime = stop.clone();
    viewer.clock.currentTime = start.clone();
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
    viewer.clock.multiplier = 60;

    if (viewer.timeline) {
      viewer.timeline.zoomTo(start, stop);
    }

    // Build sampled position from orbit propagation data
    const positionProperty = new Cesium.SampledPositionProperty();
    positionProperty.setInterpolationOptions({
      interpolationDegree: 3,
      interpolationAlgorithm: Cesium.LagrangePolynomialApproximation,
    });

    for (const p of orbitData.positions) {
      const time = Cesium.JulianDate.fromIso8601(p.time);
      const cartesian = Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.altitude_km * 1000);
      positionProperty.addSample(time, cartesian);
    }

    // Add satellite entity with billboard icon + orbit path
    const satEntity = viewer.entities.add({
      id: String(orbitData.norad_id),
      name: orbitData.name,
      availability: new Cesium.TimeIntervalCollection([
        new Cesium.TimeInterval({ start, stop }),
      ]),
      position: positionProperty,
      orientation: new Cesium.VelocityOrientationProperty(positionProperty),
      billboard: {
        image: buildSatelliteCanvas(),
        scale: 1.0,
        alignedAxis: Cesium.Cartesian3.ZERO,
        scaleByDistance: new Cesium.NearFarScalar(5e5, 1.2, 1e7, 0.4),
      },
      // Orbit path trail
      path: {
        resolution: 30,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.25,
          color: Cesium.Color.CYAN,
        }),
        width: 3,
        leadTime: 3600,
        trailTime: 3600,
      },
      label: {
        text: orbitData.name,
        font: "13px monospace",
        fillColor: Cesium.Color.CYAN,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -40),
        scaleByDistance: new Cesium.NearFarScalar(5e5, 1.0, 1e7, 0.4),
      },
    });

    // Add ground track (projected orbit on surface)
    const groundPositions = orbitData.positions.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, 0)
    );
    viewer.entities.add({
      name: `${orbitData.name} ground track`,
      polyline: {
        positions: groundPositions,
        width: 1.5,
        material: Cesium.Color.YELLOW.withAlpha(0.4),
        clampToGround: true,
      },
    });

    viewer.trackedEntity = satEntity;
  }

  async function selectSatellite(identifier) {
    setError("");
    setLoading(true);
    try {
      const [position, orbit] = await Promise.all([
        getSatellitePosition(identifier),
        getSatelliteOrbit(identifier),
      ]);
      setSelected(position);
      setAnswer("");
      renderOrbit(orbit);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitQuery(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await askAgent(query);
      setAnswer(response.answer);
      if (response.satellite) {
        setSelected(response.satellite);
        const orbit = await getSatelliteOrbit(response.satellite.norad_id);
        renderOrbit(orbit);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
          <Button title="Ask satellite agent" type="submit" disabled={loading}>
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

// Generate a satellite icon on a canvas (body + solar panels)
function buildSatelliteCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  // Solar panel left
  ctx.fillStyle = "#1565c0";
  ctx.fillRect(4, 24, 20, 16);
  ctx.strokeStyle = "#90caf9";
  ctx.lineWidth = 0.5;
  for (let x = 4; x < 24; x += 5) {
    ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x, 40); ctx.stroke();
  }

  // Solar panel right
  ctx.fillStyle = "#1565c0";
  ctx.fillRect(40, 24, 20, 16);
  for (let x = 40; x < 60; x += 5) {
    ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x, 40); ctx.stroke();
  }

  // Satellite body
  ctx.fillStyle = "#e0e0e0";
  ctx.fillRect(24, 20, 16, 24);
  ctx.strokeStyle = "#616161";
  ctx.strokeRect(24, 20, 16, 24);

  // Antenna
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(32, 20);
  ctx.lineTo(32, 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(32, 8, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#ff1744";
  ctx.fill();

  return canvas;
}
