# Multi-Agent Infrastructure Refactor Plan

## 🎯 Goal: Generic, Reusable Multi-Agent Framework

Transform the current hardcoded Phase 1/Phase 2 setup into a flexible, configuration-driven multi-agent infrastructure.

## 🔍 Current Analysis

### **Hardcoded Elements Found:**
1. **Docker Compose Files**: `docker-compose-phase1.yml`, `docker-compose-phase2.yml`
2. **Entrypoint Scripts**: `entrypoint-enhanced.sh`, `phase2-entrypoint-enhanced.sh` 
3. **Agent Prompts**: `phase2-inventory-*.md`, `role-*-agent.md`
4. **Setup Scripts**: `setup-phase2-inventory.sh`, various launch scripts
5. **Volume Paths**: `phase1-role-foundation-*`, `tdd-phase-2-*`
6. **Container Names**: `inventory-schema-agent`, `role-services-agent`
7. **Network Names**: `phase1-network`, `phase2-network`

### **Reusable Infrastructure Components:**
✅ **Communication Pattern**: `/shared` volume structure
✅ **Restart Mechanism**: `restart: unless-stopped` + counter logic
✅ **Dependency Chain**: Handoff file waiting pattern
✅ **Monitoring**: Status JSON + Progress Markdown
✅ **Test-Driven Cycles**: Run tests → Fix → Repeat pattern

## 🏗️ Refactor Architecture

### **1. Project Configuration Schema**
```yaml
# multi-agent-config.yml
project:
  name: "inventory-operations"
  prefix: "tdd-phase-2"  # for container/network naming
  max_restarts: 5
  test_pass_target: 85
  monitoring_port: 3002

agents:
  - name: "schema"
    type: "foundation"
    depends_on: []
    test_command: "npm run test:schemas:inventory"
    prompt_file: "inventory-schema.md"
    
  - name: "services"
    type: "service"
    depends_on: ["schema"]
    test_command: "npm run test:services:inventory"
    prompt_file: "inventory-services.md"
    
  - name: "hooks"
    type: "hook"
    depends_on: ["services"]
    test_command: "npm run test:hooks:inventory"
    prompt_file: "inventory-hooks.md"
    
  - name: "screens"
    type: "screen"
    depends_on: ["hooks"]
    test_command: "npm run test:screens:inventory"
    prompt_file: "inventory-screens.md"
    
  - name: "integration"
    type: "integration"
    depends_on: ["schema", "services", "hooks", "screens"]
    test_command: "npm run test:integration:inventory"
    prompt_file: "inventory-integration.md"
```

### **2. Generic Infrastructure Templates**

#### **Template Files:**
- `docker/templates/docker-compose.template.yml`
- `docker/templates/entrypoint-generic.sh`
- `docker/templates/setup-multi-agent.sh`
- `docker/templates/stop-multi-agent.sh`

#### **Generator Script:**
- `bin/generate-multi-agent-project.sh [config-file]`

### **3. File Structure**
```
docker/
├── templates/           # Generic templates
│   ├── docker-compose.template.yml
│   ├── entrypoint-generic.sh
│   ├── setup-project.template.sh
│   └── stop-project.template.sh
├── agents/
│   ├── Dockerfile       # Generic agent image
│   └── prompts/         # Project-specific prompts
│       └── [project]/   # Organized by project
├── projects/            # Generated project configs
│   ├── phase1-roles/
│   │   ├── config.yml
│   │   ├── docker-compose.yml
│   │   ├── setup.sh
│   │   └── stop.sh
│   └── tdd-phase-2-inventory/
│       ├── config.yml
│       ├── docker-compose.yml
│       ├── setup.sh
│       └── stop.sh
└── monitoring/          # Shared monitoring (unchanged)
```

## 🔧 Implementation Plan

### **Phase 1: Template Creation (SAFE)**
1. ✅ Create generic templates without touching existing files
2. ✅ Test template generation with Phase 2 config
3. ✅ Verify generated files match current setup

### **Phase 2: Migration (CAREFUL)**
1. Generate configs for existing projects (Phase 1 + Phase 2)
2. Test both projects work with new generated files
3. Only after verification: rename old files to `.backup`

### **Phase 3: Enhancement**
1. Add project validation
2. Add dependency graph visualization
3. Add project switching commands

## 🚨 Non-Breaking Strategy

### **Backward Compatibility:**
1. **Keep existing files** until new system proven
2. **Generate alongside** current setup
3. **Add `.new` suffix** to generated files initially
4. **Switch only after testing**

### **Migration Path:**
```bash
# Step 1: Generate new configs
./bin/generate-multi-agent-project.sh configs/phase1-roles.yml
./bin/generate-multi-agent-project.sh configs/tdd-phase-2.yml

# Step 2: Test new setup
cd docker/projects/tdd-phase-2-inventory/
./setup.sh
docker-compose up -d
# Verify everything works...
./stop.sh

# Step 3: Only after success - retire old files
mv docker-compose-phase2.yml docker-compose-phase2.yml.backup
mv setup-phase2-inventory.sh setup-phase2-inventory.sh.backup
```

## 🎯 Benefits

### **Developer Experience:**
- ✅ New projects in 5 minutes vs hours
- ✅ Consistent patterns across all projects
- ✅ No copy-paste errors in infrastructure

### **Maintenance:**
- ✅ Single entrypoint script to maintain
- ✅ Bug fixes apply to all projects
- ✅ Infrastructure improvements benefit everything

### **Flexibility:**
- ✅ Variable number of agents
- ✅ Different dependency chains
- ✅ Configurable test commands and thresholds
- ✅ Easy A/B testing of different approaches

## 📋 Refactor Tasks

### **Immediate (Safe):**
1. Create template directory structure
2. Extract common patterns into templates
3. Build configuration schema
4. Create generator script
5. Test with Phase 2 recreation

### **After Validation:**
1. Generate configs for both Phase 1 & 2
2. Switch to generated versions
3. Archive old files
4. Update documentation

## 🔍 Risk Mitigation

### **Low Risk:**
- ✅ Template creation (no existing file changes)
- ✅ Generator script (creates new files)
- ✅ Side-by-side testing

### **Medium Risk:**
- ⚠️ Migration of existing projects (after thorough testing)

### **Zero Risk:**
- 🚫 No deletion of existing files until proven working
- 🚫 No modification of working infrastructure

This refactor transforms hardcoded project infrastructure into a reusable, configuration-driven system while maintaining 100% backward compatibility during transition.