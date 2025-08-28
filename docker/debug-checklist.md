# Docker Infrastructure Debug Checklist

## 🔍 Quick Checks

### 1. Docker Daemon
```bash
docker version
docker info | grep "Server Version"
```

### 2. Directory Permissions
```bash
# Check volume directories exist and are writable
ls -la docker/volumes/
ls -la docker/volumes/communication/

# Fix permissions if needed
chmod -R 755 docker/volumes/
```

### 3. Check Resource Limits
```bash
# Check Docker resources
docker system df
docker stats --no-stream

# Check available disk space
df -h /var/lib/docker
```

### 4. Container Logs Analysis
```bash
# Get exit codes
docker ps -a --filter "status=exited" --format "table {{.Names}}\t{{.Status}}"

# Check last 50 lines of each container
for container in $(docker ps -aq --filter "name=agent"); do
  echo "=== $container ==="
  docker logs --tail 50 $container
done
```

### 5. Network Issues
```bash
# Check Docker networks
docker network ls
docker network inspect bridge

# Check port bindings
docker ps --format "table {{.Names}}\t{{.Ports}}"
netstat -an | grep 3001
```

## 🐛 Common Problems & Solutions

### Problem: Container exits immediately
**Check**: Entry point and command
```bash
docker inspect <container> | grep -A5 "Cmd\|Entrypoint"
```

### Problem: Permission denied errors
**Fix**: User/permission issues
```bash
# Run as root temporarily to debug
docker compose -f docker-compose-phase1.yml run --rm --user root role-services-agent bash
```

### Problem: Cannot find claude-code
**Fix**: The mock claude-code needs to be in PATH
```bash
docker compose run --rm role-services-agent which claude-code
docker compose run --rm role-services-agent ls -la /usr/local/bin/
```

### Problem: Volumes not mounting
**Check**: Volume paths
```bash
docker inspect <container> | jq '.[0].Mounts'
```

## 📝 Debug Output Commands

Collect all debug info:
```bash
# Save all container info
docker ps -a > docker-status.txt
docker compose -f docker-compose-phase1.yml logs > docker-logs.txt
docker compose -f docker-compose-phase1.yml config > docker-config.txt

# System info
docker system df >> docker-status.txt
docker version >> docker-status.txt
```