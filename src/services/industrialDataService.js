const axios = require("axios");
const logger = require("../config/logger");

class IndustrialDataService {
	constructor() {
		this.censusApiBase = "https://api.census.gov/data";
		this.apiKey = process.env.CENSUS_API_KEY || "";
	}

	/**
	 * Parse une adresse pour extraire l'état
	 */
	parseAddress(address) {
		if (!address) return null;

		const parts = address.split(",").map((part) => part.trim());
		if (parts.length < 2) return null;

		const lastPart = parts[parts.length - 1];
		let stateMatch = lastPart.match(/([A-Z]{2})\s+(\d{5})/);

		if (stateMatch) {
			return { state: stateMatch[1] };
		}

		stateMatch = lastPart.match(/^([A-Z]{2})$/);
		if (stateMatch) {
			return { state: stateMatch[1] };
		}

		return null;
	}

	/**
	 * Conversion code état vers FIPS
	 */
	getStateFips(stateCode) {
		const stateFips = {
			AL: "01",
			AK: "02",
			AZ: "04",
			AR: "05",
			CA: "06",
			CO: "08",
			CT: "09",
			DE: "10",
			FL: "12",
			GA: "13",
			HI: "15",
			ID: "16",
			IL: "17",
			IN: "18",
			IA: "19",
			KS: "20",
			KY: "21",
			LA: "22",
			ME: "23",
			MD: "24",
			MA: "25",
			MI: "26",
			MN: "27",
			MS: "28",
			MO: "29",
			MT: "30",
			NE: "31",
			NV: "32",
			NH: "33",
			NJ: "34",
			NM: "35",
			NY: "36",
			NC: "37",
			ND: "38",
			OH: "39",
			OK: "40",
			OR: "41",
			PA: "42",
			RI: "44",
			SC: "45",
			SD: "46",
			TN: "47",
			TX: "48",
			UT: "49",
			VT: "50",
			VA: "51",
			WA: "53",
			WV: "54",
			WI: "55",
			WY: "56",
		};
		return stateFips[stateCode];
	}

	/**
	 * Obtient les données County Business Patterns pour l'industrie/logistique
	 */
	async getCountyBusinessPatterns(stateCode) {
		try {
			const stateFips = this.getStateFips(stateCode);
			if (!stateFips) return null;

			// Transportation & Warehousing (NAICS 48-49) + Manufacturing (NAICS 31-33)+ Warehousing (NAICS 493) + Trucking (NAICS 484)
			const naicsCodes = ["48", "49", "31", "32", "33", "493"]; //, "484"];
			// const naicsCodes = ["48"];
			const results = {};

			for (const naics of naicsCodes) {
				try {
					const url = `${this.censusApiBase}/2022/cbp`;
					const params = {
						get: "EMP,PAYANN",
						for: `state:${stateFips}`,
						NAICS2017: `${naics}*`,
						key: this.apiKey,
					};

					const response = await axios.get(url, { params });

					if (response.data && response.data.length > 1) {
						const data = response.data[1];
						results[naics] = {
							employees: parseInt(data[0]) || 0,
							establishments: parseInt(data[1]) || 0,
						};
					}
				} catch (err) {
					logger.warn(`Failed to get CBP data for NAICS ${naics}:`, err);
				}
			}

			return this.aggregateIndustrialData(results);
		} catch (error) {
			logger.error("Error getting County Business Patterns:", error.message);
			return null;
		}
	}

	/**
	 * Agrège les données industrielles par secteur
	 */
	aggregateIndustrialData(results) {
		const transportation = {
			employees: (results["48"]?.employees || 0) + (results["49"]?.employees || 0),
			establishments:
				(results["48"]?.establishments || 0) + (results["49"]?.establishments || 0),
		};

		const manufacturing = {
			employees:
				(results["31"]?.employees || 0) +
				(results["32"]?.employees || 0) +
				(results["33"]?.employees || 0),
			establishments:
				(results["31"]?.establishments || 0) +
				(results["32"]?.establishments || 0) +
				(results["33"]?.establishments || 0),
		};

		const warehousing = {
			employees: results["493"]?.employees || 0,
			establishments: results["493"]?.establishments || 0,
		};

		return {
			transportation,
			manufacturing,
			warehousing,
		};
	}

	/**
	 * Obtient les données d'emploi par secteur (LEHD)
	 */
	async getLEHDEmploymentData(stateCode) {
		try {
			const stateFips = this.getStateFips(stateCode);
			if (!stateFips) return null;

			const url = `${this.censusApiBase}/timeseries/qwi/sa`;
			const params = {
				get: "Emp,EmpS",
				for: `state:${stateFips}`,
				time: "2024-Q1", // Most recent quarter
				key: this.apiKey,
			};
			const response = await axios.get(url, { params });

			if (response.data && response.data.length > 1) {
				const data = response.data[1];
				return {
					totalEmployment: parseInt(data[0]) || 0,
					stableEmployment: parseInt(data[1]) || 0,
					employmentStabilityRate:
						data[1] && data[0]
							? ((parseInt(data[1]) / parseInt(data[0])) * 100).toFixed(1)
							: 0,
				};
			}

			return null;
		} catch (error) {
			logger.error("Error getting LEHD employment data:", error.message);
			return null;
		}
	}

	/**
	 * Méthode principale pour obtenir toutes les données industrielles
	 */
	async getIndustrialDataForAddress(address) {
		try {
			logger.info(`Getting industrial data for address: ${address}`);

			const parsedAddress = this.parseAddress(address);
			if (!parsedAddress) {
				throw new Error("Could not parse address");
			}

			const { state } = parsedAddress;

			// Obtient les données County Business Patterns
			const cbpData = await this.getCountyBusinessPatterns(state);
			// Obtient les données LEHD
			const lehdData = await this.getLEHDEmploymentData(state);

			if (!cbpData && !lehdData) {
				return null;
			}

			const result = {
				location: { state },
				countryBusinessPatterns: cbpData,
				employmentData: lehdData,
				dataSource: "U.S. Census Bureau - County Business Patterns & LEHD",
				dataYear: "2022-2023", // Most recent available Census data
			};

			logger.info(`Successfully retrieved industrial data for ${state}`);
			return result;
		} catch (error) {
			logger.error("Error in getIndustrialDataForAddress:", error.message);
			throw error;
		}
	}
}

module.exports = new IndustrialDataService();
