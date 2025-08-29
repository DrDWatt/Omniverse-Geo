/**
 * Satellite-Orbit Visualization
 * A 3D visualization of Earth with a satellite in orbit
 */

// Main App component
const App = () => {
    // State for orbit data and animation control
    const [orbitData, setOrbitData] = React.useState(null);
    const [isPlaying, setIsPlaying] = React.useState(true);
    const [currentFrame, setCurrentFrame] = React.useState(0);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [showLabels, setShowLabels] = React.useState(true);
    const [selectedObject, setSelectedObject] = React.useState('all');
    const [enableZoom, setEnableZoom] = React.useState(true);
    
    // Reference to the container for Three.js scene
    const containerRef = React.useRef(null);
    
    // Scene setup state
    const sceneRef = React.useRef({
        scene: null,
        camera: null,
        renderer: null,
        earth: null,
        satellite: null,
        hubble: null,
        iss: null,
        orbitLines: {},
        labels: {},
        animationId: null
    });
    
    // Fetch orbit data from API
    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/orbit-data');
                if (!response.ok) {
                    throw new Error('Failed to fetch orbit data');
                }
                const data = await response.json();
                setOrbitData(data);
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };
        
        fetchData();
    }, []);
    
    // Set up Three.js scene
    React.useEffect(() => {
        if (!orbitData || !containerRef.current) return;
        
        const container = containerRef.current;
        const { scene, camera, renderer } = setupScene(container);
        
        // Create Earth
        const earth = createEarth(orbitData.earth.radius / 1000);
        scene.add(earth);
        
        // Create Satellite
        const satellite = createSatellite();
        scene.add(satellite);
        
        // Create Hubble Space Telescope
        const hubble = createHubbleTelescope();
        scene.add(hubble);
        
        // Create International Space Station
        const iss = createISS();
        scene.add(iss);
        
        // Create orbit paths
        const orbitLines = {
            satellite: createOrbitPath(orbitData.satellite.positions, 0x66ccff),
            hubble: createOrbitPath(orbitData.hubble.positions, 0x00ff00),
            iss: createOrbitPath(orbitData.iss.positions, 0xff9900)
        };
        
        // Add all orbit lines to scene
        Object.values(orbitLines).forEach(line => scene.add(line));
        
        // Create text labels
        const createLabel = (text, size, color) => {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            // Draw background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.roundRect(0, 0, canvas.width, canvas.height / 2, 10);
            ctx.fill();
            
            // Draw text
            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, canvas.width / 2, canvas.height / 4);
            
            const texture = new THREE.CanvasTexture(canvas);
            
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true
            });
            
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(size, size / 2, 1);
            
            return sprite;
        };
        
        // Create labels for spacecraft
        const labels = {
            satellite: createLabel('Satellite', 0.5, '#66ccff'),
            hubble: createLabel('Hubble Telescope', 0.5, '#00ff00'),
            iss: createLabel('ISS', 0.5, '#ff9900')
        };
        
        // Add labels to scene
        Object.values(labels).forEach(label => scene.add(label));
        
        // Store references
        sceneRef.current = {
            scene,
            camera,
            renderer,
            earth,
            satellite,
            hubble,
            iss,
            orbitLines,
            labels,
            animationId: null
        };
        
        // Handle window resize
        const handleResize = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            
            renderer.setSize(width, height);
        };
        
        window.addEventListener('resize', handleResize);
        
        // Add zoom controls with mouse wheel
        const handleMouseWheel = (event) => {
            // Only enable zoom when paused or when enableZoom is true
            if (!isPlaying || enableZoom) {
                // Adjust camera position based on scroll direction
                const zoomSpeed = 0.1;
                const delta = Math.sign(event.deltaY) * zoomSpeed;
                
                // Calculate new distance from target (keeping direction the same)
                const distance = camera.position.length();
                const newDistance = Math.max(2, Math.min(distance + delta, 30));
                
                // Normalize current position and scale to new distance
                camera.position.normalize().multiplyScalar(newDistance);
                
                // Update camera
                camera.lookAt(0, 0, 0);
            }
        };
        
        container.addEventListener('wheel', handleMouseWheel);
        
        // Cleanup function
        return () => {
            window.removeEventListener('resize', handleResize);
            container.removeEventListener('wheel', handleMouseWheel);
            if (sceneRef.current.animationId) {
                cancelAnimationFrame(sceneRef.current.animationId);
            }
            if (container && renderer) {
                container.removeChild(renderer.domElement);
            }
        };
    }, [orbitData, isPlaying, enableZoom]);
    
    // Animation loop
    React.useEffect(() => {
        if (!orbitData || !sceneRef.current.renderer) return;
        
        const animate = () => {
            if (isPlaying) {
                setCurrentFrame(prev => (prev + 1) % orbitData.metadata.frames);
            }
            
            const { scene, camera, renderer, earth, satellite, hubble, iss, labels } = sceneRef.current;
            
            // Update satellite position
            if (satellite && orbitData.satellite.positions[currentFrame]) {
                const [x, y, z] = orbitData.satellite.positions[currentFrame];
                satellite.position.set(x / 1000, y / 1000, z / 1000);
                
                // Update label position if it exists
                if (labels.satellite) {
                    labels.satellite.position.set(x / 1000, y / 1000 + 0.15, z / 1000);
                    // Make label face the camera
                    labels.satellite.lookAt(camera.position);
                }
            }
            
            // Update Hubble position
            if (hubble && orbitData.hubble?.positions[currentFrame]) {
                const [x, y, z] = orbitData.hubble.positions[currentFrame];
                hubble.position.set(x / 1000, y / 1000, z / 1000);
                
                // Rotate Hubble to point somewhat toward Earth with a slight angle
                hubble.lookAt(0, 0, 0);
                hubble.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 6);
                
                // Update label position
                if (labels.hubble) {
                    labels.hubble.position.set(x / 1000, y / 1000 + 0.15, z / 1000);
                    labels.hubble.lookAt(camera.position);
                }
            }
            
            // Update ISS position
            if (iss && orbitData.iss?.positions[currentFrame]) {
                const [x, y, z] = orbitData.iss.positions[currentFrame];
                iss.position.set(x / 1000, y / 1000, z / 1000);
                
                // Rotate ISS to maintain its solar panels pointed toward the sun
                iss.lookAt(0, 0, 0);
                iss.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI / 2);
                
                // Update label position
                if (labels.iss) {
                    labels.iss.position.set(x / 1000, y / 1000 + 0.12, z / 1000);
                    labels.iss.lookAt(camera.position);
                }
            }
            
            // Update label visibility
            Object.values(labels).forEach(label => {
                if (label) label.visible = showLabels;
            });
            
            // Rotate Earth
            if (earth) {
                earth.rotation.y += 0.002;
            }
            
            renderer.render(scene, camera);
            sceneRef.current.animationId = requestAnimationFrame(animate);
        };
        
        sceneRef.current.animationId = requestAnimationFrame(animate);
        
        return () => {
            if (sceneRef.current.animationId) {
                cancelAnimationFrame(sceneRef.current.animationId);
            }
        };
    }, [orbitData, isPlaying, currentFrame, showLabels]);
    
    // Toggle play/pause
    const togglePlayPause = () => {
        setIsPlaying(!isPlaying);
    };
    
    // Reset animation
    const resetAnimation = () => {
        setCurrentFrame(0);
        if (!isPlaying) {
            setIsPlaying(true);
        }
    };

    // Toggle zoom functionality
    const toggleZoom = () => {
        setEnableZoom(!enableZoom);
    };
    
    // Select object to focus
    const selectObject = (object) => {
        setSelectedObject(object);
    };
    
    // Get object info based on selection
    const getObjectInfo = () => {
        if (!orbitData) return null;
        
        if (selectedObject === 'satellite') {
            const altitude = orbitData.satellite.positions[0][0] - orbitData.earth.radius;
            return {
                name: "Generic Satellite",
                altitude: `${Math.round(altitude)} km`,
                orbit_type: "Circular",
                period: `${Math.round(orbitData.metadata.duration * 60)} minutes`,
                info: "Standard observation satellite in circular orbit"
            };
        } else if (selectedObject === 'hubble') {
            return {
                name: orbitData.hubble.info.name,
                altitude: `${orbitData.hubble.info.orbit_height} km`,
                launch: orbitData.hubble.info.launch_date,
                mass: `${orbitData.hubble.info.mass} kg`,
                orbit_type: "Elliptical, inclined",
                period: `96 minutes`,
                info: "Space telescope launched in 1990, observing in the near ultraviolet, visible, and near infrared"
            };
        } else if (selectedObject === 'iss') {
            return {
                name: orbitData.iss.info.name,
                altitude: `${orbitData.iss.info.orbit_height} km`,
                launch: orbitData.iss.info.launch_date,
                mass: `${orbitData.iss.info.mass} kg`,
                orbit_type: "Low Earth Orbit, inclined 51.6°",
                period: `93 minutes`,
                info: "Modular space station in low Earth orbit, continuously inhabited since November 2000"
            };
        }
        return null;
    };
    
    // Setup Three.js scene
    const setupScene = (container) => {
        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000510);
        
        // Create camera
        const camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        camera.position.set(0, 5, 15);
        camera.lookAt(0, 0, 0);
        
        // Create renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x333333);
        scene.add(ambientLight);
        
        // Add directional light (sunlight)
        const sunLight = new THREE.DirectionalLight(0xffffff, 1);
        sunLight.position.set(5, 3, 5);
        scene.add(sunLight);
        
        return { scene, camera, renderer };
    };
    
    // Create Earth sphere
    const createEarth = (radius) => {
        const geometry = new THREE.SphereGeometry(radius, 64, 64);
        
        // Create enhanced Earth texture procedurally
        const earthTexture = createEnhancedEarthTexture();
        const bumpMapTexture = createBumpMapTexture();
        const specularMapTexture = createSpecularMapTexture();
        const cloudsTexture = createCloudsTexture();
        
        // Create material with multiple textures for realism
        const material = new THREE.MeshPhongMaterial({
            map: earthTexture,
            bumpMap: bumpMapTexture,
            bumpScale: 0.05,
            specularMap: specularMapTexture,
            specular: new THREE.Color(0x333333),
            shininess: 15,
        });
        
        const earth = new THREE.Mesh(geometry, material);
        
        // Add clouds layer
        const cloudGeometry = new THREE.SphereGeometry(radius * 1.01, 64, 64);
        const cloudMaterial = new THREE.MeshPhongMaterial({
            map: cloudsTexture,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
        });
        
        const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        earth.add(clouds);
        
        // Add atmospheric glow
        const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.05, 64, 64);
        const atmosphereMaterial = new THREE.MeshPhongMaterial({
            color: 0x93cfef,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide,
        });
        
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        earth.add(atmosphere);
        
        return earth;
    };
    
    // Create enhanced Earth texture with more realistic continents and oceans
    const createEnhancedEarthTexture = () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 2048;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');
            
            // Create gradient for oceans - deep to shallow
            const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            oceanGradient.addColorStop(0, '#0A3C5F'); // Deep ocean
            oceanGradient.addColorStop(0.5, '#1A5D8F'); // Medium depth
            oceanGradient.addColorStop(1, '#2A7DBF'); // Shallow water
            
            // Fill ocean background with gradient
            ctx.fillStyle = oceanGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Earth continents with more realistic coloring
            const drawContinent = (points, baseColor) => {
                ctx.beginPath();
                ctx.moveTo(points[0][0], points[0][1]);
                
                // Create continent shape following points
                for (let i = 1; i < points.length; i++) {
                    const [x, y] = points[i];
                    ctx.lineTo(x, y);
                }
                
                ctx.closePath();
                
                // Create gradient for landmass
                const landGradient = ctx.createRadialGradient(
                    canvas.width/2, canvas.height/2, 100,
                    canvas.width/2, canvas.height/2, canvas.width/2
                );
                landGradient.addColorStop(0, baseColor);
                landGradient.addColorStop(1, darkenColor(baseColor, 20));
                
                ctx.fillStyle = landGradient;
                ctx.fill();
            };
            
            // Helper to darken colors
            const darkenColor = (hex, percent) => {
                // Parse the hex color
                let r = parseInt(hex.substr(1, 2), 16);
                let g = parseInt(hex.substr(3, 2), 16);
                let b = parseInt(hex.substr(5, 2), 16);
                
                // Darken by percentage
                r = Math.floor(r * (100 - percent) / 100);
                g = Math.floor(g * (100 - percent) / 100);
                b = Math.floor(b * (100 - percent) / 100);
                
                // Convert back to hex
                return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            };
            
            // North America - more detailed shape
            drawContinent([
                [300, 150], [500, 150], [550, 200], [500, 350], 
                [450, 400], [350, 400], [250, 350], [200, 300], [250, 200]
            ], '#4C7A3F'); // Forested green
            
            // South America
            drawContinent([
                [400, 450], [450, 450], [500, 550], [450, 650], 
                [350, 700], [300, 650], [350, 500]
            ], '#6D8C4C'); // Tropical green
            
            // Europe
            drawContinent([
                [650, 150], [800, 150], [850, 200], [800, 300], 
                [700, 350], [650, 300], [600, 200]
            ], '#5E7A42'); // European green
            
            // Africa
            drawContinent([
                [650, 350], [800, 350], [850, 500], [750, 650], 
                [600, 650], [550, 500], [600, 400]
            ], '#AE9B4F'); // Desert tan
            
            // Asia
            drawContinent([
                [850, 150], [1200, 150], [1300, 300], [1200, 450], 
                [1000, 500], [900, 400], [850, 300]
            ], '#8A9F5D'); // Mixed terrain
            
            // Australia
            drawContinent([
                [1100, 550], [1250, 550], [1300, 650], [1200, 700], 
                [1100, 700], [1050, 650]
            ], '#CB8B54'); // Outback orange
            
            // Antarctica
            drawContinent([
                [300, 800], [500, 800], [700, 850], [900, 850], 
                [1100, 800], [1300, 800], [1500, 850], [1700, 800],
                [1700, 1000], [100, 1000], [100, 850]
            ], '#FFFFFF'); // Snow white
            
            // Add randomized noise for texture
            for (let i = 0; i < 15000; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const radius = Math.random() * 2 + 1;
                
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.03})`;
                ctx.fill();
            }
            
            // Create a polar ice cap effect
            const polarGradient = ctx.createRadialGradient(
                canvas.width/2, 0, 50,
                canvas.width/2, 0, 300
            );
            polarGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
            polarGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = polarGradient;
            ctx.fillRect(0, 0, canvas.width, 200);
            
            // South polar cap
            const southPolarGradient = ctx.createRadialGradient(
                canvas.width/2, canvas.height, 50,
                canvas.width/2, canvas.height, 300
            );
            southPolarGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
            southPolarGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = southPolarGradient;
            ctx.fillRect(0, canvas.height - 200, canvas.width, 200);
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
        } catch (err) {
            console.error('Error creating Earth texture:', err);
            return null;
        }
    };
    
    // Create a simple bump map texture for terrain elevation
    const createBumpMapTexture = () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            
            // Black background (low elevation - oceans)
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw mountain ranges with grayscale (higher elevation = brighter)
            const drawMountainRange = (x, y, width, height, intensity) => {
                const mtnGradient = ctx.createRadialGradient(
                    x, y, 5,
                    x, y, width/2
                );
                
                mtnGradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
                mtnGradient.addColorStop(1, 'rgba(100, 100, 100, 0)');
                
                ctx.fillStyle = mtnGradient;
                ctx.fillRect(x - width/2, y - height/2, width, height);
            };
            
            // Add various mountain ranges
            // Himalayas
            drawMountainRange(900, 300, 200, 100, 1.0);
            
            // Andes
            drawMountainRange(400, 550, 100, 300, 0.9);
            
            // Rockies
            drawMountainRange(300, 250, 150, 200, 0.8);
            
            // Alps
            drawMountainRange(700, 220, 100, 50, 0.7);
            
            // Add random noise for more natural texture
            for (let i = 0; i < 50000; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const radius = Math.random() * 3 + 1;
                const intensity = Math.random() * 0.2;
                
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
                ctx.fill();
            }
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
        } catch (err) {
            console.error('Error creating bump map texture:', err);
            return null;
        }
    };
    
    // Create a specular map texture for water reflections
    const createSpecularMapTexture = () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            
            // Draw ocean areas as bright (reflective)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // North America - less reflective
            ctx.fillStyle = '#111111';
            ctx.beginPath();
            ctx.ellipse(350, 250, 150, 120, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // South America
            ctx.beginPath();
            ctx.ellipse(400, 550, 100, 150, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Europe/Asia
            ctx.beginPath();
            ctx.ellipse(800, 250, 300, 200, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Africa
            ctx.beginPath();
            ctx.ellipse(700, 450, 150, 200, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Australia
            ctx.beginPath();
            ctx.ellipse(1150, 600, 100, 80, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Antarctica
            ctx.beginPath();
            ctx.ellipse(512, 900, 400, 100, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
        } catch (err) {
            console.error('Error creating specular map texture:', err);
            return null;
        }
    };
    
    // Create cloud texture
    const createCloudsTexture = () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            
            // Make transparent background
            ctx.fillStyle = 'rgba(0,0,0,0)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add cloud formations
            const drawCloud = (x, y, size, opacity) => {
                const gradient = ctx.createRadialGradient(
                    x, y, size * 0.2,
                    x, y, size
                );
                
                gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            };
            
            // Create larger cloud systems
            const cloudSystems = [
                // Intertropical Convergence Zone - equatorial clouds
                { x: 512, y: 256, width: 800, height: 100, count: 50 },
                
                // Northern hemisphere weather systems
                { x: 400, y: 150, width: 300, height: 150, count: 30 },
                { x: 800, y: 180, width: 400, height: 100, count: 40 },
                
                // Southern hemisphere systems
                { x: 300, y: 350, width: 200, height: 150, count: 25 },
                { x: 700, y: 400, width: 350, height: 120, count: 35 }
            ];
            
            // Draw cloud systems
            cloudSystems.forEach(system => {
                for (let i = 0; i < system.count; i++) {
                    const x = system.x + (Math.random() - 0.5) * system.width;
                    const y = system.y + (Math.random() - 0.5) * system.height;
                    const size = Math.random() * 50 + 20;
                    const opacity = Math.random() * 0.5 + 0.3;
                    
                    drawCloud(x, y, size, opacity);
                }
            });
            
            // Add some random small clouds throughout
            for (let i = 0; i < 200; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = Math.random() * 30 + 10;
                const opacity = Math.random() * 0.3 + 0.2;
                
                drawCloud(x, y, size, opacity);
            }
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
        } catch (err) {
            console.error('Error creating clouds texture:', err);
            return null;
        }
    };
    
    // Create satellite model
    const createSatellite = () => {
        // Create satellite body
        const bodyGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.2);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xbbbbbb });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        
        // Create solar panels
        const panelGeometry = new THREE.BoxGeometry(0.5, 0.01, 0.2);
        const panelMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2244ff,
            emissive: 0x112244,
            shininess: 100
        });
        
        const leftPanel = new THREE.Mesh(panelGeometry, panelMaterial);
        leftPanel.position.set(-0.25, 0, 0);
        
        const rightPanel = new THREE.Mesh(panelGeometry, panelMaterial);
        rightPanel.position.set(0.25, 0, 0);
        
        // Create satellite group
        const satellite = new THREE.Group();
        satellite.add(body);
        satellite.add(leftPanel);
        satellite.add(rightPanel);
        
        return satellite;
    };
    
    // Create Hubble Space Telescope model
    const createHubbleTelescope = () => {
        // Create a group for all telescope parts
        const hubble = new THREE.Group();
        
        // Main telescope body (cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 16);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xdddddd,
            shininess: 80
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        
        // Rotate to horizontal
        body.rotation.z = Math.PI / 2;
        hubble.add(body);
        
        // Solar panels (two blue rectangles)
        const panelGeometry = new THREE.BoxGeometry(0.5, 0.2, 0.01);
        const panelMaterial = new THREE.MeshPhongMaterial({
            color: 0x3355bb,
            shininess: 80,
            emissive: 0x112244
        });
        
        const leftPanel = new THREE.Mesh(panelGeometry, panelMaterial);
        leftPanel.position.set(0, 0.15, 0);
        hubble.add(leftPanel);
        
        const rightPanel = new THREE.Mesh(panelGeometry, panelMaterial);
        rightPanel.position.set(0, -0.15, 0);
        hubble.add(rightPanel);
        
        // Hubble's distinctive telescope aperture
        const apertureGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 16);
        const apertureMaterial = new THREE.MeshPhongMaterial({
            color: 0x222222
        });
        const aperture = new THREE.Mesh(apertureGeometry, apertureMaterial);
        aperture.position.set(0.25, 0, 0);
        aperture.rotation.z = Math.PI / 2;
        hubble.add(aperture);
        
        // Communication dish
        const dishGeometry = new THREE.SphereGeometry(0.07, 8, 4, 0, Math.PI);
        const dishMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });
        const dish = new THREE.Mesh(dishGeometry, dishMaterial);
        dish.position.set(-0.2, 0, 0.1);
        dish.rotation.x = Math.PI / 2;
        hubble.add(dish);
        
        // Scale the entire model
        hubble.scale.set(0.25, 0.25, 0.25);
        
        return hubble;
    };
    
    // Create International Space Station model
    const createISS = () => {
        // Create a group for the ISS parts
        const iss = new THREE.Group();
        
        // Main truss (central body)
        const trussGeometry = new THREE.BoxGeometry(0.8, 0.05, 0.05);
        const trussMaterial = new THREE.MeshPhongMaterial({
            color: 0xaaaaaa,
            shininess: 80
        });
        const mainTruss = new THREE.Mesh(trussGeometry, trussMaterial);
        iss.add(mainTruss);
        
        // Habitat modules (several connected cylindrical segments)
        const moduleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 16);
        const moduleMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            shininess: 100
        });
        
        // Create central habitat module cluster
        const centerModule = new THREE.Mesh(moduleGeometry, moduleMaterial);
        centerModule.rotation.z = Math.PI / 2;
        iss.add(centerModule);
        
        // Add additional modules
        const rightModule = new THREE.Mesh(moduleGeometry, moduleMaterial);
        rightModule.position.set(0.15, 0, 0);
        rightModule.rotation.z = Math.PI / 2;
        iss.add(rightModule);
        
        const leftModule = new THREE.Mesh(moduleGeometry, moduleMaterial);
        leftModule.position.set(-0.15, 0, 0);
        leftModule.rotation.z = Math.PI / 2;
        iss.add(leftModule);
        
        // Solar panel arrays (4 panels, 2 on each side)
        const panelGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.01);
        const panelMaterial = new THREE.MeshPhongMaterial({
            color: 0x2255aa,
            shininess: 80,
            emissive: 0x112244
        });
        
        // Right solar panels
        const rightPanelTop = new THREE.Mesh(panelGeometry, panelMaterial);
        rightPanelTop.position.set(0.4, 0.2, 0);
        iss.add(rightPanelTop);
        
        const rightPanelBottom = new THREE.Mesh(panelGeometry, panelMaterial);
        rightPanelBottom.position.set(0.4, -0.2, 0);
        iss.add(rightPanelBottom);
        
        // Left solar panels
        const leftPanelTop = new THREE.Mesh(panelGeometry, panelMaterial);
        leftPanelTop.position.set(-0.4, 0.2, 0);
        iss.add(leftPanelTop);
        
        const leftPanelBottom = new THREE.Mesh(panelGeometry, panelMaterial);
        leftPanelBottom.position.set(-0.4, -0.2, 0);
        iss.add(leftPanelBottom);
        
        // Radiator panels
        const radiatorGeometry = new THREE.BoxGeometry(0.3, 0.15, 0.01);
        const radiatorMaterial = new THREE.MeshPhongMaterial({
            color: 0x888888,
            shininess: 100
        });
        
        const radiatorRight = new THREE.Mesh(radiatorGeometry, radiatorMaterial);
        radiatorRight.position.set(0.2, 0, 0.1);
        radiatorRight.rotation.x = Math.PI / 2;
        iss.add(radiatorRight);
        
        const radiatorLeft = new THREE.Mesh(radiatorGeometry, radiatorMaterial);
        radiatorLeft.position.set(-0.2, 0, 0.1);
        radiatorLeft.rotation.x = Math.PI / 2;
        iss.add(radiatorLeft);
        
        // Scale the entire model
        iss.scale.set(0.3, 0.3, 0.3);
        
        return iss;
    };
    
    // Create orbit path visualization with customizable color
    const createOrbitPath = (positions, color = 0x66ccff) => {
        if (!positions || positions.length === 0) return null;
        
        const points = positions.map(([x, y, z]) => 
            new THREE.Vector3(x / 1000, y / 1000, z / 1000)
        );
        
        const curve = new THREE.CatmullRomCurve3(points, true);
        const geometry = new THREE.BufferGeometry().setFromPoints(
            curve.getPoints(positions.length * 2)
        );
        
        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5
        });
        
        return new THREE.Line(geometry, material);
    };
    
    // Render UI
    return (
        <div className="flex flex-col min-h-screen">
            <header className="bg-slate-800 p-4 shadow-lg">
                <div className="container mx-auto flex items-center">
                    <img 
                        src="/static/images/AG new logo.png" 
                        alt="Aperio Global" 
                        className="h-10 mr-4"
                    />
                    <div>
                        <h1 className="text-2xl font-bold">NVIDIA Omniverse "Satellite-Orbit" PoC</h1>
                        <p className="text-slate-300">3D visualization of Earth with orbiting spacecraft</p>
                    </div>
                </div>
            </header>
            
            <main className="flex-grow container mx-auto p-4 flex flex-col lg:flex-row gap-6">
                {loading ? (
                    <div className="flex-grow flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                            <p className="mt-4">Loading orbit data...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex-grow flex items-center justify-center">
                        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6 max-w-md">
                            <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Data</h2>
                            <p>{error}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* 3D Visualization Container */}
                        <div 
                            ref={containerRef} 
                            className="flex-grow bg-slate-950 rounded-lg shadow-xl min-h-[400px] overflow-hidden relative"
                        >
                            {/* Zoom Info Overlay */}
                            {!isPlaying && (
                                <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-md text-sm">
                                    <p>Paused - Use mouse wheel to zoom</p>
                                </div>
                            )}
                            
                            {/* Object Selection Tabs */}
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1 bg-black/40 rounded-lg p-1">
                                <button 
                                    onClick={() => selectObject('all')}
                                    className={`px-3 py-1 rounded-md text-sm transition-colors ${selectedObject === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800'}`}
                                >
                                    All Objects
                                </button>
                                <button 
                                    onClick={() => selectObject('satellite')}
                                    className={`px-3 py-1 rounded-md text-sm transition-colors ${selectedObject === 'satellite' ? 'bg-blue-700 text-white' : 'bg-blue-900/40 text-slate-300 hover:bg-blue-800'}`}
                                >
                                    Satellite
                                </button>
                                <button 
                                    onClick={() => selectObject('hubble')}
                                    className={`px-3 py-1 rounded-md text-sm transition-colors ${selectedObject === 'hubble' ? 'bg-green-700 text-white' : 'bg-green-900/40 text-slate-300 hover:bg-green-800'}`}
                                >
                                    Hubble
                                </button>
                                <button 
                                    onClick={() => selectObject('iss')}
                                    className={`px-3 py-1 rounded-md text-sm transition-colors ${selectedObject === 'iss' ? 'bg-orange-700 text-white' : 'bg-orange-900/40 text-slate-300 hover:bg-orange-800'}`}
                                >
                                    ISS
                                </button>
                            </div>
                        </div>
                        
                        {/* Controls and Info */}
                        <div className="lg:w-80 space-y-4">
                            <div className="bg-slate-800/50 rounded-lg p-4">
                                <h2 className="text-xl font-bold mb-3">Orbit Controls</h2>
                                <div className="flex gap-2 mb-3">
                                    <button 
                                        onClick={togglePlayPause}
                                        className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                                    >
                                        {isPlaying ? 'Pause' : 'Play'}
                                    </button>
                                    <button 
                                        onClick={resetAnimation}
                                        className="flex-1 py-2 px-4 bg-slate-600 hover:bg-slate-700 rounded-md transition-colors"
                                    >
                                        Reset
                                    </button>
                                </div>
                                
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm text-slate-300 flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={showLabels} 
                                            onChange={() => setShowLabels(!showLabels)}
                                            className="mr-2"
                                        />
                                        Show Labels
                                    </label>
                                    <label className="text-sm text-slate-300 flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={enableZoom} 
                                            onChange={toggleZoom}
                                            className="mr-2"
                                        />
                                        Enable Zoom
                                    </label>
                                </div>
                                
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">
                                        Frame: {currentFrame} / {orbitData?.metadata.frames - 1}
                                    </label>
                                    <input 
                                        type="range"
                                        min="0"
                                        max={orbitData?.metadata.frames - 1 || 100}
                                        value={currentFrame}
                                        onChange={(e) => setCurrentFrame(Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            
                            {/* Object Information Panel */}
                            <div className="bg-slate-800/50 rounded-lg p-4">
                                <h2 className="text-xl font-bold mb-3">
                                    {selectedObject === 'all' ? 'Orbit Information' : getObjectInfo()?.name}
                                </h2>
                                
                                {selectedObject === 'all' ? (
                                    <div className="space-y-4">
                                        {/* Satellite info card */}
                                        <div className="bg-blue-900/30 border border-blue-500/20 rounded-md p-3">
                                            <h3 className="font-bold text-blue-300">Generic Satellite</h3>
                                            <div className="grid grid-cols-2 gap-1 text-sm mt-2">
                                                <div className="text-slate-400">Altitude:</div>
                                                <div>{Math.round(orbitData.satellite.positions[0][0] - orbitData.earth.radius)} km</div>
                                                <div className="text-slate-400">Orbit Type:</div>
                                                <div>Circular</div>
                                            </div>
                                        </div>
                                        
                                        {/* Hubble info card */}
                                        <div className="bg-green-900/30 border border-green-500/20 rounded-md p-3">
                                            <h3 className="font-bold text-green-300">{orbitData.hubble.info.name}</h3>
                                            <div className="grid grid-cols-2 gap-1 text-sm mt-2">
                                                <div className="text-slate-400">Altitude:</div>
                                                <div>{orbitData.hubble.info.orbit_height} km</div>
                                                <div className="text-slate-400">Launch:</div>
                                                <div>{orbitData.hubble.info.launch_date}</div>
                                            </div>
                                        </div>
                                        
                                        {/* ISS info card */}
                                        <div className="bg-orange-900/30 border border-orange-500/20 rounded-md p-3">
                                            <h3 className="font-bold text-orange-300">{orbitData.iss.info.name}</h3>
                                            <div className="grid grid-cols-2 gap-1 text-sm mt-2">
                                                <div className="text-slate-400">Altitude:</div>
                                                <div>{orbitData.iss.info.orbit_height} km</div>
                                                <div className="text-slate-400">Launch:</div>
                                                <div>{orbitData.iss.info.launch_date}</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {/* Selected object detailed info */}
                                        <div className={`border rounded-md p-3 ${
                                            selectedObject === 'satellite' ? 'bg-blue-900/30 border-blue-500/20' :
                                            selectedObject === 'hubble' ? 'bg-green-900/30 border-green-500/20' :
                                            'bg-orange-900/30 border-orange-500/20'
                                        }`}>
                                            <table className="w-full text-sm">
                                                <tbody>
                                                    {Object.entries(getObjectInfo() || {}).map(([key, value], index) => (
                                                        key !== 'name' && (
                                                            <tr key={index}>
                                                                <td className="text-slate-300 pr-2 py-1 align-top capitalize">{key}:</td>
                                                                <td className="py-1 align-top">{value}</td>
                                                            </tr>
                                                        )
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Earth Information */}
                            <div className="bg-slate-800/50 rounded-lg p-4">
                                <h2 className="text-xl font-bold mb-3">Earth</h2>
                                <table className="w-full text-sm">
                                    <tbody>
                                        <tr>
                                            <td className="text-slate-400">Radius:</td>
                                            <td>{orbitData?.earth.radius.toLocaleString()} km</td>
                                        </tr>
                                        <tr>
                                            <td className="text-slate-400">Rotation:</td>
                                            <td>24 hours / 1 day</td>
                                        </tr>
                                        <tr>
                                            <td className="text-slate-400">Surface:</td>
                                            <td>70% water, 30% land</td>
                                        </tr>
                                        <tr>
                                            <td className="text-slate-400">Atmosphere:</td>
                                            <td>78% nitrogen, 21% oxygen</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </main>
            
            <footer className="bg-slate-800 p-4 mt-auto">
                <div className="container mx-auto text-center text-sm text-slate-400">
                    <p>Simplified Docker-on-M1 Implementation for NVIDIA Omniverse</p>
                </div>
            </footer>
        </div>
    );
};

// Render the app
const rootElement = document.getElementById('app');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
