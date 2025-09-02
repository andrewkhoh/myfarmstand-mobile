# Single stage build for simplicity
FROM node:20-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    sudo \
    vim \
    bash \
    python3 \
    python3-pip \
    build-essential \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI
ARG CLAUDE_CODE_VERSION=latest
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} && \
    echo "Claude Code CLI installed successfully" || \
    (echo '#!/bin/bash\n\
echo "Claude Code Mock - Agent: $AGENT_NAME"\n\
echo "WARNING: @anthropic-ai/claude-code installation failed, using mock"\n\
echo "To use real Claude Code, ensure the package is available"\n\
while true; do\n\
  echo "$(date): Agent $AGENT_NAME is running (mock mode)..."\n\
  sleep 60;\n\
done' > /usr/local/bin/claude && \
chmod +x /usr/local/bin/claude)

# Create agent user (but allow dangerous operations via sudo)
RUN useradd -m -s /bin/bash -G sudo agent && \
    echo 'agent ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# Set up workspace and Claude config directory
WORKDIR /workspace
RUN mkdir -p /home/agent/.claude && \
    chown -R agent:agent /workspace /home/agent/.claude

# Create shared directories
RUN mkdir -p /shared /prompts && \
    chown -R agent:agent /shared /prompts

# Copy entrypoints
COPY entrypoint-generic.sh /usr/local/bin/entrypoint.sh
COPY entrypoint-enhanced.sh /usr/local/bin/entrypoint-enhanced.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/entrypoint-enhanced.sh

# Switch to agent user (dangerous permissions still available via sudo)
USER agent

# Environment setup
ENV AGENT_NAME=""
ENV AGENT_TYPE=""
ENV DEPENDS_ON=""
ENV AGENT_PROMPT_FILE=""
ENV PHASE=""
ENV CLAUDE_CONFIG_DIR="/home/agent/.claude"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD echo "Agent container healthy"

ENTRYPOINT ["/usr/local/bin/entrypoint-enhanced.sh"]
CMD ["claude", "--dangerously-skip-permissions"]