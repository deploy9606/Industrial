const placeholderCapRateAnalysis = {
  region: "Baltimore",
  year: 2024,
  marketAverages: [
    { label: "Overall Market", range: "6.0% – 8.5%" },
    { label: "Prime Locations (BWI/Port)", range: "6.0% – 7.5%" },
    { label: "Secondary Locations", range: "7.5% – 8.5%" },
    { label: "Value-Add Properties", range: "8.0% – 9.5%" },
  ],
  subjectProperty: {
    locationNotes:
      "Near BWI Airport (4.6 mi), Port of Baltimore (3.9 mi), and major highway access.",
    classification: "Prime Industrial Location",
    expectedCapRateRange: "7.0% – 8.0%",
  },
  marketContext: [
    "Cap rates have compressed significantly from 2020 levels due to strong demand.",
    "CBRE reported 6% cap rate compression in the Baltimore industrial market through 2024.",
    "The Francis Scott Key Bridge collapse may add 25–50 basis points to cap rates in affected areas.",
    "Limited supply of large industrial parcels (8+ acres) commands premium pricing.",
  ],
  comparableSales: [
    {
      name: "Race Road Logistics Center",
      size: "130,000 SF",
      location: "Hanover",
      capRateRange: "6.5% – 7.0%",
      source: "CBRE",
    },
    {
      name: "Peppermill Trade Center",
      size: "107,000 SF",
      location: "Glen Burnie",
      capRateRange: "6.8% – 7.3%",
      source: "CBRE",
    },
  ],
  investmentRecommendation: {
    targetCapRateRange: "7.5% – 8.0%",
    justification: [
      "Excellent location fundamentals",
      "Large parcel size (rare in the market)",
      "Value-add potential",
      "Favorable market conditions",
    ],
  },
};

module.exports = { placeholderCapRateAnalysis };
// This module provides a placeholder cap rate analysis for industrial properties in Baltimore.