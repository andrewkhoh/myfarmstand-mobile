const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();

const SHARED_DIR = '/shared';

// Helper to read JSON files safely
async function readJSON(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return JSON.parse(content);
    } catch (e) {
        return null;
    }
}

// Helper to get all agent statuses
async function getAgentStatuses() {
    const statusDir = path.join(SHARED_DIR, 'status');
    const agents = {};
    
    try {
        const files = await fs.readdir(statusDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const agentName = file.replace('.json', '');
                agents[agentName] = await readJSON(path.join(statusDir, file));
            }
        }
    } catch (e) {
        console.error('Error reading status files:', e);
    }
    
    return agents;
}

// Helper to get recent logs
async function getRecentLogs(agentName, lines = 50) {
    const logFile = path.join(SHARED_DIR, 'logs', `${agentName}.log`);
    try {
        const content = await fs.readFile(logFile, 'utf8');
        const allLines = content.split('\n');
        return allLines.slice(-lines).join('\n');
    } catch (e) {
        return 'No logs available yet';
    }
}

// Claude-powered log analysis using the proven working bash approach
async function analyzeAgentWork(agentName) {
    const logFile = path.join(SHARED_DIR, 'logs', `${agentName}.log`);
    
    try {
        const { exec } = require('child_process');
        
        // Use the exact bash command that we proved works manually
        const command = `tail -200 "${logFile}" | claude --dangerously-skip-permissions -p 'Analyze this agent log and return ONLY valid JSON: {"filesModified": ["filenames"], "testsPass": 0, "errors": [], "lastTool": "tool", "workSummary": "summary"}' 2>/dev/null`;
        
        return new Promise((resolve) => {
            exec(command, { timeout: 45000 }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Claude exec failed for ${agentName}:`, error.message);
                    resolve(null);
                    return;
                }
                
                try {
                    // Clean the output - remove markdown code blocks if present
                    let cleaned = stdout.trim()
                        .replace(/^```json\s*/i, '')
                        .replace(/\s*```$/i, '')
                        .replace(/^.*?(\{)/s, '$1'); // Remove any text before first {
                    
                    // Find JSON object
                    const jsonMatch = cleaned.match(/\{[^}]*\}/);
                    if (jsonMatch) {
                        const analysis = JSON.parse(jsonMatch[0]);
                        resolve(analysis);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    console.error(`JSON parse failed for ${agentName}:`, e.message);
                    resolve(null);
                }
            });
        });
        
    } catch (e) {
        console.error(`Analysis error for ${agentName}:`, e);
        return null;
    }
}

// Helper to get progress
async function getProgress(agentName) {
    const progressFile = path.join(SHARED_DIR, 'progress', `${agentName}.md`);
    try {
        return await fs.readFile(progressFile, 'utf8');
    } catch (e) {
        return 'No progress data yet';
    }
}

// Main dashboard route
app.get('/', async (req, res) => {
    const agents = await getAgentStatuses();
    const aggregateStatus = await readJSON(path.join(SHARED_DIR, 'aggregate-status.json'));
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Phase 1 Multi-Agent Monitor</title>
    <meta http-equiv="refresh" content="10">
    <style>
        body { 
            font-family: monospace; 
            background: #1a1a1a; 
            color: #0f0; 
            padding: 20px;
            margin: 0;
        }
        h1 { 
            color: #0f0; 
            border-bottom: 2px solid #0f0;
            padding-bottom: 10px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .agent-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .agent-card {
            background: #2a2a2a;
            border: 1px solid #0f0;
            border-radius: 8px;
            padding: 15px;
            position: relative;
        }
        .restart-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #333;
            color: #0ff;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            border: 1px solid #0ff;
        }
        .experiment-complete {
            border-color: #f0f !important;
            background: linear-gradient(45deg, #2a2a2a, #3a2a3a);
        }
        .experiment-summary {
            background: #1a1a1a;
            padding: 15px;
            margin: 10px 0;
            border: 2px solid #0ff;
            border-radius: 8px;
        }
        .agent-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #0ff;
        }
        .status {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            margin: 5px 0;
        }
        .status.running { background: #0a0; color: #fff; }
        .status.waiting { background: #aa0; color: #000; }
        .status.completed { background: #00a; color: #fff; }
        .status.failed { background: #a00; color: #fff; }
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #333;
            border: 1px solid #0f0;
            margin: 10px 0;
            position: relative;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #0a0, #0f0);
            transition: width 0.3s;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            padding: 3px;
            background: #1a1a1a;
        }
        .metric-label {
            color: #888;
        }
        .metric-value {
            color: #0ff;
            font-weight: bold;
        }
        .heartbeat {
            font-size: 12px;
            color: #888;
            margin-top: 10px;
        }
        .healthy { color: #0f0; }
        .stale { color: #f00; }
        .summary {
            background: #1a1a1a;
            padding: 15px;
            margin: 20px 0;
            border: 1px solid #0f0;
            border-radius: 8px;
        }
        .log-preview {
            background: #000;
            padding: 10px;
            margin-top: 10px;
            border-radius: 4px;
            font-size: 11px;
            max-height: 150px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .refresh-note {
            text-align: center;
            color: #888;
            margin-top: 20px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Phase 1 Multi-Agent Monitor</h1>
        
        <div class="summary">
            <h2>Overall Status</h2>
            <div class="metric">
                <span class="metric-label">Overall Health:</span>
                <span class="metric-value ${aggregateStatus?.overallHealth}">${aggregateStatus?.overallHealth || 'unknown'}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Overall Progress:</span>
                <span class="metric-value">${aggregateStatus?.overallProgress || 0}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${aggregateStatus?.overallProgress || 0}%"></div>
            </div>
            <div class="metric">
                <span class="metric-label">Active Agents:</span>
                <span class="metric-value">${Object.keys(agents).length}</span>
            </div>
        </div>
        
        <div class="experiment-summary">
            <h2>🔄 Self-Improvement Experiment Status</h2>
            <div class="metric">
                <span class="metric-label">Experiment Type:</span>
                <span class="metric-value">Auto-Restart Self-Improvement (Max 3 Cycles)</span>
            </div>
            <div class="metric">
                <span class="metric-label">Agents in Experiment:</span>
                <span class="metric-value">${Object.keys(agents).length}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Completed Agents:</span>
                <span class="metric-value">${
                    Object.values(agents).filter(a => a?.reason === 'max_restarts_reached').length
                }</span>
            </div>
            <div class="metric">
                <span class="metric-label">Still Iterating:</span>
                <span class="metric-value">${
                    Object.values(agents).filter(a => a?.status === 'running' || a?.status === 'active').length
                }</span>
            </div>
        </div>
        
        <div class="agent-grid">`;
    
    // Add agent cards
    for (const [name, status] of Object.entries(agents)) {
        const isHealthy = status?.heartbeat && 
            new Date() - new Date(status.heartbeat) < 120000;
        
        const isExperimentComplete = status?.reason === 'max_restarts_reached';
        const currentCycle = status?.cycles || status?.restartCycle || 'Unknown';
        const maxCycles = status?.maxRestarts || 3;
        
        html += `
            <div class="agent-card ${isExperimentComplete ? 'experiment-complete' : ''}">
                ${status?.cycles || status?.restartCycle ? 
                    `<div class="restart-badge">Cycle ${currentCycle}/${maxCycles}</div>` : ''
                }
                <div class="agent-name">${name}</div>
                <div class="status ${status?.status || 'unknown'}">${
                    isExperimentComplete ? 'experiment-complete' : (status?.status || 'unknown')
                }</div>
                
                ${isExperimentComplete ? 
                    `<div class="metric">
                        <span class="metric-label">🎯 Experiment Status:</span>
                        <span class="metric-value" style="color: #f0f">Self-Improvement Complete!</span>
                    </div>` : ''
                }
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${status?.progress || 0}%"></div>
                </div>
                
                <div class="metric">
                    <span class="metric-label">Progress:</span>
                    <span class="metric-value">${status?.progress || 0}%</span>
                </div>
                
                <div class="metric">
                    <span class="metric-label">Tests Passed:</span>
                    <span class="metric-value">${status?.testsPass || 0}</span>
                </div>
                
                <div class="metric">
                    <span class="metric-label">Files Modified:</span>
                    <span class="metric-value">${
                        Array.isArray(status?.filesModified) ? status.filesModified.length :
                        status?.filesModified || 0
                    }</span>
                </div>
                
                <div class="metric">
                    <span class="metric-label">Last Tool:</span>
                    <span class="metric-value">${status?.lastTool || 'none'}</span>
                </div>
                
                ${status?.workSummary ? 
                    `<div class="metric">
                        <span class="metric-label">Recent Work:</span>
                        <span class="metric-value">${status.workSummary}</span>
                    </div>` : ''
                }
                
                ${status?.lastAnalysis ? 
                    `<div class="metric">
                        <span class="metric-label">Last Analysis:</span>
                        <span class="metric-value" style="font-size: 10px">${new Date(status.lastAnalysis).toLocaleTimeString()}</span>
                    </div>` : ''
                }
                
                <div class="heartbeat ${isHealthy ? 'healthy' : 'stale'}">
                    Last heartbeat: ${status?.heartbeat || 'never'}
                </div>
            </div>`;
    }
    
    html += `
        </div>
        
        <div class="refresh-note">
            Auto-refreshing every 10 seconds | Last update: ${new Date().toISOString()}<br>
            <button onclick="fetch('/api/analyze-all', {method: 'POST'}).then(() => location.reload())" 
                    style="background: #333; color: #0f0; border: 1px solid #0f0; padding: 5px 10px; margin-top: 10px; cursor: pointer;">
                🔍 Trigger Claude Analysis Now
            </button>
        </div>
    </div>
</body>
</html>`;
    
    res.send(html);
});

// Helper to update agent status with Claude analysis
async function updateAgentStatusWithAnalysis(agentName) {
    const statusFile = path.join(SHARED_DIR, 'status', `${agentName}.json`);
    
    try {
        console.log(`Starting analysis for ${agentName}...`);
        
        // Get current status
        const currentStatus = await readJSON(statusFile);
        if (!currentStatus) {
            console.log(`No status file found for ${agentName}`);
            return;
        }
        
        // Get Claude analysis
        console.log(`Calling Claude analysis for ${agentName}...`);
        const analysis = await analyzeAgentWork(agentName);
        
        if (!analysis) {
            console.log(`Claude analysis returned null for ${agentName}`);
            return;
        }
        
        console.log(`Claude analysis succeeded for ${agentName}:`, JSON.stringify(analysis, null, 2));
        
        // Update status with analysis results
        const updatedStatus = {
            ...currentStatus,
            filesModified: analysis.filesModified || [],
            testsPass: analysis.testsPass || 0,
            errors: analysis.errors || [],
            lastTool: analysis.lastTool || currentStatus.lastTool || 'none',
            workSummary: analysis.workSummary || '',
            lastUpdate: new Date().toISOString(),
            lastAnalysis: new Date().toISOString()
        };
        
        // Write updated status
        await fs.writeFile(statusFile, JSON.stringify(updatedStatus, null, 2));
        console.log(`✅ Successfully updated status file for ${agentName}`);
        
    } catch (e) {
        console.error(`❌ Failed to update status for ${agentName}:`, e);
    }
}

// API endpoint for agent status
app.get('/api/status', async (req, res) => {
    const agents = await getAgentStatuses();
    res.json(agents);
});

// API endpoint to trigger Claude analysis for a specific agent (runs full analysis)
app.post('/api/analyze/:agent', async (req, res) => {
    const agentName = req.params.agent;
    const { exec } = require('child_process');
    
    console.error(`🔍 Manual analysis triggered for ${agentName}`);
    
    exec('/app/analyze-logs.sh', { timeout: 300000 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Manual analysis failed:`, error.message);
            res.status(500).json({ error: error.message });
        } else {
            console.error(`✅ Manual analysis completed`);
            res.json({ success: true, agent: agentName, timestamp: new Date().toISOString(), output: stdout });
        }
    });
});

// API endpoint to trigger analysis for all agents
app.post('/api/analyze-all', async (req, res) => {
    try {
        const agents = await getAgentStatuses();
        const results = [];
        
        for (const agentName of Object.keys(agents)) {
            await updateAgentStatusWithAnalysis(agentName);
            results.push(agentName);
        }
        
        res.json({ 
            success: true, 
            analyzed: results, 
            count: results.length,
            timestamp: new Date().toISOString() 
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// API endpoint for specific agent logs
app.get('/api/logs/:agent', async (req, res) => {
    const logs = await getRecentLogs(req.params.agent);
    res.type('text/plain').send(logs);
});

// API endpoint for specific agent progress
app.get('/api/progress/:agent', async (req, res) => {
    const progress = await getProgress(req.params.agent);
    res.type('text/plain').send(progress);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Periodic Claude analysis using bash script - runs every 2 minutes
async function periodicAnalysis() {
    console.log('Running periodic Claude analysis of agent logs...');
    const { exec } = require('child_process');
    
    return new Promise((resolve) => {
        exec('/app/analyze-logs.sh', { timeout: 300000 }, (error, stdout, stderr) => {
            if (error) {
                console.error('Periodic analysis script failed:', error.message);
            } else {
                console.log('Periodic analysis completed');
                if (stdout) console.log('Analysis output:', stdout);
            }
            resolve();
        });
    });
}

// Start periodic analysis (every 2 minutes)
const ANALYSIS_INTERVAL = 2 * 60 * 1000; // 2 minutes
setInterval(periodicAnalysis, ANALYSIS_INTERVAL);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Monitor dashboard running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to view the dashboard`);
    console.log(`Claude-powered log analysis running every ${ANALYSIS_INTERVAL/1000/60} minutes`);
    
    // Run initial analysis after 30 seconds
    setTimeout(periodicAnalysis, 30000);
});