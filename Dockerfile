FROM --platform=linux/amd64 nvcr.io/nvidia/omniverse/kit-kernel:106.5.0

# Set up working directory
WORKDIR /workspace

# Copy project files
COPY autoplay.py create_scene.py /workspace/

# Set environment variables for Mac M1 compatibility
ENV DISPLAY=:0
ENV QT_X11_NO_MITSHM=1
ENV XAUTHORITY=/tmp/.docker.xauth

# Default command (can be overridden)
ENTRYPOINT ["/opt/nvidia/omniverse/kit-kernel/startup_nogpu.sh"]
