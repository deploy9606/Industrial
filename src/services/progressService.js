const logger = require("../config/logger");

class ProgressService {
	constructor() {
		this.sessions = new Map(); // sessionId -> { progress, cleanupTimer }
	}

	// Créer une nouvelle session de progression (système de polling)
	createSession(sessionId, useAIScoring = false) {
		const totalSteps = useAIScoring ? 4 : 3; // 4 étapes si AI scoring activé, 3 sinon

		this.sessions.set(sessionId, {
			createdAt: Date.now(),
			cleanupTimer: null, // Timer pour la suppression automatique
			progress: {
				step: 0,
				totalSteps: totalSteps,
				currentTask: "Initialisation...",
				details: "",
				completed: false,
				error: null,
			},
		});
		logger.info(`Progress session created: ${sessionId} with ${totalSteps} steps`);
	}

	// Mettre à jour la progression
	updateProgress(sessionId, step, currentTask, details = "") {
		const session = this.sessions.get(sessionId);
		if (!session) {
			logger.warn(`Session not found for progress update: ${sessionId}`);
			return;
		}

		session.progress = {
			...session.progress,
			step,
			currentTask,
			details,
			completed: false, // Ne marquer comme terminé que via completeSession()
		};

		logger.info(
			`Progress updated for ${sessionId}: Step ${step}/${session.progress.totalSteps} - ${currentTask}`
		);
	}

	// Obtenir l'état de progression actuel
	getProgress(sessionId) {
		const session = this.sessions.get(sessionId);
		return session ? session.progress : null;
	}

	// Marquer comme terminé avec succès
	completeSession(sessionId, result = null) {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		session.progress.completed = true;
		session.progress.step = session.progress.totalSteps; // Utiliser le nombre total d'étapes
		session.progress.currentTask = "Analyse terminée";
		session.progress.details = "Tous les appels d'IA ont été traités avec succès";
		session.progress.result = result;

		logger.info(`Progress session completed: ${sessionId}`);

		// Programmer la suppression de la session dans 2 minutes
		// Cela donne le temps au client de récupérer le statut final
		session.cleanupTimer = setTimeout(() => {
			this.removeSession(sessionId);
		}, 2 * 60 * 1000);
	}

	// Marquer comme erreur
	errorSession(sessionId, error) {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		session.progress.error = error.message;
		session.progress.currentTask = "Erreur dans l'analyse";
		session.progress.completed = true; // Marquer comme terminé même en cas d'erreur

		logger.error(`Progress session failed: ${sessionId} - ${error.message}`);

		// Programmer la suppression de la session dans 2 minutes même en cas d'erreur
		session.cleanupTimer = setTimeout(() => {
			this.removeSession(sessionId);
		}, 2 * 60 * 1000);
	}

	// Supprimer une session
	removeSession(sessionId) {
		const session = this.sessions.get(sessionId);
		if (session) {
			// Annuler le timer de nettoyage s'il existe
			if (session.cleanupTimer) {
				clearTimeout(session.cleanupTimer);
			}

			this.sessions.delete(sessionId);
			logger.info(`Progress session removed: ${sessionId}`);
		}
	}

	// Nettoyer les sessions expirées (plus de 30 minutes) - Filet de sécurité
	cleanup() {
		const now = Date.now();
		let cleanedCount = 0;

		for (const [sessionId, session] of this.sessions) {
			if (now - session.createdAt > 30 * 60 * 1000) {
				// Annuler le timer de nettoyage s'il existe
				if (session.cleanupTimer) {
					clearTimeout(session.cleanupTimer);
				}

				this.sessions.delete(sessionId);
				cleanedCount++;
				logger.warn(
					`Emergency cleanup of expired session: ${sessionId} (created ${Math.floor(
						(now - session.createdAt) / 1000 / 60
					)} minutes ago)`
				);
			}
		}

		if (cleanedCount > 0) {
			logger.warn(
				`Emergency cleanup removed ${cleanedCount} orphaned sessions - investigate potential issues`
			);
		} else {
			logger.debug(
				`Cleanup check: ${this.sessions.size} active sessions, all within normal timeframe`
			);
		}
	}

	// Obtenir les statistiques
	getStats() {
		return {
			activeSessions: this.sessions.size,
			sessions: Array.from(this.sessions.keys()),
		};
	}
}

module.exports = new ProgressService();
