import React, { useState, useEffect } from "react";
import { availableBrands, loadBrandData, getBrandById } from '../utils/brandDataLoader';
import { findLensOptions, transposePrescription, determinePrescriptionType } from '../utils/prescriptionCalculations';

const OpticalStoreAppUI = () => {
  // Brand selection state
  const [selectedBrand, setSelectedBrand] = useState("enterprise");
  const [brandData, setBrandData] = useState(null);
  const [isLoadingBrand, setIsLoadingBrand] = useState(true);

  // UI state only for controlled inputs
  const [calculationMode, setCalculationMode] = useState("single");
  const [prescription, setPrescription] = useState({
    sphere: "",
    cylinder: "",
    axis: "",
    add: "",
    type: "DV",
  });
  const [dvPrescription, setDvPrescription] = useState({
    sphere: "",
    cylinder: "",
    axis: "",
  });
  const [nvPrescription, setNvPrescription] = useState({
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
      } finally {
        setIsLoadingBrand(false);
      }
    };
    
    loadData();
  }, [selectedBrand]);

  // Handle brand change
  const handleBrandChange = (event) => {
    setSelectedBrand(event.target.value);
    setCalculationResults(null); // Clear previous results
  };

  // Handle single vision calculation
  const handleSingleVisionCalculation = () => {
    if (!brandData) {
      setCalculationError('Brand data not loaded');
      return;
    }

    if (!prescription.sphere || !prescription.cylinder || !prescription.axis) {
      setCalculationError('Please fill in all prescription fields (Sphere, Cylinder, Axis)');
      return;
    }

    setIsCalculating(true);
    setCalculationError(null);

    try {
      const results = findLensOptions(
        brandData,
        prescription.sphere,
        prescription.cylinder,
        prescription.axis
      );

      setCalculationResults(results);
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

  // Dummy placeholders for rendering (no logic)
  const results = null;

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
                          <small className="text-muted mt-1 d-block">
                            <i className="fas fa-spinner fa-spin mr-1"></i>
                            Loading brand data...
                          </small>
                        )}
                        {brandData && (
                          <small className="text-success mt-1 d-block">
                            <i className="fas fa-check-circle mr-1"></i>
                            {brandData.brand} data loaded successfully
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculation Mode Selection */}
              <div className="row mb-4">
                <div className="col-12">
                  <h5>Select Calculation Mode:</h5>
                  <div className="btn-group btn-group-toggle w-100" data-toggle="buttons">
                    <label
                      className={`btn btn-outline-primary ${calculationMode === "single" ? "active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="mode"
                        value="single"
                        checked={calculationMode === "single"}
                        onChange={(e) => setCalculationMode(e.target.value)}
                      />
                      Single Prescription
                    </label>
                    <label
                      className={`btn btn-outline-primary ${calculationMode === "add-calculation" ? "active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="mode"
                        value="add-calculation"
                        checked={calculationMode === "add-calculation"}
                        onChange={(e) => setCalculationMode(e.target.value)}
                      />
                      ADD Power Calculation
                    </label>
                    <label
                      className={`btn btn-outline-primary ${calculationMode === "nv-calculation" ? "active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="mode"
                        value="nv-calculation"
                        checked={calculationMode === "nv-calculation"}
                        onChange={(e) => setCalculationMode(e.target.value)}
                      />
                      Near Vision Calculation
                    </label>
                  </div>
                </div>
              </div>

              {/* Input Forms */}
              {calculationMode === "single" && (
                <div className="row">
                  <div className="col-lg-6 col-md-8 col-12">
                    <div className="card">
                      <div className="card-header bg-info text-white">
                        <h5 className="mb-0">Prescription Input</h5>
                      </div>
                      <div className="card-body">
                        {calculationError && (
                          <div className="alert alert-danger">
                            <i className="fas fa-exclamation-triangle mr-2"></i>
                            {calculationError}
                          </div>
                        )}
                        
                        <div className="form-group">
                          <label htmlFor="sphere">Sphere (Sph)</label>
                          <input
                            id="sphere"
                            type="number"
                            step="0.25"
                            className="form-control"
                            value={prescription.sphere}
                            onChange={(e) => {
                              setPrescription({
                                ...prescription,
                                sphere: e.target.value,
                              });
                              clearResults();
                            }}
                            placeholder="e.g., -0.25, +2.0"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="cylinder">Cylinder (Cyl)</label>
                          <input
                            id="cylinder"
                            type="number"
                            step="0.25"
                            className="form-control"
                            value={prescription.cylinder}
                            onChange={(e) => {
                              setPrescription({
                                ...prescription,
                                cylinder: e.target.value,
                              });
                              clearResults();
                            }}
                            placeholder="e.g., -1.0, +1.25"
                          />
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
                            onChange={(e) => {
                              setPrescription({
                                ...prescription,
                                axis: e.target.value,
                              });
                              clearResults();
                            }}
                            placeholder="1-180°"
                          />
                        </div>
                        
                        <div className="d-flex gap-2">
                          <button 
                            className="btn btn-primary flex-fill"
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
                              className="btn btn-outline-secondary"
                              onClick={clearResults}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {calculationMode === "add-calculation" && (
                <div className="row">
                  <div className="col-md-6 col-12 mb-3">
                    <div className="card">
                      <div className="card-header bg-success text-white">
                        <h5 className="mb-0">Distance Vision (DV)</h5>
                      </div>
                      <div className="card-body">
                        <div className="form-group">
                          <label htmlFor="dv-sphere">Sphere</label>
                          <input
                            id="dv-sphere"
                            type="number"
                            step="0.25"
                            className="form-control"
                            value={dvPrescription.sphere}
                            onChange={(e) =>
                              setDvPrescription({
                                ...dvPrescription,
                                sphere: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="dv-cylinder">Cylinder</label>
                          <input
                            id="dv-cylinder"
                            type="number"
                            step="0.25"
                            className="form-control"
                            value={dvPrescription.cylinder}
                            onChange={(e) =>
                              setDvPrescription({
                                ...dvPrescription,
                                cylinder: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="dv-axis">Axis</label>
                          <input
                            id="dv-axis"
                            type="number"
                            min="1"
                            max="180"
                            className="form-control"
                            value={dvPrescription.axis}
                            onChange={(e) =>
                              setDvPrescription({
                                ...dvPrescription,
                                axis: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 col-12 mb-3">
                    <div className="card">
                      <div className="card-header bg-warning text-dark">
                        <h5 className="mb-0">Near Vision (NV)</h5>
                      </div>
                      <div className="card-body">
                        <div className="form-group">
                          <label htmlFor="nv-sphere">Sphere</label>
                          <input
                            id="nv-sphere"
                            type="number"
                            step="0.25"
                            className="form-control"
                            value={nvPrescription.sphere}
                            onChange={(e) =>
                              setNvPrescription({
                                ...nvPrescription,
                                sphere: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="nv-cylinder">Cylinder</label>
                          <input
                            id="nv-cylinder"
                            type="number"
                            step="0.25"
                            className="form-control"
                            value={nvPrescription.cylinder}
                            onChange={(e) =>
                              setNvPrescription({
                                ...nvPrescription,
                                cylinder: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="nv-axis">Axis</label>
                          <input
                            id="nv-axis"
                            type="number"
                            min="1"
                            max="180"
                            className="form-control"
                            value={nvPrescription.axis}
                            onChange={(e) =>
                              setNvPrescription({
                                ...nvPrescription,
                                axis: e.target.value,
                              })
                            }
                          />
                        </div>
                        <button className="btn btn-success btn-block">
                          Calculate ADD Power
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {calculationMode === "nv-calculation" && (
                <div className="row">
                  <div className="col-md-6 col-12 mb-3">
                    <div className="card">
                      <div className="card-header bg-success text-white">
                        <h5 className="mb-0">Distance Vision (DV)</h5>
                      </div>
                      <div className="card-body">
                        <div className="form-group">
                          <label htmlFor="dv2-sphere">Sphere</label>
                          <input
                            id="dv2-sphere"
                            type="number"
                            step="0.25"
                            className="form-control"
                            value={dvPrescription.sphere}
                            onChange={(e) =>
                              setDvPrescription({
                                ...dvPrescription,
                                sphere: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="dv2-cylinder">Cylinder</label>
                          <input
                            id="dv2-cylinder"
                            type="number"
                            step="0.25"
                            className="form-control"
                            value={dvPrescription.cylinder}
                            onChange={(e) =>
                              setDvPrescription({
                                ...dvPrescription,
                                cylinder: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="dv2-axis">Axis</label>
                          <input
                            id="dv2-axis"
                            type="number"
                            min="1"
                            max="180"
                            className="form-control"
                            value={dvPrescription.axis}
                            onChange={(e) =>
                              setDvPrescription({
                                ...dvPrescription,
                                axis: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 col-12 mb-3">
                    <div className="card">
                      <div className="card-header bg-info text-white">
                        <h5 className="mb-0">ADD Power</h5>
                      </div>
                      <div className="card-body">
                        <div className="form-group">
                          <label htmlFor="add-power">ADD Value</label>
                          <input
                            id="add-power"
                            type="number"
                            step="0.25"
                            className="form-control"
                            value={prescription.add}
                            onChange={(e) =>
                              setPrescription({
                                ...prescription,
                                add: e.target.value,
                              })
                            }
                            placeholder="e.g., +1.25, +2.0"
                          />
                        </div>
                        <button className="btn btn-info btn-block mt-4">
                          Calculate Near Vision
                        </button>
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
                        {/* Priority Information */}
                        <div className="alert alert-info">
                          <h6 className="alert-heading">
                            <i className="fas fa-star mr-2"></i>
                            Recommended Category: {calculationResults.priority || 'No matches found'}
                          </h6>
                          <p className="mb-0">
                            Based on prescription analysis and priority rules
                            {calculationResults.recommended && calculationResults.recommended.length === 1 && 
                              <span className="ml-2"><i className="fas fa-bullseye text-success"></i> <strong>Best match selected</strong></span>
                            }
                          </p>
                        </div>

                        <div className="row">
                          {/* Original Prescription */}
                          <div className="col-md-6 mb-3">
                            <div className="card">
                              <div className="card-header bg-primary text-white">
                                <h6 className="mb-0">
                                  Original Prescription
                                </h6>
                              </div>
                              <div className="card-body">
                                <p><strong>Sphere:</strong> {calculationResults.original.prescription.sphere}</p>
                                <p><strong>Cylinder:</strong> {calculationResults.original.prescription.cylinder}</p>
                                <p><strong>Axis:</strong> {calculationResults.original.prescription.axis}°</p>
                                <p><strong>Type:</strong> {calculationResults.original.type}</p>
                                <p><strong>Total Matches:</strong> {calculationResults.original.matches.length}</p>
                                {calculationResults.original.bestMatch && (
                                  <p><strong>Best Range:</strong> <span className="badge badge-primary">{calculationResults.original.bestMatch.range}</span></p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Transposed Prescription */}
                          <div className="col-md-6 mb-3">
                            <div className="card">
                              <div className="card-header bg-secondary text-white">
                                <h6 className="mb-0">
                                  Transposed Prescription
                                </h6>
                              </div>
                              <div className="card-body">
                                <p><strong>Sphere:</strong> {calculationResults.transposed.prescription.sphere}</p>
                                <p><strong>Cylinder:</strong> {calculationResults.transposed.prescription.cylinder}</p>
                                <p><strong>Axis:</strong> {calculationResults.transposed.prescription.axis}°</p>
                                <p><strong>Type:</strong> {calculationResults.transposed.type}</p>
                                <p><strong>Total Matches:</strong> {calculationResults.transposed.matches.length}</p>
                                {calculationResults.transposed.bestMatch && (
                                  <p><strong>Best Range:</strong> <span className="badge badge-secondary">{calculationResults.transposed.bestMatch.range}</span></p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Recommended Options */}
                        {calculationResults.recommended && calculationResults.recommended.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-success">
                              <i className="fas fa-glasses mr-2"></i>
                              Best Matching Lens Option
                              {calculationResults.recommended && calculationResults.recommended.length > 1 && 
                                <small className="text-muted ml-2">({calculationResults.recommended.length} matches)</small>
                              }
                            </h5>
                            <div className="table-responsive">
                              <table className="table table-striped table-hover">
                                <thead className="thead-dark">
                                  <tr>
                                    <th>Range</th>
                                    <th>HC</th>
                                    <th>ARC</th>
                                    <th>HC PG</th>
                                    <th>ARC PG</th>
                                    <th>ARC POLY</th>
                                    <th>BLUCUT</th>
                                    <th>BLUCUT PC POLY</th>
                                    <th>ARC 1.67</th>
                                    <th>BLUCUT 1.67</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {calculationResults.recommended.map((option, index) => (
                                    <tr key={index}>
                                      <td className="font-weight-bold">{option.range}</td>
                                      <td>{option.HC || '-'}</td>
                                      <td>{option.ARC || '-'}</td>
                                      <td>{option.HC_PG || '-'}</td>
                                      <td>{option.ARC_PG || '-'}</td>
                                      <td>{option.ARC_POLY || '-'}</td>
                                      <td>{option.BLUCUT || '-'}</td>
                                      <td>{option.BLUCUT_PC_POLY || '-'}</td>
                                      <td>{option.ARC_1_67 || '-'}</td>
                                      <td>{option.BLUCUT_1_67 || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* No Results Message */}
                        {(!calculationResults.recommended || calculationResults.recommended.length === 0) && (
                          <div className="alert alert-warning">
                            <h6 className="alert-heading">
                              <i className="fas fa-exclamation-triangle mr-2"></i>
                              No Lens Options Found
                            </h6>
                            <p className="mb-0">
                              No matching lens options were found for this prescription in the current brand data. 
                              Please check the prescription values or try a different brand.
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
                        Brand Information & Priority Logic
                      </h5>
                    </div>
                    <div className="card-body">
                      {/* Brand Information */}
                      {brandData && (
                        <div className="row mb-4">
                          <div className="col-12">
                            <div className="alert alert-info">
                              <h6 className="alert-heading">
                                <i className="fas fa-tag mr-2"></i>
                                Currently Loaded Brand: {brandData.brand}
                              </h6>
                              <p className="mb-0">
                                Data file: {getBrandById(selectedBrand)?.dataFile} | 
                                Categories available: {Object.keys(brandData).filter(key => key !== 'brand').length}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="row">
                        <div className="col-lg-6 col-12 mb-3">
                          <h6 className="text-primary">
                            Priority Order (Using Original Values Only):
                          </h6>
                          <ul className="list-unstyled">
                            <li>
                              <strong>1. ADD Power:</strong> If ADD/NV/DV →
                              Bifocal KT first
                            </li>
                            <li>
                              <strong>2. Zero Cylinder:</strong> Negative →
                              Minus Comp, Positive → Plus Comp
                            </li>
                            <li>
                              <strong>3. Same Signs (-, -):</strong> → Minus
                              Comp (Single Vision)
                            </li>
                            <li>
                              <strong>4. Same Signs (+, +):</strong> → Plus
                              Comp (Single Vision)
                            </li>
                            <li>
                              <strong>5. Cross Signs:</strong> → SV Cross Comp
                              (if transposed also crossed)
                            </li>
                            <li>
                              <strong>6. Fallback:</strong> Try all categories
                              with original values
                            </li>
                          </ul>
                        </div>
                        <div className="col-lg-6 col-12 mb-3">
                          <h6 className="text-success">
                            Updated Data Structure:
                          </h6>
                          <ul className="list-unstyled">
                            <li>
                              <strong>Single Vision:</strong>
                            </li>
                            <li>
                              &nbsp;&nbsp;- Minus Comp (negative
                              prescriptions)
                            </li>
                            <li>
                              &nbsp;&nbsp;- Plus Comp (positive prescriptions)
                            </li>
                            <li>
                              &nbsp;&nbsp;- SV Cross Comp (crossed signs)
                            </li>
                            <li>
                              <strong>Bifocal KT:</strong> For ADD power
                              prescriptions
                            </li>
                            <li>
                              <strong>Range Display:</strong> Shows as "Single
                              Vision - [Type]"
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample Calculations Panel */}
              <div className="row mt-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header bg-dark text-white">
                      <h5 className="mb-0">
                        <i className="fas fa-calculator mr-2"></i>
                        Updated Examples
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-lg-4 col-md-6 col-12 mb-3">
                          <div className="card border-primary">
                            <div className="card-header bg-primary text-white">
                              <h6 className="mb-0">Minus Comp Example</h6>
                            </div>
                            <div className="card-body">
                              <p>
                                <strong>Input:</strong> Sph -2.5, Cyl -1.0,
                                Axis 90°
                              </p>
                              <p>
                                <strong>Expected:</strong> Single Vision -
                                Minus Comp
                              </p>
                              <p>
                                <strong>Rule:</strong> Both negative signs
                              </p>
                                <button
                                  className="btn btn-sm btn-outline-primary btn-block"
                                  onClick={() => {
                                    setPrescription({
                                      sphere: "-2.5",
                                      cylinder: "-1.0",
                                      axis: "90",
                                      add: "",
                                      type: "DV",
                                    });
                                    setCalculationMode("single");
                                    clearResults();
                                  }}
                                >
                                  Try This Example
                                </button>
                            </div>
                          </div>
                        </div>

                        <div className="col-lg-4 col-md-6 col-12 mb-3">
                          <div className="card border-success">
                            <div className="card-header bg-success text-white">
                              <h6 className="mb-0">Plus Comp Example</h6>
                            </div>
                            <div className="card-body">
                              <p>
                                <strong>Input:</strong> Sph +2.5, Cyl +1.5,
                                Axis 180°
                              </p>
                              <p>
                                <strong>Expected:</strong> Single Vision -
                                Plus Comp
                              </p>
                              <p>
                                <strong>Rule:</strong> Both positive signs
                              </p>
                                <button
                                  className="btn btn-sm btn-outline-success btn-block"
                                  onClick={() => {
                                    setPrescription({
                                      sphere: "2.5",
                                      cylinder: "1.5",
                                      axis: "180",
                                      add: "",
                                      type: "DV",
                                    });
                                    setCalculationMode("single");
                                    clearResults();
                                  }}
                                >
                                  Try This Example
                                </button>
                            </div>
                          </div>
                        </div>

                        <div className="col-lg-4 col-md-6 col-12 mb-3">
                          <div className="card border-info">
                            <div className="card-header bg-info text-white">
                              <h6 className="mb-0">SV Cross Comp Example</h6>
                            </div>
                            <div className="card-body">
                              <p>
                                <strong>Input:</strong> Sph +1.0, Cyl -1.5,
                                Axis 90°
                              </p>
                              <p>
                                <strong>Expected:</strong> Single Vision - SV
                                Cross Comp
                              </p>
                              <p>
                                <strong>Rule:</strong> Crossed signs (+/-)
                              </p>
                                <button
                                  className="btn btn-sm btn-outline-info btn-block"
                                  onClick={() => {
                                    setPrescription({
                                      sphere: "1.0",
                                      cylinder: "-1.5",
                                      axis: "90",
                                      add: "",
                                      type: "DV",
                                    });
                                    setCalculationMode("single");
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
              {/* End UI */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpticalStoreAppUI;