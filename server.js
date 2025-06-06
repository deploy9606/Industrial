const express = require('express');
const { google } = require('googleapis');
const { GoogleGenAI } = require('@google/genai');

const axios = require('axios');
const app = express();
app.use(express.json());
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
// Load environment variables
require('dotenv').config();
const cors = require('cors');
app.use(cors());
// Google Docs API setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost'
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const docs = google.docs({ version: 'v1', auth: oauth2Client });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Gap Detection Algorithm
async function detectOperationalGaps(query, propertyData, marketData) {
  try {
    let gaps = [];
    const tenants = ['United Rentals', 'J.B. Hunt', 'Copart', 'FedEx', 'Tesla', 'Amazon'];
    const radius = [40, 80];
    const minSqFt = propertyData.sqFt || 10000;
    const isIOS = propertyData.acres && propertyData.sqFt ? (propertyData.sqFt / (propertyData.acres * 43560)) * 100 <= 30 : true;

    for (const tenant of tenants) {
      const tenantData = {
        facilities: await fetchTenantFacilities(tenant, '[STATE]'),
        needs: await fetchOperationalNeeds(tenant),
        metrics: await fetchMetrics(tenant),
      };

      let gap = null;
      if (!hasFacilityWithinRadius(tenantData.facilities, '[PROPERTY_ADDRESS]', radius)) {
        gap = {
          type: isIOS ? 'Missing IOS Yard' : 'Missing Facility',
          details: `No ${minSqFt} sq ft ${isIOS ? 'IOS yard' : 'facility'} on ${propertyData.acres || 5} acres within ${radius.join('-')} miles`,
          tenant,
        };
      } else if (tenantData.metrics.delays > 0) {
        gap = {
          type: 'Operational Delay',
          details: `Delays due to insufficient ${isIOS ? 'yard' : 'hub'} capacity`,
          tenant,
        };
      }

      if (gap) {
        gap.impact = estimateImpact(gap, tenantData.metrics, marketData);
        gaps.push(gap);
      }
    }

    gaps.sort((a, b) => b.impact.severity - a.impact.severity);
    const summary = summarizeGaps(gaps);
    const pitches = gaps.map(gap => generatePitch(gap, propertyData, marketData));
    return { gaps, summary, pitches };
  } catch (err) {
    console.error('Gap detection error:', err);
    return { gaps: [], summary: 'No gaps detected', pitches: [] };
  }
}

// Mock tenant data fetch (replace with real APIs)
async function fetchTenantFacilities(tenant, state) {
  return [{ size: 20000, distance: 100 }];
}

async function fetchOperationalNeeds(tenant) {
  return { minSqFt: 10000, type: tenant.includes('Rentals') ? 'IOS' : 'hub' };
}

async function fetchMetrics(tenant) {
  return { delays: tenant.includes('Rentals') ? 10 : 5 };
}

function hasFacilityWithinRadius(facilities, address, radius) {
  return facilities.some(f => f.size >= 10000 && f.distance <= radius[1]);
}

function estimateImpact(gap, metrics, marketData) {
  const severity = metrics.delays * marketData.growthRate * 10000;
  return { severity, cost: `$${Math.round(severity / 1000)}K/year` };
}

function summarizeGaps(gaps, versioni) {
  return gaps.length ? gaps.map(g => `${g.tenant}: ${g.type} - ${g.details} (Impact: ${g.impact.cost})`).join('\n') : 'No gaps detected';
}

function generatePitch(gap, propertyData, marketData) {
  return {
    tenant: gap.tenant,
    pitch: `Introduction: ${gap.tenant} faces ${gap.details} costing ${gap.impact.cost}. ` +
           `Property Fit: [PROPERTY_ADDRESS] offers [${propertyData.sqFt}] sq ft, [${propertyData.acres || 5}] acres, ${propertyData.type || 'IOS warehouse'}, highway access. ` +
           `Market Advantage: ${marketData.growthRate * 100}% growth, $${marketData.leaseRate}/sq ft. ` +
           `Call to Action: Contact 9606 Capital to lease.`
  };
}

// API endpoints
app.post('/gaps', async (req, res) => {
  try {
    const { query, propertyData, marketData } = req.body;
    const result = await detectOperationalGaps(query, propertyData, marketData);
    //const result = "W0rking";
    //console.log(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Gap detection failed' });
  }
});

app.post('/proxy/openai', async (req, res) => {
  try {
    res.json("kdkdkdkdkdkdkd");
    const response = await axios.post('https://api.openai.com/v1/chat/completions', req.body, {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
    });

    res.json(response.data);
    
  } catch (err) {
    res.status(500).json({ error: 'OpenAI proxy failed' });
  }
});

app.post('/proxy/gemini', async (req, res) => {
  try {
    
    const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: req.body.contents});
    
    // const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=' + process.env.GEMINI_API_KEY, req.body);
    //console.log(response.text);
    res.json(response);
  } catch (err) {
    console.log('Gemini proxy error:', err);
    res.status(500).json({ error: 'Gemini proxy failed' });
  }
});

app.post('/save-docs', async (req, res) => {
  try {
    const { geminiResult, chatGPTResult, query } = req.body;
    const docContent = [
      { insertText: { text: `# Tenant Research: ${query}\n`, location: { index: 1 } } },
      { insertText: { text: '## Gemini Results\n', location: { index: 1 } } },
      { insertText: { text: `${geminiResult || 'No Gemini data'}\n`, location: { index: 1 } } },
      { insertText: { text: '## ChatGPT Results\n', location: { index: 1 } } },
      { insertText: { text: `${chatGPTResult || 'No ChatGPT data'}\n`, location: { index: 1 } } },
    ];
    const doc = await docs.documents.create({
      requestBody: { title: `Tenant_Research_${Date.now()}` },
    });
    await docs.documents.batchUpdate({
      documentId: doc.data.documentId,
      requestBody: { requests: docContent },
    });
    await drive.files.update({
      fileId: doc.data.documentId,
      addParents: process.env.GOOGLE_FOLDER_ID,
      removeParents: 'root',
    });
    res.json({ status: 'success', docId: doc.data.documentId });
  } catch (err) {
    console.error('Docs save error:', err);
    res.status(500).json({ error: 'Failed to save to Google Docs' });
  }
});

app.listen(3001, () => console.log('Server on port 3001'));

