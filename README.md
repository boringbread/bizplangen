How to run

# Initial Setup
## Build the frontend assets (required for Wrangler to serve the app)
```
npm run build
```

## Start the containers
```
sudo docker compose up --build
```

# Daily Workflow
```
docker compose up
```

# Open your website here
```
http://localhost:5173/
```

# Enter Docker
```
docker compose exec backend bash
```