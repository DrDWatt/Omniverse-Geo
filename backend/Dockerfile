FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

COPY requirements.txt /app/requirements.txt
RUN pip3 install --no-cache-dir -r /app/requirements.txt

COPY . /app

EXPOSE 19011
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "19011"]
