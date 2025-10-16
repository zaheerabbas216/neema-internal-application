import React, { useState, useEffect } from "react";
import { availableBrands, loadBrandData } from '../utils/brandDataLoader';
import { findLensOptions, validateQuarterInterval } from '../utils/prescriptionCalculations';

const OpticalStoreAppUI = () => {
  // Brand selection state
  const [selectedBrand, setSelectedBrand] = useState("enterprise");
  const [brandData, setBrandData] = useState(null);
  const [isLoadingBrand, setIsLoadingBrand] = useState(true);

  // Single prescription state
  const [prescription, setPrescription] = useState({
    sphere: "",
    cylinder: "",
    axis: "",
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

  // Clear results
  const clearResults = () => {
    setCalculationResults(null);
    setCalculationError(null);
  };

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h2 className="mb-0">
                <i className="fas fa-eye mr-2"></i>
                Optical Store - Single Prescription Calculator
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

              {/* Single Prescription Input */}
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
                          <div className="col-md-6 mb-3">
                            <div className="card">
                              <div className="card-header bg-primary text-white">
                                <h6 className="mb-0">Original Prescription</h6>
                              </div>
                              <div className="card-body">
                                <p><strong>Sphere:</strong> {calculationResults.original.sphere}</p>
                                <p><strong>Cylinder:</strong> {calculationResults.original.cylinder}</p>
                                <p><strong>Axis:</strong> {calculationResults.original.axis}°</p>
                                {calculationResults.categoryInfo && (
                                  <p><strong>Category:</strong> {calculationResults.categoryInfo.category}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Transposed Prescription */}
                          <div className="col-md-6 mb-3">
                            <div className="card">
                              <div className="card-header bg-secondary text-white">
                                <h6 className="mb-0">Transposed Prescription</h6>
                              </div>
                              <div className="card-body">
                                <p><strong>Sphere:</strong> {calculationResults.transposed.sphere}</p>
                                <p><strong>Cylinder:</strong> {calculationResults.transposed.cylinder}</p>
                                <p><strong>Axis:</strong> {calculationResults.transposed.axis}°</p>
                                <small className="text-muted">Used for category determination</small>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Best Match */}
                        {calculationResults.bestMatch && (
                          <div className="mt-4">
                            <h5 className="text-success">
                              <i className="fas fa-star mr-2"></i>
                              Best Matching Lens Option
                            </h5>
                            <div className="card">
                              <div className="card-body">
                                <h6 className="card-title">Range: {calculationResults.bestMatch.range}</h6>
                                <div className="row">
                                  {Object.entries(calculationResults.bestMatch).map(([key, value]) => {
                                    if (key !== 'range' && value !== undefined) {
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
                        {calculationResults.matches && calculationResults.matches.length > 1 && (
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
                                      <h6 className="card-title">{match.range}</h6>
                                      <div className="row">
                                        {Object.entries(match).map(([key, value]) => {
                                          if (key !== 'range' && value !== undefined) {
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
                        )}

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

              {/* Information Panel */}
              <div className="row mt-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header bg-secondary text-white">
                      <h5 className="mb-0">
                        <i className="fas fa-info-circle mr-2"></i>
                        Priority Logic & Rules
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <h6 className="text-primary">Priority Order:</h6>
                          <ul className="list-unstyled">
                            <li><strong>1. Minus Comp:</strong> Same negative signs (both - sphere and - cylinder)</li>
                            <li><strong>2. Plus Comp:</strong> Same positive signs (both + sphere and + cylinder)</li>
                            <li><strong>3. SV Cross Comp:</strong> Mixed signs that remain mixed after transpose</li>
                          </ul>
                        </div>
                        <div className="col-md-6">
                          <h6 className="text-success">Validation Rules:</h6>
                          <ul className="list-unstyled">
                            <li><strong>0.25 Intervals:</strong> All values must be in 0.25 increments</li>
                            <li><strong>Sphere Required:</strong> Sphere value is mandatory</li>
                            <li><strong>Cylinder Optional:</strong> Can be empty (treated as 0)</li>
                            <li><strong>Axis Optional:</strong> Not considered in single vision</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Examples */}
              <div className="row mt-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header bg-dark text-white">
                      <h5 className="mb-0">
                        <i className="fas fa-calculator mr-2"></i>
                        Example Prescriptions
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-4">
                          <div className="card border-danger">
                            <div className="card-header bg-danger text-white">
                              <h6 className="mb-0">Minus Comp Example</h6>
                            </div>
                            <div className="card-body">
                              <p><strong>Input:</strong> Sph -2.5, Cyl -1.0</p>
                              <p><strong>Expected:</strong> Minus Comp category</p>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => {
                                  setPrescription({
                                    sphere: "-2.5",
                                    cylinder: "-1.0",
                                    axis: "90",
                                  });
                                  clearResults();
                                }}
                              >
                                Try This Example
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="col-md-4">
                          <div className="card border-success">
                            <div className="card-header bg-success text-white">
                              <h6 className="mb-0">Plus Comp Example</h6>
                            </div>
                            <div className="card-body">
                              <p><strong>Input:</strong> Sph +2.5, Cyl +1.5</p>
                              <p><strong>Expected:</strong> Plus Comp category</p>
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() => {
                                  setPrescription({
                                    sphere: "2.5",
                                    cylinder: "1.5",
                                    axis: "180",
                                  });
                                  clearResults();
                                }}
                              >
                                Try This Example
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="col-md-4">
                          <div className="card border-info">
                            <div className="card-header bg-info text-white">
                              <h6 className="mb-0">Cross Comp Example</h6>
                            </div>
                            <div className="card-body">
                              <p><strong>Input:</strong> Sph +1.0, Cyl -1.5</p>
                              <p><strong>Expected:</strong> SV Cross Comp category</p>
                              <button
                                className="btn btn-sm btn-outline-info"
                                onClick={() => {
                                  setPrescription({
                                    sphere: "1.0",
                                    cylinder: "-1.5",
                                    axis: "90",
                                  });
                                  clearResults();
                                }}
                              >
                                Try This Example
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpticalStoreAppUI;