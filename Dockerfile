# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory in the container
WORKDIR /code

# Install system dependencies (optional, e.g., for PostgreSQL adapter)
# RUN apt-get update && apt-get install -y netcat gcc

# Copy and install Python dependencies
COPY requirements.txt /code/
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy the current directory contents into the container at /code
COPY . /code/

# Expose port 8000 (default Django port)
EXPOSE 8000

# Start the Gunicorn server to serve your Django app
CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000"]


