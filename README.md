# 9606 Capital AI Tenant Research Server

Serveur Node.js pour l'outil d'analyse de marché immobilier industriel spécialisé dans la **découverte de locataires émergents** (Emerging Companies Strategy).

## 🚀 Fonctionnalités Principales

- **Découverte de locataires émergents** au lieu des géants (Amazon, Walmart, etc.)
- **Optimisation IA** : 4 appels API maximum
- **Configuration dynamique** des prompts IA via interface web
- **Proxy sécurisé** pour APIs externes (OpenAI/Gemini)

## 📋 Architecture

```
server/src/
├── config/           # Configuration Google APIs & Logger
├── controllers/      # Configuration IA & Proxy
├── services/         # Logique métier (6 services)
├── routes/           # API Endpoints actifs
├── middleware/       # Gestion d'erreurs
└── utils/           # Constants & Scoring (5 critères)
```

## ⚡ Installation Rapide

```bash
cd server
npm install
npm start
```

## 🔧 Configuration (.env)

Créez un fichier `.env` avec :

```env
# APIs IA
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...

# Google Services (optionnel)
GOOGLE_CLIENT_ID=votre-client-id
GOOGLE_CLIENT_SECRET=votre-client-secret
GOOGLE_REFRESH_TOKEN=votre-refresh-token
GOOGLE_FOLDER_ID=id-dossier-drive

# Serveur
PORT=8080
NODE_ENV=development
```

## 🔌 API Endpoints

### Routes Principales

- `POST /api/tenant-research/analyze-9606` - **Analyse principale 9606**

### Configuration IA

- `GET /api/config/prompt` - Configuration actuelle
- `POST /api/config/prompt` - Mise à jour config
- `POST /api/config/prompt/reset` - Réinitialisation

### Proxy APIs

- `POST /proxy/openai` - Proxy OpenAI
- `POST /proxy/gemini` - Proxy Gemini

## 🎯 Analyse 9606 Capital

### Processus en 3 Étapes

1. **Configuration bâtiment** (Gemini API)
2. **Tendances de croissance** (OpenAI API)
3. **Recherche locataires émergents** (OpenAI API)

### Scoring (50 points total)

- **area_growth_trends** (10 pts)
- **operational_needs_match** (10 pts)
- **capacity_requirements** (10 pts)
- **industry_growth** (10 pts)
- **building_fit** (10 pts)

## 📊 Services Disponibles

- **aiAnalysisService** - Orchestration des 4 analyses IA
- **aiApiService** - Wrapper unifié OpenAI/Gemini avec retry
- **tenantService** - Découverte et ranking des locataires
- **marketAnalysisService** - Analyse tendances marché
- **googleDocsService** - Export vers Google Docs

## 📝 Logging

- **error.log** - Erreurs système et API
- **combined.log** - Logs complets avec niveau INFO
- **Console** - Logs temps réel en développement

## 🔒 Sécurité

- **Clés API cachées** côté serveur uniquement
<!-- - **CORS configuré** pour frontend autorisé -->
- **Validation** des données d'entrée
- **Gestion d'erreurs** robuste avec fallbacks

## 🚀 Déploiement

Le serveur est prêt pour déploiement avec :

- **Variables d'environnement** configurables
- **Logs structurés** pour monitoring
- **Gestion d'erreurs** en production

---

**Port par défaut :** 8080  
**Frontend :** Doit pointer vers ce serveur pour les API calls  
**Version :** 2.0 - Optimisé 9606 Capital (Juin 2025)
