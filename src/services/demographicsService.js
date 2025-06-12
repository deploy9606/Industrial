const axios = require("axios");
const logger = require("../config/logger");

class DemographicsService {
	constructor() {
		this.censusApiBase = "https://api.census.gov/data";
		this.geoApiBase = "https://geocoding.geo.census.gov/geocoder";
	}

	/**
	 * Parse une adresse pour extraire ville, état, code postal
	 */
	parseAddress(address) {
		if (!address) return null;

		const parts = address.split(",").map((part) => part.trim());
		if (parts.length < 2) return null;

		// Dernier élément peut être: "State ZIP" ou juste "State"
		const lastPart = parts[parts.length - 1];

		// Essaie de matcher "State ZIP"
		let stateZipMatch = lastPart.match(/([A-Z]{2})\s+(\d{5})/);

		if (stateZipMatch) {
			// Format avec code postal: "City, State ZIP"
			const state = stateZipMatch[1];
			const zipCode = stateZipMatch[2];
			const city = parts[parts.length - 2];
			return { city, state, zipCode };
		}

		// Essaie de matcher juste "State" (2 lettres)
		const stateMatch = lastPart.match(/^([A-Z]{2})$/);

		if (stateMatch) {
			// Format sans code postal: "City, State"
			const state = stateMatch[1];
			const city = parts[parts.length - 2];
			return { city, state, zipCode: null };
		}

		// Essaie de matcher nom d'état complet
		const stateNames = {
			Alabama: "AL",
			Alaska: "AK",
			Arizona: "AZ",
			Arkansas: "AR",
			California: "CA",
			Colorado: "CO",
			Connecticut: "CT",
			Delaware: "DE",
			Florida: "FL",
			Georgia: "GA",
			Hawaii: "HI",
			Idaho: "ID",
			Illinois: "IL",
			Indiana: "IN",
			Iowa: "IA",
			Kansas: "KS",
			Kentucky: "KY",
			Louisiana: "LA",
			Maine: "ME",
			Maryland: "MD",
			Massachusetts: "MA",
			Michigan: "MI",
			Minnesota: "MN",
			Mississippi: "MS",
			Missouri: "MO",
			Montana: "MT",
			Nebraska: "NE",
			Nevada: "NV",
			"New Hampshire": "NH",
			"New Jersey": "NJ",
			"New Mexico": "NM",
			"New York": "NY",
			"North Carolina": "NC",
			"North Dakota": "ND",
			Ohio: "OH",
			Oklahoma: "OK",
			Oregon: "OR",
			Pennsylvania: "PA",
			"Rhode Island": "RI",
			"South Carolina": "SC",
			"South Dakota": "SD",
			Tennessee: "TN",
			Texas: "TX",
			Utah: "UT",
			Vermont: "VT",
			Virginia: "VA",
			Washington: "WA",
			"West Virginia": "WV",
			Wisconsin: "WI",
			Wyoming: "WY",
		};

		const fullStateName = Object.keys(stateNames).find(
			(name) => lastPart.toLowerCase() === name.toLowerCase()
		);

		if (fullStateName) {
			const state = stateNames[fullStateName];
			const city = parts[parts.length - 2];
			return { city, state, zipCode: null };
		}

		return null;
	}

	/**
	 * Obtient les données démographiques pour un état donné
	 */
	async getStateDemographics(stateCode) {
		try {
			const url = `${this.censusApiBase}/2023/acs/acs5`;
			const params = {
				get: "B01003_001E,B19013_001E,B08303_001E,B25003_001E,B25003_002E,B01002_001E,B08303_013E",
				for: `state:${this.getStateFips(stateCode)}`,
				key: process.env.CENSUS_API_KEY || "",
			};

			const response = await axios.get(url, { params });

			if (response.data && response.data.length > 1) {
				const data = response.data[1];
				return this.parseCensusData(data);
			}

			return null;
		} catch (error) {
			logger.error("Error getting state demographics:", error.message);
			return null;
		}
	}

	/**
	 * Parse les données brutes du Census API
	 */
	parseCensusData(data) {
		return {
			population: parseInt(data[0]) || 0, // B01003_001E - Total Population
			medianIncome: parseInt(data[1]) || 0, // B19013_001E - Median Household Income
			totalCommuters: parseInt(data[2]) || 0, // B08303_001E - Total Commuters
			totalHouseholds: parseInt(data[3]) || 0, // B25003_001E - Total Households
			ownerOccupied: parseInt(data[4]) || 0, // B25003_002E - Owner Occupied
			medianAge: parseFloat(data[5]) || 0, // B01002_001E - Median Age
			longCommuters: parseInt(data[6]) || 0, // B08303_013E - 60+ min commute
		};
	}

	/**
	 * Calcule des métriques dérivées
	 */
	calculateDerivedMetrics(demographics) {
		const ownershipRate =
			demographics.totalHouseholds > 0
				? (demographics.ownerOccupied / demographics.totalHouseholds) * 100
				: 0;

		const longCommuteRate =
			demographics.totalCommuters > 0
				? (demographics.longCommuters / demographics.totalCommuters) * 100
				: 0;

		return {
			...demographics,
			homeOwnershipRate: Math.round(ownershipRate * 10) / 10,
			longCommuteRate: Math.round(longCommuteRate * 10) / 10,
			dataYear: "2023", // ACS 5-year estimates (most recent complete dataset)
			dataSource: "U.S. Census Bureau - American Community Survey",
		};
	}

	/**
	 * Obtient les données d'emploi et de chômage (API Bureau of Labor Statistics)
	 */
	async getEmploymentData(stateCode) {
		try {
			// API BLS pour les données d'emploi (nécessite une clé API pour plus de données)
			// Pour l'instant, on utilise des données simulées basées sur des moyennes nationales
			const unemploymentRates = {
				AL: 2.8,
				AK: 4.2,
				AZ: 3.5,
				AR: 3.1,
				CA: 4.1,
				CO: 3.2,
				CT: 3.8,
				DE: 4.0,
				FL: 2.8,
				GA: 3.1,
				HI: 2.9,
				ID: 2.3,
				IL: 4.5,
				IN: 2.8,
				IA: 2.7,
				KS: 2.8,
				KY: 3.9,
				LA: 3.8,
				ME: 2.8,
				MD: 3.5,
				MA: 3.0,
				MI: 3.8,
				MN: 2.9,
				MS: 3.8,
				MO: 3.2,
				MT: 2.5,
				NE: 2.1,
				NV: 4.1,
				NH: 2.1,
				NJ: 4.0,
				NM: 4.8,
				NY: 4.1,
				NC: 3.4,
				ND: 2.0,
				OH: 3.5,
				OK: 3.1,
				OR: 3.8,
				PA: 3.4,
				RI: 3.2,
				SC: 3.0,
				SD: 2.1,
				TN: 3.2,
				TX: 3.8,
				UT: 2.9,
				VT: 2.2,
				VA: 2.9,
				WA: 4.0,
				WV: 3.5,
				WI: 2.8,
				WY: 3.4,
			};

			return {
				unemploymentRate: unemploymentRates[stateCode] || 3.5,
			};
		} catch (error) {
			logger.error("Error getting employment data:", error.message);
			return { unemploymentRate: 3.5 };
		}
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
	 * Méthode principale pour obtenir toutes les données démographiques
	 */
	async getDemographicsForAddress(address) {
		try {
			logger.info(`Getting demographics for address: ${address}`);

			const parsedAddress = this.parseAddress(address);
			if (!parsedAddress) {
				throw new Error("Could not parse address");
			}

			const { city, state, zipCode } = parsedAddress;

			// Obtient les données démographiques de l'état
			const stateDemographics = await this.getStateDemographics(state);

			// Obtient les données d'emploi
			const employmentData = await this.getEmploymentData(state);

			// Combine et calcule les métriques
			const combinedData = {
				...stateDemographics,
				...employmentData,
				location: {
					city,
					state,
					zipCode,
				},
			};

			const finalData = this.calculateDerivedMetrics(combinedData);

			logger.info(`Successfully retrieved demographics for ${city}, ${state}`);
			return finalData;
		} catch (error) {
			logger.error("Error in getDemographicsForAddress:", error.message);
			throw error;
		}
	}
}

module.exports = new DemographicsService();
