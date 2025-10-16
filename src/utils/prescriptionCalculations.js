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

    const sph = parseFloat(sphere) || 0;
    const cyl = parseFloat(cylinder) || 0;
    const ax = parseFloat(axis) || 90;

    // Round to nearest 0.25 interval
    const roundToQuarter = (value) => {
        return Math.round(value * 4) / 4;
    };

    const newSphere = roundToQuarter(sph + cyl);
    const newCylinder = roundToQuarter(-cyl);
    let newAxis = ax;

    // Adjust axis by 90 degrees
    if (newAxis <= 90) {
        newAxis += 90;
    } else {
        newAxis -= 90;
    }

    return {
        sphere: newSphere,
        cylinder: newCylinder,
        axis: newAxis
    };
};

/**
 * Validate that values are in 0.25 intervals
 * @param {number} value - Value to validate
 * @returns {boolean} True if value is in 0.25 intervals
 */
export const validateQuarterInterval = (value) => {
    if (!value || value === "" || value === 0) return true; // Empty or zero is allowed
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    // Check if value is in 0.25 intervals
    return (Math.round(num * 4) / 4) === num;
};

/**
 * Generate range values in 0.25 increments from 0 to target value
 * @param {number} value - Target value
 * @returns {array} Array of values from 0 to target value in 0.25 steps
 */
export const generateRange = (value) => {
    if (!value || value === 0) return [0];

    const targetValue = parseFloat(value);
    const range = [];

    if (targetValue < 0) {
        // For negative values: [0, -0.25, -0.50, ..., targetValue]
        for (let i = 0; i >= targetValue; i -= 0.25) {
            range.push(Math.round(i * 100) / 100);
        }
    } else {
        // For positive values: [0, 0.25, 0.50, ..., targetValue]
        for (let i = 0; i <= targetValue; i += 0.25) {
            range.push(Math.round(i * 100) / 100);
        }
    }

    return range;
};

/**
 * Determine prescription type based on sphere and cylinder signs with updated priority
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

    // Both negative signs - Priority 1
    if (sph < 0 && cyl < 0) {
        return 'Minus Comp';
    }

    // Both positive signs - Priority 2  
    if (sph > 0 && cyl > 0) {
        return 'Plus Comp';
    }

    // Cross signs (different signs) - Priority 3
    if ((sph < 0 && cyl > 0) || (sph > 0 && cyl < 0)) {
        return 'SV Cross Comp';
    }

    // Default to Minus Comp
    return 'Minus Comp';
};

/**
 * Determine if prescription should use same sign category
 * @param {number} sphere - Sphere value  
 * @param {number} cylinder - Cylinder value
 * @param {number} transposedSphere - Transposed sphere value
 * @param {number} transposedCylinder - Transposed cylinder value
 * @returns {object} Category information with priority
 */
export const determineCategoryWithPriority = (sphere, cylinder, transposedSphere, transposedCylinder) => {
    const originalType = determinePrescriptionType(sphere, cylinder);
    const transposedType = determinePrescriptionType(transposedSphere, transposedCylinder);

    // Priority 1: Same signs (Minus) - if either original or transposed has both negative
    if (originalType === 'Minus Comp' || transposedType === 'Minus Comp') {
        return {
            category: 'Minus Comp',
            priority: 1,
            reason: 'Same signs priority: Both negative values found',
            useOriginal: originalType === 'Minus Comp',
            useTransposed: transposedType === 'Minus Comp'
        };
    }

    // Priority 2: Same signs (Plus) - if either original or transposed has both positive
    if (originalType === 'Plus Comp' || transposedType === 'Plus Comp') {
        return {
            category: 'Plus Comp',
            priority: 2,
            reason: 'Same signs priority: Both positive values found',
            useOriginal: originalType === 'Plus Comp',
            useTransposed: transposedType === 'Plus Comp'
        };
    }

    // Priority 3: Cross signs - only if both original AND transposed have cross signs
    if (originalType === 'SV Cross Comp' && transposedType === 'SV Cross Comp') {
        return {
            category: 'SV Cross Comp',
            priority: 3,
            reason: 'Cross signs: Original and transposed both have mixed signs',
            useOriginal: true,
            useTransposed: true
        };
    }

    // Fallback to Minus Comp
    return {
        category: 'Minus Comp',
        priority: 4,
        reason: 'Fallback to Minus Comp',
        useOriginal: true,
        useTransposed: false
    };
};

/**
 * Check if a prescription range matches the given sphere and cylinder values with precise matching
 * @param {string} rangeStr - Range string from data (e.g., "-6.0 to -2.0")
 * @param {number} sphere - Sphere value
 * @param {number} cylinder - Cylinder value
 * @returns {boolean} True if prescription fits precisely within the range
 */
/**
 * Check if a prescription range matches the given sphere and cylinder values
 * @param {string} rangeStr - Range string from data (e.g., "-6.0 to -2.0", "+3.0 to +2.0", "+1.75 to -2.0")
 * @param {number} sphere - Sphere value
 * @param {number} cylinder - Cylinder value
 * @returns {boolean} True if prescription fits within the range
 */
export const matchesRange = (rangeStr, sphere, cylinder) => {
    if (!rangeStr) return false;

    const sph = parseFloat(sphere) || 0;
    const cyl = parseFloat(cylinder) || 0;

    // Handle single sphere values (e.g., "-25.0 sph", "+18.0 sph")
    if (rangeStr.includes('sph')) {
        const match = rangeStr.match(/([+-]?\d+\.?\d*)\s*sph/);
        if (match) {
            const targetSph = parseFloat(match[1]);
            // For single sphere ranges, sphere should be close to target and cylinder should be small
            return Math.abs(sph - targetSph) <= 1.0 && Math.abs(cyl) <= 1.0;
        }
        return false;
    }

    // Handle "to" ranges (e.g., "-6.0 to -2.0", "+3.0 to +2.0", "+1.75 to -2.0")
    if (rangeStr.includes('to')) {
        const parts = rangeStr.split('to').map(part => part.trim());
        if (parts.length === 2) {
            const val1Match = parts[0].match(/([+-]?\d+\.?\d*)/);
            const val2Match = parts[1].match(/([+-]?\d+\.?\d*)/);

            if (val1Match && val2Match) {
                const sphereLimit = parseFloat(val1Match[1]); // First value is sphere range limit
                const cylinderLimit = parseFloat(val2Match[1]); // Second value is cylinder range limit

                // Sphere range check: from 0 to sphereLimit (or sphereLimit to 0 if negative)
                let sphInRange;
                if (sphereLimit < 0) {
                    // Negative sphere range: sphere should be from sphereLimit to 0 (e.g., -6.0 to 0)
                    sphInRange = sph <= 0 && sph >= sphereLimit;
                } else {
                    // Positive sphere range: sphere should be from 0 to sphereLimit (e.g., 0 to +3.0)
                    sphInRange = sph >= 0 && sph <= sphereLimit;
                }

                // Cylinder range check: from 0 to cylinderLimit (or cylinderLimit to 0 if negative)
                let cylInRange;
                if (cylinderLimit < 0) {
                    // Negative cylinder range: cylinder should be from cylinderLimit to 0 (e.g., -2.0 to 0)
                    cylInRange = cyl <= 0 && cyl >= cylinderLimit;
                } else {
                    // Positive cylinder range: cylinder should be from 0 to cylinderLimit (e.g., 0 to +2.0)
                    cylInRange = cyl >= 0 && cyl <= cylinderLimit;
                }

                return sphInRange && cylInRange;
            }
        }
    }

    // Handle ADD ranges (for bifocal/progressive)
    if (rangeStr.includes('ADD')) {
        const match = rangeStr.match(/([+-]?\d+\.?\d*)/);
        if (match) {
            const baseValue = parseFloat(match[1]);
            // For ADD ranges, check if sphere is within reasonable range
            return Math.abs(sph) <= Math.abs(baseValue) + 1.0;
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

    // Simply return the first match since matchesRange already validated the fit
    // The priority system in findLensOptions ensures we get the right category
    return matches[0];
};

/**
 * Find matching lens options from brand data with updated priority logic
 * @param {object} brandData - Brand data object
 * @param {number} sphere - Sphere value
 * @param {number} cylinder - Cylinder value  
 * @param {number} axis - Axis value
 * @param {boolean} hasAddPower - Whether this is for ADD/NV/DV calculation
 * @returns {object} Calculation results with best matches
 */
export const findLensOptions = (brandData, sphere, cylinder, axis, hasAddPower = false) => {
    if (!brandData) {
        return { error: 'Brand data not available' };
    }

    // Validate 0.25 intervals
    if (!validateQuarterInterval(sphere) || !validateQuarterInterval(cylinder)) {
        return { error: 'Values must be in 0.25 intervals (e.g., -0.25, -0.50, -0.75, etc.)' };
    }

    // Validation rules
    const sph = parseFloat(sphere) || 0;
    const cyl = parseFloat(cylinder) || 0;
    const ax = parseFloat(axis) || 0;

    // For ADD/NV/DV calculations - use Bifocal and Progressive data
    if (hasAddPower) {
        // Cylinder and axis validation for bifocal/progressive
        if (cyl !== 0 && (!axis || axis === "" || ax === 0)) {
            return { error: 'For bifocal/progressive calculations, axis is required when cylinder is entered' };
        }

        const bifocalMatches = brandData["Bifocal KT"] ?
            brandData["Bifocal KT"].filter(item => matchesRange(item.range, sphere, cylinder)) : [];

        const progressiveMatches = brandData["Progressive"] ?
            brandData["Progressive"].filter(item => matchesRange(item.range, sphere, cylinder)) : [];

        const allMatches = [...bifocalMatches, ...progressiveMatches];

        return {
            original: { sphere: sph, cylinder: cyl, axis: ax },
            transposed: transposePrescription(sphere, cylinder, axis),
            matches: allMatches,
            bestMatch: findBestMatch(allMatches, sphere, cylinder),
            priority: 'Bifocal/Progressive',
            searchStrategy: 'ADD power calculation - searched in Bifocal KT and Progressive data'
        };
    }

    // Single vision validation rules
    // 1. Axis not considered in single vision
    // 2. Only sphere entered (cylinder and axis empty) is allowed
    // 3. Cylinder entered with axis empty is allowed

    // Calculate transposed values
    const transposed = transposePrescription(sphere, cylinder || 0, axis || 90);

    const results = {
        original: { sphere: sph, cylinder: cyl, axis: ax },
        transposed: transposed,
        matches: [],
        bestMatch: null,
        searchStrategy: ''
    };

    if (!brandData.single_vision) {
        return { error: 'Single vision data not available' };
    }

    // NEW PRIORITY LOGIC: Try all categories in order: Minus Comp -> Plus Comp -> SV Cross Comp
    // For each category, try original values first, then transposed values

    // Priority 1: Try Minus Comp first (highest priority)
    if (brandData.single_vision["Minus Comp"]) {
        // Try original values first
        const originalMatches = brandData.single_vision["Minus Comp"].filter(item =>
            matchesRange(item.range, sph, cyl)
        );
        if (originalMatches.length > 0) {
            results.matches = originalMatches;
            results.bestMatch = findBestMatch(originalMatches, sph, cyl);
            results.searchStrategy = 'Priority 1: Minus Comp (Original values)';
            results.categoryInfo = { category: 'Minus Comp', priority: 1 };
            return results;
        }

        // Try transposed values
        const transposedMatches = brandData.single_vision["Minus Comp"].filter(item =>
            matchesRange(item.range, transposed.sphere, transposed.cylinder)
        );
        if (transposedMatches.length > 0) {
            results.matches = transposedMatches;
            results.bestMatch = findBestMatch(transposedMatches, transposed.sphere, transposed.cylinder);
            results.searchStrategy = 'Priority 1: Minus Comp (Transposed values)';
            results.categoryInfo = { category: 'Minus Comp', priority: 1 };
            return results;
        }
    }

    // Priority 2: Try Plus Comp second
    if (brandData.single_vision["Plus Comp"]) {
        // Try original values first
        const originalMatches = brandData.single_vision["Plus Comp"].filter(item =>
            matchesRange(item.range, sph, cyl)
        );
        if (originalMatches.length > 0) {
            results.matches = originalMatches;
            results.bestMatch = findBestMatch(originalMatches, sph, cyl);
            results.searchStrategy = 'Priority 2: Plus Comp (Original values)';
            results.categoryInfo = { category: 'Plus Comp', priority: 2 };
            return results;
        }

        // Try transposed values
        const transposedMatches = brandData.single_vision["Plus Comp"].filter(item =>
            matchesRange(item.range, transposed.sphere, transposed.cylinder)
        );
        if (transposedMatches.length > 0) {
            results.matches = transposedMatches;
            results.bestMatch = findBestMatch(transposedMatches, transposed.sphere, transposed.cylinder);
            results.searchStrategy = 'Priority 2: Plus Comp (Transposed values)';
            results.categoryInfo = { category: 'Plus Comp', priority: 2 };
            return results;
        }
    }

    // Priority 3: Try SV Cross Comp last
    if (brandData.single_vision["SV Cross Comp"]) {
        // Try original values first
        const originalMatches = brandData.single_vision["SV Cross Comp"].filter(item =>
            matchesRange(item.range, sph, cyl)
        );
        if (originalMatches.length > 0) {
            results.matches = originalMatches;
            results.bestMatch = findBestMatch(originalMatches, sph, cyl);
            results.searchStrategy = 'Priority 3: SV Cross Comp (Original values)';
            results.categoryInfo = { category: 'SV Cross Comp', priority: 3 };
            return results;
        }

        // Try transposed values
        const transposedMatches = brandData.single_vision["SV Cross Comp"].filter(item =>
            matchesRange(item.range, transposed.sphere, transposed.cylinder)
        );
        if (transposedMatches.length > 0) {
            results.matches = transposedMatches;
            results.bestMatch = findBestMatch(transposedMatches, transposed.sphere, transposed.cylinder);
            results.searchStrategy = 'Priority 3: SV Cross Comp (Transposed values)';
            results.categoryInfo = { category: 'SV Cross Comp', priority: 3 };
            return results;
        }
    }

    // No matches found
    results.searchStrategy = 'No matches found in any category';
    return results;
};