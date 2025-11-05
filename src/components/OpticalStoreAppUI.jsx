import React, { useState, useEffect } from "react";
import { availableBrands, loadBrandData } from '../utils/brandDataLoader';
import { findLensOptions, findAddPowerOptions, findNearVisionOptions, findCylKTOptions, findCompKTOptions, findProgressiveCylOptions, findProgressiveCompOptions, validateQuarterInterval } from '../utils/prescriptionCalculations';

const OpticalStoreAppUI = () => {
  // Brand selection state
  const [selectedBrand, setSelectedBrand] = useState("enterprise");
  const [brandData, setBrandData] = useState(null);
  const [isLoadingBrand, setIsLoadingBrand] = useState(true);

  // Calculation mode state
  const [calculationMode, setCalculationMode] = useState("single");

  // Single prescription state
  const [prescription, setPrescription] = useState({
    sphere: "",
    cylinder: "",
    axis: "",
  });

  // ADD calculation state
  const [addCalculation, setAddCalculation] = useState({
    distanceVision: { sphere: "", cylinder: "", axis: "" },
    nearVision: { sphere: "", cylinder: "", axis: "" },
    addPower: ""
  });

  // Near Vision calculation state
  const [nearVisionCalculation, setNearVisionCalculation] = useState({
    distanceVision: { sphere: "", cylinder: "", axis: "" },
    nearVision: { sphere: "", cylinder: "", axis: "" },
    addPower: ""
  });

  // Calculation results state
  const [calculationResults, setCalculationResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState(null);

  // Load brand data when brand changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingBrand(true);
      try {
        const data = await loadBrandData(selectedBrand);
        setBrandData(data);
      } catch (error) {
        console.error('Error loading brand data:', error);
        setCalculationError('Error loading brand data: ' + error.message);
      } finally {
        setIsLoadingBrand(false);
      }
    };

    loadData();
  }, [selectedBrand]);

  // Handle brand change
  const handleBrandChange = (event) => {
    setSelectedBrand(event.target.value);
    setCalculationResults(null);
    setCalculationError(null);
  };

  // Handle calculation mode change
  const handleModeChange = (mode) => {
    setCalculationMode(mode);
    setCalculationResults(null);
    setCalculationError(null);
  };

  // Handle single vision calculation
  const handleSingleVisionCalculation = () => {
    if (!brandData) {
      setCalculationError('Brand data not loaded');
      return;
    }

    // Validation: Sphere is required
    if (!prescription.sphere || prescription.sphere === "") {
      setCalculationError('Sphere value is required');
      return;
    }

    // Validate 0.25 intervals
    if (!validateQuarterInterval(prescription.sphere) ||
      !validateQuarterInterval(prescription.cylinder)) {
      setCalculationError('Values must be in 0.25 intervals (e.g., -0.25, -0.50, -0.75, etc.)');
      return;
    }

    const cylinderValue = prescription.cylinder || "0";
    const axisValue = prescription.axis || "90";

    setIsCalculating(true);
    setCalculationError(null);

    try {
      const results = findLensOptions(
        brandData,
        prescription.sphere,
        cylinderValue,
        axisValue,
        false // hasAddPower = false for single vision
      );

      if (results.error) {
        setCalculationError(results.error);
        setCalculationResults(null);
      } else {
        setCalculationResults(results);
      }
    } catch (error) {
      setCalculationError('Error calculating lens options: ' + error.message);
    } finally {
      setIsCalculating(false);
    }
  };

  // Handle ADD power calculation (Bi-Focal KT)
  const handleAddCalculation = () => {
    if (!brandData) {
      setCalculationError('Brand data not loaded');
      return;
    }

    // Get values, defaulting to 0 if empty
    const dvSphere = parseFloat(addCalculation.distanceVision.sphere) || 0;
    const dvCylinder = parseFloat(addCalculation.distanceVision.cylinder) || 0;
    const dvAxis = parseFloat(addCalculation.distanceVision.axis) || 0;
    const nvSphere = parseFloat(addCalculation.nearVision.sphere) || 0;
    const nvCylinder = parseFloat(addCalculation.nearVision.cylinder) || 0;
    const nvAxis = parseFloat(addCalculation.nearVision.axis) || 0;
    let addPower = parseFloat(addCalculation.addPower) || 0;

    // Auto-calculate ADD if empty: ADD = NV - DV
    if ((!addCalculation.addPower || addCalculation.addPower === "") &&
      (addCalculation.nearVision.sphere && addCalculation.nearVision.sphere !== "")) {
      addPower = nvSphere - dvSphere;
      // Update the state to show calculated value
      setAddCalculation({
        ...addCalculation,
        addPower: addPower.toFixed(2)
      });
    }

    // Check if cylinder value is provided - determine which calculation type
    if (dvCylinder !== 0 || nvCylinder !== 0) {
      // Use whichever cylinder is non-zero
      const cylToUse = dvCylinder !== 0 ? dvCylinder : nvCylinder;
      const axisToUse = dvCylinder !== 0 ? dvAxis : nvAxis;

      setIsCalculating(true);
      setCalculationError(null);

      try {
        let results;

        // If sphere is also provided, use COMP_KT calculation
        if (dvSphere !== 0) {
          // COMP_KT calculation (sphere + cylinder + axis)
          results = findCompKTOptions(
            brandData,
            dvSphere,
            cylToUse,
            axisToUse,
            nvSphere !== 0 ? nvSphere : null,
            addPower !== 0 ? addPower : null
          );
        } else {
          // CYL_KT calculation (only cylinder + axis)
          results = findCylKTOptions(brandData, cylToUse, axisToUse);
        }

        if (results.error) {
          setCalculationError(results.error);
          setCalculationResults(null);
        } else {
          setCalculationResults(results);
        }
      } catch (error) {
        setCalculationError('Error calculating lens options: ' + error.message);
      } finally {
        setIsCalculating(false);
      }
      return;
    }

    // Validate 0.25 intervals
    if (!validateQuarterInterval(dvSphere) ||
      !validateQuarterInterval(addPower)) {
      setCalculationError('Values must be in 0.25 intervals (e.g., -0.25, -0.50, -0.75, etc.)');
      return;
    }

    // Validate ADD Power range (must be between +1.0 and +3.0)
    if (addPower < 1.0 || addPower > 3.0) {
      setCalculationError('ADD Power must be between +1.0 and +3.0');
      return;
    }

    setIsCalculating(true);
    setCalculationError(null);

    try {
      const results = findAddPowerOptions(
        brandData,
        {
          sphere: dvSphere.toString(),
          cylinder: "0"
        },
        addPower.toString()
      );

      if (results.error) {
        setCalculationError(results.error);
        setCalculationResults(null);
      } else {
        setCalculationResults(results);
      }
    } catch (error) {
      setCalculationError('Error calculating lens options: ' + error.message);
    } finally {
      setIsCalculating(false);
    }
  };

  // Handle Near Vision calculation (Progressive)
  const handleNearVisionCalculation = () => {
    if (!brandData) {
      setCalculationError('Brand data not loaded');
      return;
    }

    const dvSphere = parseFloat(nearVisionCalculation.distanceVision.sphere) || 0;
    const dvCylinder = parseFloat(nearVisionCalculation.distanceVision.cylinder) || 0;
    const dvAxis = parseFloat(nearVisionCalculation.distanceVision.axis) || 0;
    const nvSphere = parseFloat(nearVisionCalculation.nearVision.sphere) || 0;
    const addPower = parseFloat(nearVisionCalculation.addPower) || 0;

    // Determine calculation type based on input
    // Progressive COMP: sphere + cylinder + axis all provided
    // Progressive CYL: only cylinder + axis (sphere = 0)
    // Progressive SPH: only sphere (cylinder = 0)

    if (dvCylinder !== 0) {
      // Check if sphere is also provided → Progressive COMP
      if (dvSphere !== 0) {
        // Progressive COMP calculation

        // Validate required fields
        if (!nearVisionCalculation.distanceVision.sphere || nearVisionCalculation.distanceVision.sphere === "") {
          setCalculationError('DV Sphere value is required for Progressive COMP');
          return;
        }

        if (!nearVisionCalculation.distanceVision.cylinder || nearVisionCalculation.distanceVision.cylinder === "") {
          setCalculationError('DV Cylinder value is required for Progressive COMP');
          return;
        }

        if (!nearVisionCalculation.distanceVision.axis || nearVisionCalculation.distanceVision.axis === "") {
          setCalculationError('DV Axis value is required for Progressive COMP');
          return;
        }

        // Validate 0.25 intervals
        if (!validateQuarterInterval(nearVisionCalculation.distanceVision.sphere) ||
          !validateQuarterInterval(nearVisionCalculation.distanceVision.cylinder)) {
          setCalculationError('Sphere and Cylinder values must be in 0.25 intervals (e.g., -0.25, -0.50, -0.75, etc.)');
          return;
        }

        setIsCalculating(true);
        setCalculationError(null);

        try {
          const results = findProgressiveCompOptions(
            brandData,
            nearVisionCalculation.distanceVision.sphere,
            nearVisionCalculation.distanceVision.cylinder,
            nearVisionCalculation.distanceVision.axis,
            nvSphere !== 0 ? nvSphere : null,
            addPower !== 0 ? addPower : null
          );

          if (results.error) {
            setCalculationError(results.error);
            setCalculationResults(null);
          } else {
            setCalculationResults(results);
          }
        } catch (error) {
          setCalculationError('Error calculating Progressive COMP options: ' + error.message);
        } finally {
          setIsCalculating(false);
        }
        return;
      } else {
        // Progressive CYL calculation (cylinder + axis, no sphere)

        // Validate required fields
        if (!nearVisionCalculation.distanceVision.cylinder || nearVisionCalculation.distanceVision.cylinder === "") {
          setCalculationError('DV Cylinder value is required for Progressive CYL');
          return;
        }

        if (!nearVisionCalculation.distanceVision.axis || nearVisionCalculation.distanceVision.axis === "") {
          setCalculationError('DV Axis value is required for Progressive CYL');
          return;
        }

        // Validate 0.25 intervals
        if (!validateQuarterInterval(nearVisionCalculation.distanceVision.cylinder)) {
          setCalculationError('Cylinder value must be in 0.25 intervals (e.g., -0.25, -0.50, -0.75, etc.)');
          return;
        }

        setIsCalculating(true);
        setCalculationError(null);

        try {
          const results = findProgressiveCylOptions(
            brandData,
            nearVisionCalculation.distanceVision.cylinder,
            nearVisionCalculation.distanceVision.axis
          );

          if (results.error) {
            setCalculationError(results.error);
            setCalculationResults(null);
          } else {
            setCalculationResults(results);
          }
        } catch (error) {
          setCalculationError('Error calculating Progressive CYL options: ' + error.message);
        } finally {
          setIsCalculating(false);
        }
        return;
      }
    }

    // Progressive SPH calculation (original logic)

    // Validation for Progressive SPH
    if (!nearVisionCalculation.distanceVision.sphere || nearVisionCalculation.distanceVision.sphere === "") {
      setCalculationError('Distance Vision Sphere value is required');
      return;
    }

    if (!nearVisionCalculation.addPower || nearVisionCalculation.addPower === "") {
      setCalculationError('ADD Power value is required');
      return;
    }

    // Validate ADD Power range (must be between +1.0 and +3.0)
    const addPowerValue = parseFloat(nearVisionCalculation.addPower);
    if (addPowerValue < 1.0 || addPowerValue > 3.0) {
      setCalculationError('ADD Power must be between +1.0 and +3.0');
      return;
    }

    // Validate 0.25 intervals
    if (!validateQuarterInterval(nearVisionCalculation.distanceVision.sphere) ||
      !validateQuarterInterval(nearVisionCalculation.addPower)) {
      setCalculationError('Values must be in 0.25 intervals (e.g., -0.25, -0.50, -0.75, etc.)');
      return;
    }

    setIsCalculating(true);
    setCalculationError(null);

    try {
      const results = findNearVisionOptions(
        brandData,
        {
          sphere: nearVisionCalculation.distanceVision.sphere,
          cylinder: nearVisionCalculation.distanceVision.cylinder || "0"
        },
        nearVisionCalculation.addPower
      );

      if (results.error) {
        setCalculationError(results.error);
        setCalculationResults(null);
      } else {
        setCalculationResults(results);
      }
    } catch (error) {
      setCalculationError('Error calculating lens options: ' + error.message);
    } finally {
      setIsCalculating(false);
    }
  };

  // Clear results
  const clearResults = () => {
    setCalculationResults(null);
    setCalculationError(null);

    // Clear input fields based on current calculation mode
    if (calculationMode === "single") {
      setPrescription({
        sphere: "",
        cylinder: "",
        axis: "",
      });
    } else if (calculationMode === "add-calculation") {
      setAddCalculation({
        distanceVision: { sphere: "", cylinder: "", axis: "" },
        nearVision: { sphere: "", cylinder: "", axis: "" },
        addPower: ""
      });
    } else if (calculationMode === "nv-calculation") {
      setNearVisionCalculation({
        distanceVision: { sphere: "", cylinder: "", axis: "" },
        nearVision: { sphere: "", cylinder: "", axis: "" },
        addPower: ""
      });
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h2 className="mb-0">
                <i className="fas fa-eye mr-2"></i>
                Optical Store - Lens Calculator & Prescription Manager
              </h2>
            </div>

            <div className="card-body">
              {/* Brand Selection */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header bg-dark text-white">
                      <h5 className="mb-0">
                        <i className="fas fa-building mr-2"></i>
                        Brand Selection
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="form-group mb-0">
                        <label htmlFor="brandSelect" className="font-weight-bold">
                          Select Brand:
                        </label>
                        <select
                          id="brandSelect"
                          className="form-control"
                          value={selectedBrand}
                          onChange={handleBrandChange}
                          disabled={isLoadingBrand}
                        >
                          {availableBrands.map((brand) => (
                            <option key={brand.id} value={brand.id}>
                              {brand.name}
                            </option>
                          ))}
                        </select>
                        {isLoadingBrand && (
                          <small className="text-muted">Loading brand data...</small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculation Mode Selection */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header bg-secondary text-white">
                      <h5 className="mb-0">
                        <i className="fas fa-calculator mr-2"></i>
                        Select Calculation Mode
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="btn-group btn-group-toggle w-100" data-toggle="buttons">
                        <label className={`btn btn-outline-primary ${calculationMode === "single" ? "active" : ""}`}>
                          <input
                            type="radio"
                            name="mode"
                            value="single"
                            checked={calculationMode === "single"}
                            onChange={(e) => handleModeChange(e.target.value)}
                          />
                          Single Prescription
                        </label>
                        <label className={`btn btn-outline-primary ${calculationMode === "add-calculation" ? "active" : ""}`}>
                          <input
                            type="radio"
                            name="mode"
                            value="add-calculation"
                            checked={calculationMode === "add-calculation"}
                            onChange={(e) => handleModeChange(e.target.value)}
                          />
                          Bi-Focal KT
                        </label>
                        <label className={`btn btn-outline-primary ${calculationMode === "nv-calculation" ? "active" : ""}`}>
                          <input
                            type="radio"
                            name="mode"
                            value="nv-calculation"
                            checked={calculationMode === "nv-calculation"}
                            onChange={(e) => handleModeChange(e.target.value)}
                          />
                          Progressive
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {calculationError && (
                <div className="alert alert-danger">
                  <h6 className="alert-heading">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Calculation Error
                  </h6>
                  <p className="mb-0">{calculationError}</p>
                </div>
              )}

              {/* Input Forms */}
              {calculationMode === "single" && (
                <div className="row">
                  <div className="col-md-6">
                    <div className="card">
                      <div className="card-header bg-info text-white">
                        <h5 className="mb-0">Single Prescription Input</h5>
                      </div>
                      <div className="card-body">
                        <div className="form-group">
                          <label htmlFor="sphere">Sphere (Sph) *</label>
                          <input
                            id="sphere"
                            type="number"
                            step="0.25"
                            className="form-control"
                            value={prescription.sphere}
                            onChange={(e) =>
                              setPrescription({
                                ...prescription,
                                sphere: e.target.value,
                              })
                            }
                            placeholder="e.g., -2.50, +1.25"
                          />
                          <small className="text-muted">Required. Must be in 0.25 intervals.</small>
                        </div>
                        <div className="form-group">
                          <label htmlFor="cylinder">Cylinder (Cyl)</label>
                          <input
                            id="cylinder"
                            type="number"
                            step="0.25"
                            className="form-control"
                            value={prescription.cylinder}
                            onChange={(e) =>
                              setPrescription({
                                ...prescription,
                                cylinder: e.target.value,
                              })
                            }
                            placeholder="e.g., -1.00, +0.75 (optional)"
                          />
                          <small className="text-muted">Optional. Must be in 0.25 intervals if entered.</small>
                        </div>
                        <div className="form-group">
                          <label htmlFor="axis">Axis</label>
                          <input
                            id="axis"
                            type="number"
                            min="1"
                            max="180"
                            className="form-control"
                            value={prescription.axis}
                            onChange={(e) =>
                              setPrescription({
                                ...prescription,
                                axis: e.target.value,
                              })
                            }
                            placeholder="1-180° (optional for single vision)"
                          />
                          <small className="text-muted">Optional. Not considered in single vision calculations.</small>
                        </div>
                        <button
                          className="btn btn-primary btn-block"
                          onClick={handleSingleVisionCalculation}
                          disabled={isCalculating || isLoadingBrand}
                        >
                          {isCalculating ? (
                            <>
                              <i className="fas fa-spinner fa-spin mr-2"></i>
                              Calculating...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-calculator mr-2"></i>
                              Calculate & Find Lenses
                            </>
                          )}
                        </button>
                        {calculationResults && (
                          <button
                            className="btn btn-secondary btn-block mt-2"
                            onClick={clearResults}
                          >
                            Clear Results
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bi-Focal KT Input Form */}
              {calculationMode === "add-calculation" && (
                <div className="row">
                  <div className="col-md-12">
                    <div className="card">
                      <div className="card-header bg-warning text-dark">
                        <h5 className="mb-0">Bi-Focal KT Input</h5>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-4">
                            <h6 className="text-primary">Distance Vision (DV)</h6>
                            <div className="form-group">
                              <label>DV Sphere (Sph)</label>
                              <input
                                type="number"
                                step="0.25"
                                className="form-control"
                                value={addCalculation.distanceVision.sphere}
                                onChange={(e) => {
                                  const dvSph = e.target.value;
                                  const newAddCalc = {
                                    ...addCalculation,
                                    distanceVision: {
                                      ...addCalculation.distanceVision,
                                      sphere: dvSph,
                                    },
                                  };

                                  // Auto-calculate NV if ADD is provided: NV = DV + ADD
                                  if (addCalculation.addPower && addCalculation.addPower !== "") {
                                    const dv = parseFloat(dvSph) || 0;
                                    const add = parseFloat(addCalculation.addPower) || 0;
                                    const nv = dv + add;
                                    newAddCalc.nearVision = {
                                      ...newAddCalc.nearVision,
                                      sphere: nv.toFixed(2)
                                    };
                                  }

                                  setAddCalculation(newAddCalc);
                                }}
                                placeholder="e.g., -2.50, +1.25"
                              />
                            </div>
                            <div className="form-group">
                              <label>DV Cylinder (Cyl)</label>
                              <input
                                type="number"
                                step="0.25"
                                className="form-control"
                                value={addCalculation.distanceVision.cylinder}
                                onChange={(e) =>
                                  setAddCalculation({
                                    ...addCalculation,
                                    distanceVision: {
                                      ...addCalculation.distanceVision,
                                      cylinder: e.target.value,
                                    },
                                    nearVision: {
                                      ...addCalculation.nearVision,
                                      cylinder: e.target.value,
                                    },
                                  })
                                }
                                placeholder="e.g., -1.00, +0.75 (optional)"
                              />
                            </div>
                            <div className="form-group">
                              <label>DV Axis</label>
                              <input
                                type="number"
                                min="1"
                                max="180"
                                className="form-control"
                                value={addCalculation.distanceVision.axis}
                                onChange={(e) =>
                                  setAddCalculation({
                                    ...addCalculation,
                                    distanceVision: {
                                      ...addCalculation.distanceVision,
                                      axis: e.target.value,
                                    },
                                    nearVision: {
                                      ...addCalculation.nearVision,
                                      axis: e.target.value,
                                    },
                                  })
                                }
                                placeholder="1-180° (optional)"
                              />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <h6 className="text-success">Near Vision (NV)</h6>
                            <div className="form-group">
                              <label>NV Sphere (Sph)</label>
                              <input
                                type="number"
                                step="0.25"
                                className="form-control"
                                value={addCalculation.nearVision.sphere}
                                onChange={(e) => {
                                  const nvSph = e.target.value;
                                  const newAddCalc = {
                                    ...addCalculation,
                                    nearVision: {
                                      ...addCalculation.nearVision,
                                      sphere: nvSph,
                                    },
                                  };

                                  // Auto-calculate ADD if DV is provided: ADD = NV - DV
                                  if (addCalculation.distanceVision.sphere && addCalculation.distanceVision.sphere !== "") {
                                    const nv = parseFloat(nvSph) || 0;
                                    const dv = parseFloat(addCalculation.distanceVision.sphere) || 0;
                                    const add = nv - dv;
                                    newAddCalc.addPower = add.toFixed(2);
                                  }

                                  setAddCalculation(newAddCalc);
                                }}
                                placeholder="e.g., -1.50, +2.00"
                              />
                            </div>
                            <div className="form-group">
                              <label>NV Cylinder (Cyl)</label>
                              <input
                                type="number"
                                step="0.25"
                                className="form-control"
                                value={addCalculation.nearVision.cylinder}
                                onChange={(e) =>
                                  setAddCalculation({
                                    ...addCalculation,
                                    nearVision: {
                                      ...addCalculation.nearVision,
                                      cylinder: e.target.value,
                                    },
                                  })
                                }
                                placeholder="e.g., -0.50, +1.00 (optional)"
                              />
                            </div>
                            <div className="form-group">
                              <label>NV Axis</label>
                              <input
                                type="number"
                                min="1"
                                max="180"
                                className="form-control"
                                value={addCalculation.nearVision.axis}
                                onChange={(e) =>
                                  setAddCalculation({
                                    ...addCalculation,
                                    nearVision: {
                                      ...addCalculation.nearVision,
                                      axis: e.target.value,
                                    },
                                  })
                                }
                                placeholder="1-180° (optional)"
                              />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <h6 className="text-info">ADD Power</h6>
                            <div className="form-group">
                              <label>ADD Power</label>
                              <input
                                type="number"
                                step="0.25"
                                className="form-control"
                                value={addCalculation.addPower}
                                onChange={(e) => {
                                  const addPwr = e.target.value;
                                  const newAddCalc = {
                                    ...addCalculation,
                                    addPower: addPwr,
                                  };

                                  // Auto-calculate NV if DV is provided: NV = DV + ADD
                                  if (addCalculation.distanceVision.sphere && addCalculation.distanceVision.sphere !== "") {
                                    const dv = parseFloat(addCalculation.distanceVision.sphere) || 0;
                                    const add = parseFloat(addPwr) || 0;
                                    const nv = dv + add;
                                    newAddCalc.nearVision = {
                                      ...newAddCalc.nearVision,
                                      sphere: nv.toFixed(2)
                                    };
                                  }

                                  setAddCalculation(newAddCalc);
                                }}
                                placeholder="e.g., +1.00, +2.50"
                              />
                              <small className="text-muted">Auto-calculated from NV - DV if empty</small>
                            </div>
                          </div>
                        </div>
                        <button
                          className="btn btn-warning btn-block"
                          onClick={handleAddCalculation}
                          disabled={isCalculating || isLoadingBrand}
                        >
                          {isCalculating ? (
                            <>
                              <i className="fas fa-spinner fa-spin mr-2"></i>
                              Calculating...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-plus mr-2"></i>
                              Calculate Bi-Focal KT Lenses
                            </>
                          )}
                        </button>
                        {calculationResults && (
                          <button
                            className="btn btn-secondary btn-block mt-2"
                            onClick={clearResults}
                          >
                            Clear Results
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Progressive Input Form */}
              {calculationMode === "nv-calculation" && (
                <div className="row">
                  <div className="col-md-12">
                    <div className="card">
                      <div className="card-header bg-success text-white">
                        <h5 className="mb-0">Progressive Input</h5>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          {/* Distance Vision Column */}
                          <div className="col-md-4">
                            <h6 className="text-primary">Distance Vision (DV)</h6>
                            <div className="form-group">
                              <label>DV Sphere (Sph)</label>
                              <input
                                type="number"
                                step="0.25"
                                className="form-control"
                                value={nearVisionCalculation.distanceVision.sphere}
                                onChange={(e) => {
                                  const dvSph = e.target.value;
                                  const newNVCalc = {
                                    ...nearVisionCalculation,
                                    distanceVision: {
                                      ...nearVisionCalculation.distanceVision,
                                      sphere: dvSph,
                                    },
                                  };

                                  // Auto-calculate NV if ADD is provided: NV = DV + ADD
                                  if (nearVisionCalculation.addPower && nearVisionCalculation.addPower !== "") {
                                    const dv = parseFloat(dvSph) || 0;
                                    const add = parseFloat(nearVisionCalculation.addPower) || 0;
                                    const nv = dv + add;
                                    newNVCalc.nearVision = {
                                      ...newNVCalc.nearVision,
                                      sphere: nv.toFixed(2)
                                    };
                                  }

                                  setNearVisionCalculation(newNVCalc);
                                }}
                                placeholder="e.g., -2.50, +1.25"
                              />
                            </div>
                            <div className="form-group">
                              <label>DV Cylinder (Cyl)</label>
                              <input
                                type="number"
                                step="0.25"
                                className="form-control"
                                value={nearVisionCalculation.distanceVision.cylinder}
                                onChange={(e) =>
                                  setNearVisionCalculation({
                                    ...nearVisionCalculation,
                                    distanceVision: {
                                      ...nearVisionCalculation.distanceVision,
                                      cylinder: e.target.value,
                                    },
                                    nearVision: {
                                      ...nearVisionCalculation.nearVision,
                                      cylinder: e.target.value,
                                    },
                                  })
                                }
                                placeholder="e.g., -1.00, +0.75 (optional)"
                              />
                            </div>
                            <div className="form-group">
                              <label>DV Axis</label>
                              <input
                                type="number"
                                min="1"
                                max="180"
                                className="form-control"
                                value={nearVisionCalculation.distanceVision.axis}
                                onChange={(e) =>
                                  setNearVisionCalculation({
                                    ...nearVisionCalculation,
                                    distanceVision: {
                                      ...nearVisionCalculation.distanceVision,
                                      axis: e.target.value,
                                    },
                                    nearVision: {
                                      ...nearVisionCalculation.nearVision,
                                      axis: e.target.value,
                                    },
                                  })
                                }
                                placeholder="1-180° (optional)"
                              />
                            </div>
                          </div>

                          {/* Near Vision Column */}
                          <div className="col-md-4">
                            <h6 className="text-success">Near Vision (NV)</h6>
                            <div className="form-group">
                              <label>NV Sphere (Sph)</label>
                              <input
                                type="number"
                                step="0.25"
                                className="form-control"
                                value={nearVisionCalculation.nearVision.sphere}
                                onChange={(e) => {
                                  const nvSph = e.target.value;
                                  const newNVCalc = {
                                    ...nearVisionCalculation,
                                    nearVision: {
                                      ...nearVisionCalculation.nearVision,
                                      sphere: nvSph,
                                    },
                                  };

                                  // Auto-calculate ADD if DV is provided: ADD = NV - DV
                                  if (nearVisionCalculation.distanceVision.sphere && nearVisionCalculation.distanceVision.sphere !== "") {
                                    const nv = parseFloat(nvSph) || 0;
                                    const dv = parseFloat(nearVisionCalculation.distanceVision.sphere) || 0;
                                    const add = nv - dv;
                                    newNVCalc.addPower = add.toFixed(2);
                                  }

                                  setNearVisionCalculation(newNVCalc);
                                }}
                                placeholder="e.g., -1.50, +2.00"
                              />
                            </div>
                            <div className="form-group">
                              <label>NV Cylinder (Cyl)</label>
                              <input
                                type="number"
                                step="0.25"
                                className="form-control"
                                value={nearVisionCalculation.nearVision.cylinder}
                                readOnly
                                placeholder="Auto-synced from DV"
                              />
                            </div>
                            <div className="form-group">
                              <label>NV Axis</label>
                              <input
                                type="number"
                                min="1"
                                max="180"
                                className="form-control"
                                value={nearVisionCalculation.nearVision.axis}
                                readOnly
                                placeholder="Auto-synced from DV"
                              />
                            </div>
                          </div>

                          {/* ADD Power Column */}
                          <div className="col-md-4">
                            <h6 className="text-info">ADD Power</h6>
                            <div className="form-group">
                              <label>ADD Power</label>
                              <input
                                type="number"
                                step="0.25"
                                className="form-control"
                                value={nearVisionCalculation.addPower}
                                onChange={(e) => {
                                  const addPwr = e.target.value;
                                  const newNVCalc = {
                                    ...nearVisionCalculation,
                                    addPower: addPwr,
                                  };

                                  // Auto-calculate NV if DV is provided: NV = DV + ADD
                                  if (nearVisionCalculation.distanceVision.sphere && nearVisionCalculation.distanceVision.sphere !== "") {
                                    const dv = parseFloat(nearVisionCalculation.distanceVision.sphere) || 0;
                                    const add = parseFloat(addPwr) || 0;
                                    const nv = dv + add;
                                    newNVCalc.nearVision = {
                                      ...newNVCalc.nearVision,
                                      sphere: nv.toFixed(2)
                                    };
                                  }

                                  setNearVisionCalculation(newNVCalc);
                                }}
                                placeholder="e.g., +1.00, +2.50"
                              />
                              <small className="text-muted">Auto-calculated from NV - DV if empty</small>
                            </div>
                          </div>
                        </div>
                        <button
                          className="btn btn-success btn-block"
                          onClick={handleNearVisionCalculation}
                          disabled={isCalculating || isLoadingBrand}
                        >
                          {isCalculating ? (
                            <>
                              <i className="fas fa-spinner fa-spin mr-2"></i>
                              Calculating...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-eye mr-2"></i>
                              Calculate Progressive Lenses
                            </>
                          )}
                        </button>
                        {calculationResults && (
                          <button
                            className="btn btn-secondary btn-block mt-2"
                            onClick={clearResults}
                          >
                            Clear Results
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Results Section */}
              {calculationResults && (
                <div className="row mt-4">
                  <div className="col-12">
                    <div className="card border-success">
                      <div className="card-header bg-success text-white">
                        <h4 className="mb-0">
                          <i className="fas fa-check-circle mr-2"></i>
                          Prescription Results
                        </h4>
                      </div>
                      <div className="card-body">
                        {/* Search Strategy */}
                        {calculationResults.searchStrategy && (
                          <div className="alert alert-info">
                            <h6 className="alert-heading">
                              <i className="fas fa-info-circle mr-2"></i>
                              Search Strategy
                            </h6>
                            <p className="mb-0">{calculationResults.searchStrategy}</p>
                          </div>
                        )}

                        <div className="row">
                          {/* Original Prescription */}
                          <div className={`${calculationResults.transposed ? 'col-md-6' : 'col-md-12'} mb-3`}>
                            <div className="card">
                              <div className="card-header bg-primary text-white">
                                <h6 className="mb-0">Original Prescription</h6>
                              </div>
                              <div className="card-body">
                                {calculationResults.original.sphere !== undefined && (
                                  <p><strong>Sphere:</strong> {calculationResults.original.sphere}</p>
                                )}
                                {calculationResults.original.cylinder !== undefined && (
                                  <p><strong>Cylinder:</strong> {calculationResults.original.cylinder}</p>
                                )}
                                {calculationResults.original.axis !== undefined && (
                                  <p><strong>Axis:</strong> {calculationResults.original.axis}°</p>
                                )}
                                {calculationResults.mappedAxis && !calculationResults.calculatedAdd && !calculationResults.calculatedNV && (
                                  <p><strong>Mapped Axis (CYL_KT):</strong> {calculationResults.mappedAxis}°</p>
                                )}
                                {calculationResults.mappedAxis && (calculationResults.calculatedAdd || calculationResults.calculatedNV) && (
                                  <p><strong>Mapped Axis (COMP_KT):</strong> {calculationResults.mappedAxis}°</p>
                                )}
                                {calculationResults.original.addPower && (
                                  <p><strong>ADD Power:</strong> {calculationResults.original.addPower}</p>
                                )}
                                {calculationResults.calculatedAdd && (
                                  <p><strong>Calculated ADD:</strong> {calculationResults.calculatedAdd}</p>
                                )}
                                {calculationResults.calculatedNV && (
                                  <p><strong>Calculated NV Sphere:</strong> {calculationResults.calculatedNV}</p>
                                )}
                                {calculationResults.categoryInfo && (
                                  <p><strong>Category:</strong> {calculationResults.categoryInfo.category}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Transposed Prescription - For Single Vision and COMP_KT */}
                          {calculationResults.transposed && (
                            <div className="col-md-6 mb-3">
                              <div className="card">
                                <div className="card-header bg-secondary text-white">
                                  <h6 className="mb-0">Transposed Prescription</h6>
                                </div>
                                <div className="card-body">
                                  <p><strong>Sphere:</strong> {calculationResults.transposed.sphere}</p>
                                  <p><strong>Cylinder:</strong> {calculationResults.transposed.cylinder}</p>
                                  <p><strong>Axis:</strong> {calculationResults.transposed.axis}°</p>
                                  {(calculationResults.calculatedAdd || calculationResults.calculatedNV) ? (
                                    <small className="text-muted">Used for priority matching (COMP_KT)</small>
                                  ) : (
                                    <small className="text-muted">Used for category determination</small>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Best Match */}
                        {calculationResults.bestMatch && (
                          <div className="mt-4">
                            <h5 className="text-success">
                              <i className="fas fa-star mr-2"></i>
                              Best Matching Lens Option
                              {calculationResults.bestMatch.isTransposed && (
                                <span className="badge badge-info ml-2">Transposed Match</span>
                              )}
                            </h5>
                            <div className="card">
                              <div className="card-body">
                                <h6 className="card-title">Range: {calculationResults.bestMatch.range}</h6>
                                <div className="row">
                                  {Object.entries(calculationResults.bestMatch).map(([key, value]) => {
                                    if (key !== 'range' && key !== 'isTransposed' && value !== undefined) {
                                      return (
                                        <div key={key} className="col-md-3 col-sm-6 mb-2">
                                          <div className="text-center">
                                            <small className="text-muted d-block">{key}</small>
                                            <span className="text-success font-weight-bold">₹{value}</span>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* All Matches */}
                        {/* {calculationResults.matches && calculationResults.matches.length > 1 && (
                          <div className="mt-4">
                            <h6 className="text-info">
                              <i className="fas fa-list mr-2"></i>
                              All Matching Ranges ({calculationResults.matches.length} found)
                            </h6>
                            <div className="row">
                              {calculationResults.matches.map((match, index) => (
                                <div key={index} className="col-md-6 col-lg-4 mb-3">
                                  <div className="card h-100">
                                    <div className="card-body">
                                      <h6 className="card-title">
                                        {match.range}
                                        {match.isTransposed && (
                                          <span className="badge badge-info ml-2 small">Transposed</span>
                                        )}
                                      </h6>
                                      <div className="row">
                                        {Object.entries(match).map(([key, value]) => {
                                          if (key !== 'range' && key !== 'isTransposed' && value !== undefined) {
                                            return (
                                              <div key={key} className="col-6 mb-1">
                                                <small className="text-muted">{key}:</small>
                                                <br />
                                                <span className="text-success font-weight-bold">₹{value}</span>
                                              </div>
                                            );
                                          }
                                          return null;
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )} */}

                        {/* No Results Message */}
                        {(!calculationResults.bestMatch && (!calculationResults.matches || calculationResults.matches.length === 0)) && (
                          <div className="alert alert-warning">
                            <h6 className="alert-heading">
                              <i className="fas fa-exclamation-triangle mr-2"></i>
                              No Lens Options Found
                            </h6>
                            <p className="mb-0">
                              No matching lens ranges found for the given prescription. Please check the values or try a different brand.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpticalStoreAppUI;