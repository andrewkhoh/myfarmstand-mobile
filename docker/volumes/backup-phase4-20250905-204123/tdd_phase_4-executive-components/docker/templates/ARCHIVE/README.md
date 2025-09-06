# Archived Templates

This directory contains template files that are no longer actively used but are kept for reference.

## Files

### docker-compose.template.yml
- **Status**: Not used
- **Reason**: The docker-compose.yml is dynamically generated in `bin/generate-multi-agent-project.sh` (lines 200-285) rather than using this template
- **Archived**: To reduce confusion about which files are actually used
- **Note**: The generation script builds the docker-compose.yml programmatically, allowing for dynamic agent configuration

## Active Templates

The following templates are still actively used:
- `setup-project.template.sh` - Generates setup.sh for projects
- `stop-project.template.sh` - Generates stop.sh for projects
- `entrypoint-generic.sh` - Moved to `docker/agents/` as it's not a template (no substitution needed)