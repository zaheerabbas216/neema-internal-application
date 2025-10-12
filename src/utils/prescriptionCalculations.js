// prescriptionCalculations.js

/**
 * Transpose prescription from plus cylinder to minus cylinder or vice versa
 * @param {number} sphere - Original sphere value
 * @param {number} cylinder - Original cylinder value
 * @param {number} axis - Original axis value
 * @returns {object} Transposed prescription {sphere, cylinder, axis}
 */
export const transposePrescription = (sphere, cylinder, axis) => {
    if (!sphere && !cylinder && !axis) return { sphere: 0, cylinder: 0, axis: 0 };

    const newSphere = parseFloat(sphere) + parseFloat(cylinder);
    const newCylinder = -parseFloat(cylinder);
    let newAxis = parseFloat(axis) + 90;

    // If axis > 180, subtract 180
    if (newAxis > 180) {
        newAxis = newAxis - 180;
    }

    return {
        sphere: newSphere,
        cylinder: newCylinder,
        axis: newAxis
    };
};

/**
 * Generate range values in 0.25 increments
 * @param {number} value - Target value
 * @returns {array} Array of values from 0 to target value in 0.25 steps
 */
export const generateRange = (value) => {
    if (!value || value === 0) return [0];

    const absValue = Math.abs(parseFloat(value));
    const isNegative = parseFloat(value) < 0;
    const range = [];

    for (let i = 0; i <= absValue; i += 0.25) {
        const val = isNegative ? -i : i;
        range.push(Math.round(val * 100) / 100); // Round to 2 decimal places
    }

    return range;
};

/**
 * Determine prescription type based on sphere and cylinder signs
 * @param {number} sphere - Sphere value
 * @param {number} cylinder - Cylinder value
 * @returns {string} Prescription type: 'Minus Comp', 'Plus Comp', or 'SV Cross Comp'
 */
export const determinePrescriptionType = (sphere, cylinder) => {
    const sph = parseFloat(sphere) || 0;
    const cyl = parseFloat(cylinder) || 0;

    // Zero cylinder cases
    if (cyl === 0) {
        return sph < 0 ? 'Minus Comp' : 'Plus Comp';
    }

    // Same signs
    if ((sph >= 0 && cyl >= 0) || (sph <= 0 && cyl <= 0)) {
        return sph < 0 ? 'Minus Comp' : 'Plus Comp';
    }

    // Cross signs (different signs)
    return 'SV Cross Comp';
};

/**
 * Check if a prescription range matches the given sphere and cylinder values with precise matching
 * @param {string} rangeStr - Range string from data (e.g., "-6.0 to -2.0")
 * @param {number} sphere - Sphere value
 * @param {number} cylinder - Cylinder value
 * @returns {boolean} True if prescription fits precisely within the range
 */
export const matchesRange = (rangeStr, sphere, cylinder) => {
    if (!rangeStr) return false;

    const sph = parseFloat(sphere) || 0;
    const cyl = parseFloat(cylinder) || 0;

    // Handle single value ranges (e.g., "-25.0 sph", "+18.0 sph")
    if (rangeStr.includes('sph')) {
        const value = parseFloat(rangeStr.replace(/[^0-9.-]/g, ''));
        // For single sphere values, check if the prescription sphere matches exactly or is within 0.25
        return Math.abs(Math.abs(sph) - Math.abs(value)) <= 0.25 && Math.abs(cyl) <= 0.25;
    }

    // Handle "to" ranges (e.g., "-6.0 to -2.0", "+3.0 to +2.0")
    if (rangeStr.includes('to')) {
        const parts = rangeStr.split('to').map(part => {
            const cleaned = part.trim().replace(/[^0-9.-]/g, '');
            return parseFloat(cleaned);
        });

        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const [val1, val2] = parts;

            // Determine the min and max values for the range
            const minVal = Math.min(Math.abs(val1), Math.abs(val2));
            const maxVal = Math.max(Math.abs(val1), Math.abs(val2));

            // Check if both sphere and cylinder fall within this specific range
            const sphInRange = Math.abs(sph) >= minVal && Math.abs(sph) <= maxVal;
            const cylInRange = Math.abs(cyl) >= minVal && Math.abs(cyl) <= maxVal;

            return sphInRange && cylInRange;
        }
    }

    // Handle specific combinations (e.g., "+2/+1 180°", "-2, 90")
    if (rangeStr.includes('/') || rangeStr.includes(',')) {
        const numbers = rangeStr.match(/-?\d+\.?\d*/g);
        if (numbers && numbers.length >= 2) {
            const rangeSph = parseFloat(numbers[0]);
            const rangeCyl = parseFloat(numbers[1]);

            // More precise matching - prescription should be very close to the specific range values
            const sphMatch = Math.abs(Math.abs(sph) - Math.abs(rangeSph)) <= 0.5;
            const cylMatch = Math.abs(Math.abs(cyl) - Math.abs(rangeCyl)) <= 0.5;

            return sphMatch && cylMatch;
        }
    }

    return false;
};

/**
 * Find the most specific matching lens option (best fit)
 * @param {array} matches - Array of matching lens options
 * @param {number} sphere - Sphere value
 * @param {number} cylinder - Cylinder value
 * @returns {object|null} The most specific match or null
 */
export const findBestMatch = (matches, sphere, cylinder) => {
    if (!matches || matches.length === 0) return null;
    if (matches.length === 1) return matches[0];

    const sph = Math.abs(parseFloat(sphere) || 0);
    const cyl = Math.abs(parseFloat(cylinder) || 0);

    // Score each match based on how close it is to the prescription
    const scoredMatches = matches.map(match => {
        let score = 0;
        const rangeStr = match.range;

        if (rangeStr.includes('to')) {
            // For range matches, prefer smaller ranges (more specific)
            const parts = rangeStr.split('to').map(part => {
                const cleaned = part.trim().replace(/[^0-9.-]/g, '');
                return parseFloat(cleaned);
            });

            if (parts.length === 2) {
                const [val1, val2] = parts;
                const rangeSize = Math.abs(val1 - val2);
                score = 100 - rangeSize; // Smaller range = higher score
            }
        } else if (rangeStr.includes('/') || rangeStr.includes(',')) {
            // For specific combinations, check exact match proximity
            const numbers = rangeStr.match(/-?\d+\.?\d*/g);
            if (numbers && numbers.length >= 2) {
                const rangeSph = parseFloat(numbers[0]);
                const rangeCyl = parseFloat(numbers[1]);

                const sphDiff = Math.abs(sph - Math.abs(rangeSph));
                const cylDiff = Math.abs(cyl - Math.abs(rangeCyl));
                score = 100 - (sphDiff + cylDiff) * 10; // Closer match = higher score
            }
        } else if (rangeStr.includes('sph')) {
            // For single sphere values
            const value = parseFloat(rangeStr.replace(/[^0-9.-]/g, ''));
            const diff = Math.abs(sph - Math.abs(value));
            score = 100 - diff * 10;
        }

        return { ...match, score };
    });

    // Return the match with the highest score (most specific/closest)
    return scoredMatches.reduce((best, current) =>
        current.score > best.score ? current : best
    );
};

/**
 * Find matching lens options from brand data
 * @param {object} brandData - Brand data object
 * @param {number} sphere - Sphere value
 * @param {number} cylinder - Cylinder value
 * @param {number} axis - Axis value
 * @returns {object} Calculation results with best matches for original and transposed
 */
export const findLensOptions = (brandData, sphere, cylinder, axis) => {
    if (!brandData || !brandData.single_vision) {
        return { error: 'Brand data not available' };
    }

    const originalType = determinePrescriptionType(sphere, cylinder);
    const transposed = transposePrescription(sphere, cylinder, axis);
    const transposedType = determinePrescriptionType(transposed.sphere, transposed.cylinder);

    const results = {
        original: {
            prescription: { sphere: parseFloat(sphere), cylinder: parseFloat(cylinder), axis: parseFloat(axis) },
            type: originalType,
            matches: [],
            bestMatch: null
        },
        transposed: {
            prescription: transposed,
            type: transposedType,
            matches: [],
            bestMatch: null
        },
        priority: null,
        recommended: null
    };

    // Check ADD power first (priority 1)
    if (brandData["Bifocal KT"]) {
        const addMatches = brandData["Bifocal KT"].filter(item =>
            matchesRange(item.range, sphere, cylinder)
        );
        if (addMatches.length > 0) {
            const bestAddMatch = findBestMatch(addMatches, sphere, cylinder);
            results.priority = 'ADD Power';
            results.recommended = bestAddMatch ? [bestAddMatch] : addMatches.slice(0, 1);
            return results;
        }
    }

    // Check single vision categories
    const categories = ['Minus Comp', 'Plus Comp', 'SV Cross Comp'];

    // Find matches for original prescription
    if (brandData.single_vision[originalType]) {
        const originalMatches = brandData.single_vision[originalType].filter(item =>
            matchesRange(item.range, sphere, cylinder)
        );
        results.original.matches = originalMatches;
        results.original.bestMatch = findBestMatch(originalMatches, sphere, cylinder);
    }

    // Find matches for transposed prescription
    if (brandData.single_vision[transposedType]) {
        const transposedMatches = brandData.single_vision[transposedType].filter(item =>
            matchesRange(item.range, transposed.sphere, transposed.cylinder)
        );
        results.transposed.matches = transposedMatches;
        results.transposed.bestMatch = findBestMatch(transposedMatches, transposed.sphere, transposed.cylinder);
    }

    // Determine priority and recommendation (use best match only)
    if (results.original.bestMatch) {
        results.priority = `Single Vision - ${originalType}`;
        results.recommended = [results.original.bestMatch];
    } else if (results.transposed.bestMatch) {
        results.priority = `Single Vision - ${transposedType} (Transposed)`;
        results.recommended = [results.transposed.bestMatch];
    } else {
        // Fallback: try all categories with original values and get best match
        for (const category of categories) {
            if (brandData.single_vision[category]) {
                const fallbackMatches = brandData.single_vision[category].filter(item =>
                    matchesRange(item.range, sphere, cylinder)
                );
                if (fallbackMatches.length > 0) {
                    const bestFallback = findBestMatch(fallbackMatches, sphere, cylinder);
                    results.priority = `Single Vision - ${category} (Fallback)`;
                    results.recommended = bestFallback ? [bestFallback] : [fallbackMatches[0]];
                    break;
                }
            }
        }
    }

    return results;
};