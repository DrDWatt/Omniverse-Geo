import omni.kit.commands
from pxr import Gf, UsdGeom, Sdf, UsdShade
import omni.timeline
import omni.usd
import os

print("Starting scene creation...")

# Get stage interface
usd_context = omni.usd.get_context()
stage = usd_context.new_stage()
stage.SetStartTimeCode(0)
stage.SetEndTimeCode(240)

# Set up timeline
timeline = omni.timeline.get_timeline_interface()
timeline.set_start_time(0)
timeline.set_end_time(240)

# Create /World
world_prim = stage.DefinePrim("/World", "Xform")
stage.SetDefaultPrim(world_prim)

# Create Earth sphere at origin
earth_prim_path = "/World/Earth"
omni.kit.commands.execute('CreateMeshPrimWithDefaultXform',
    prim_type='Sphere',
    prim_path=earth_prim_path)

# Set Earth radius and refinement
earth_prim = stage.GetPrimAtPath(earth_prim_path)
UsdGeom.Sphere(earth_prim).CreateRadiusAttr().Set(1.0)
UsdGeom.Sphere(earth_prim).CreateAxisAttr().Set("Z")

# Create OrbitPivot at origin
orbit_pivot_path = "/World/OrbitPivot"
orbit_pivot = stage.DefinePrim(orbit_pivot_path, "Xform")

# Create Satellite cube
satellite_prim_path = "/World/OrbitPivot/Satellite"
omni.kit.commands.execute('CreateMeshPrimWithDefaultXform',
    prim_type='Cube',
    prim_path=satellite_prim_path)

# Set Satellite size and position
satellite_prim = stage.GetPrimAtPath(satellite_prim_path)
satellite_xform = UsdGeom.Xformable(satellite_prim)
op = satellite_xform.AddTranslateOp(UsdGeom.XformOp.PrecisionDouble)
op.Set(Gf.Vec3d(2.0, 0.0, 0.0))  # Position 2 units away (scaled 6800km)

scale_op = satellite_xform.AddScaleOp(UsdGeom.XformOp.PrecisionDouble)
scale_op.Set(Gf.Vec3d(0.1, 0.1, 0.1))  # Make satellite smaller than Earth

# Create animation for orbit rotation
orbit_xform = UsdGeom.Xformable(orbit_pivot)
rotate_op = orbit_xform.AddRotateYOp(UsdGeom.XformOp.PrecisionDouble)

# Set keyframes for rotation
rotate_op.Set(0.0, time=0)                     # Start at 0 degrees
rotate_op.Set(90.0, time=60)                   # 90 degrees at frame 60
rotate_op.Set(180.0, time=120)                 # 180 degrees at frame 120
rotate_op.Set(270.0, time=180)                 # 270 degrees at frame 180
rotate_op.Set(360.0, time=240)                 # Full rotation at frame 240

# Add a camera to view the scene
camera_path = "/World/Camera"
camera_prim = stage.DefinePrim(camera_path, "Camera")
camera_xform = UsdGeom.Xformable(camera_prim)
camera_xform.AddTranslateOp().Set(Gf.Vec3f(0, 2.5, 5.0))  # Position camera for good view
camera_xform.AddRotateXOp().Set(-25.0)  # Tilt down to see orbit

# Set camera as the default viewpoint
UsdGeom.Camera(camera_prim).CreateProjectionAttr().Set("perspective")
UsdGeom.Camera(camera_prim).CreateHorizontalApertureAttr().Set(24.0)
UsdGeom.Camera(camera_prim).CreateVerticalApertureAttr().Set(18.0)
UsdGeom.Camera(camera_prim).CreateFocalLengthAttr().Set(24.0)

# Add a light
light_path = "/World/Light"
light_prim = stage.DefinePrim(light_path, "DistantLight")
light_xform = UsdGeom.Xformable(light_prim)
light_xform.AddRotateXOp().Set(-45.0)
light_xform.AddRotateYOp().Set(45.0)

# Logo code removed - we'll skip the logo since AG_new_logo.png file is missing
# This simplifies the scene creation process

# Save the stage to USD file
stage.GetRootLayer().Save()
path = "/workspace/EarthOrbit.usd"
usd_context.save_as_stage(path, None)

print(f"Earth-Satellite orbit scene created successfully and saved to {path}")
print("Scene creation complete!")
