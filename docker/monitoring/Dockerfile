# Monitoring container for multi-agent orchestration
FROM node:20-bullseye

WORKDIR /app

# Install basic utilities
RUN apt-get update && apt-get install -y \
    bash \
    curl \
    jq \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI (following the same pattern as agent containers)
ARG CLAUDE_CODE_VERSION=latest
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} && \
    echo "Claude Code CLI installed successfully" || \
    (echo '#!/bin/bash\n\
echo "Claude Code Mock - Monitoring Agent"\n\
echo "WARNING: @anthropic-ai/claude-code installation failed, using mock"\n\
echo "Mock analysis result"\n\
exit 0' > /usr/local/bin/claude && \
chmod +x /usr/local/bin/claude)

# Create package.json for monitoring dependencies
RUN echo '{ \
  "name": "multi-agent-monitor", \
  "version": "1.0.0", \
  "description": "Monitoring dashboard for containerized agents", \
  "main": "dashboard.js", \
  "dependencies": { \
    "express": "^4.18.2", \
    "dockerode": "^3.3.5" \
  } \
}' > package.json

# Install dependencies
RUN npm install

# Copy dashboard file and analysis script
COPY dashboard.js /app/dashboard.js
COPY analyze-logs.sh /app/analyze-logs.sh
RUN chmod +x /app/analyze-logs.sh

# Create monitor user (following agent container pattern)
RUN useradd -m -s /bin/bash -G sudo monitor && \
    echo 'monitor ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# Set up Claude config directory
RUN mkdir -p /home/monitor/.claude && \
    chown -R monitor:monitor /app /home/monitor/.claude

USER monitor

EXPOSE 3001

CMD ["node", "dashboard.js"]