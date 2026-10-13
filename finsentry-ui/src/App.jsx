
import { useEffect, useState } from "react";
import "./App.css";
import Login from "./pages/Login";

const API_BASE_URL = "http://localhost:8080";

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Customers fetched from PostgreSQL through Spring Boot
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check whether the user already has a valid session
  const checkAuth = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/me`,
        {
          credentials: "include"
        }
      );

      if (!response.ok) {
        setUser(null);
        return;
      }

      const data = await response.json();
      setUser(data);
    } catch (err) {
      console.error("Authentication check failed:", err);
      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  };

  // Check authentication when the application loads
  useEffect(() => {
    checkAuth();
  }, []);

  // Fetch customers after successful authentication
  useEffect(() => {
    if (!user) {
      setCustomers([]);
      setSelectedCustomerId("");
      return;
    }

    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/customers`,
          {
            credentials: "include"
          }
        );

        if (!response.ok) {
          if (
            response.status === 401 ||
            response.status === 403
          ) {
            throw new Error(
              "Your session has expired. Please login again."
            );
          }

          throw new Error("Failed to fetch customers.");
        }

        const data = await response.json();

        setCustomers(data);

        // Select the first customer by default
        setSelectedCustomerId(
          data.length > 0 ? String(data[0].id) : ""
        );
      } catch (err) {
        console.error("Customer fetch failed:", err);
        setError(err.message);
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, [user]);

  // Get the currently selected customer
  const selectedCustomer = customers.find(
    (customer) =>
      String(customer.id) === selectedCustomerId
  );

  // Handle customer selection
  const handleCustomerChange = (e) => {
    setSelectedCustomerId(e.target.value);
    setResult(null);
    setError(null);
  };

  // Analyze the selected customer's financial data
  const analyzeRisk = async () => {
    if (!selectedCustomer) {
      setError("Please select a customer first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/finsentry/agent/customer/${selectedCustomer.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({})
        }
      );

      if (!response.ok) {
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          throw new Error(
            "Your session has expired. Please login again."
          );
        }

        throw new Error("Failed to analyze customer.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // While checking the existing session
  if (checkingAuth) {
    return (
      <div className="app">
        <main className="container">
          <h2>Loading...</h2>
        </main>
      </div>
    );
  }

  // User is not authenticated
  if (!user) {
    return <Login onLogin={checkAuth} />;
  }

  // User is authenticated
  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>FinSentry AI</h1>
          <p>Financial Distress Assessment</p>
        </div>

        <div>
          <p>
            Logged in as: <strong>{user.username}</strong>
          </p>

          <p>
            Role: <strong>{user.role}</strong>
          </p>

          <button
            onClick={async () => {
              try {
                await fetch(
                  `${API_BASE_URL}/api/auth/logout`,
                  {
                    method: "POST",
                    credentials: "include"
                  }
                );
              } finally {
                setUser(null);
                setResult(null);
                setError(null);
              }
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="container">
        {/* Customer Selection */}

        <section className="card">
          <h2>Select Customer</h2>

          <div className="form-group">
            <label htmlFor="customer">
              Customer
            </label>

            <select
              id="customer"
              value={selectedCustomerId}
              onChange={handleCustomerChange}
              disabled={
                loadingCustomers ||
                customers.length === 0
              }
            >
              <option value="">
                {loadingCustomers
                  ? "Loading customers..."
                  : customers.length === 0
                    ? "No customers available"
                    : "Select a customer"}
              </option>

              {customers.map((customer) => (
                <option
                  key={customer.id}
                  value={String(customer.id)}
                >
                  {customer.customerCode} - {customer.fullName}
                </option>
              ))}
            </select>
          </div>

          {selectedCustomer && (
            <>
              <h2>Customer Financial Data</h2>

              <div className="form-grid">
                <div className="form-group">
                  <label>Customer Code</label>
                  <p>{selectedCustomer.customerCode}</p>
                </div>

                <div className="form-group">
                  <label>Full Name</label>
                  <p>{selectedCustomer.fullName}</p>
                </div>

                <div className="form-group">
                  <label>Salary Trend</label>
                  <p>{selectedCustomer.salaryTrend}</p>
                </div>

                <div className="form-group">
                  <label>Credit Utilization</label>
                  <p>
                    {selectedCustomer.creditUtilization}%
                  </p>
                </div>

                <div className="form-group">
                  <label>Missed EMIs</label>
                  <p>{selectedCustomer.missedEmis}</p>
                </div>

                <div className="form-group">
                  <label>Balance Change</label>
                  <p>
                    {selectedCustomer.balanceChange}%
                  </p>
                </div>
              </div>
            </>
          )}

          <button
            className="analyze-button"
            onClick={analyzeRisk}
            disabled={
              loading ||
              loadingCustomers ||
              !selectedCustomer
            }
          >
            {loading
              ? "Analyzing..."
              : "Analyze Financial Risk"}
          </button>
        </section>

        {/* Error */}

        {error && (
          <section className="error">
            <strong>Error:</strong> {error}
          </section>
        )}

        {/* Results */}

        {result && (
          <section className="results">
            <div className="score-card">
              <div>
                <p className="label">
                  Financial Health Score
                </p>

                <div className="score">
                  {result.financialHealthScore}
                  <span>/100</span>
                </div>
              </div>

              <div className="risk">
                <p className="label">Risk Level</p>
                <h2>{result.riskLevel}</h2>
              </div>
            </div>

            <div className="card">
              <h2>Risk Factors</h2>
              <ul>
                {result.riskFactors.map((factor, index) => (
                  <li key={index}>{factor}</li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h2>Root Cause</h2>
              <p>{result.rootCause}</p>
            </div>

            <div className="card">
              <h2>Recommended Actions</h2>
              <ul>
                {result.recommendedActions.map(
                  (action, index) => (
                    <li key={index}>{action}</li>
                  )
                )}
              </ul>
            </div>

            <div className="card">
              <h2>Policy Sources</h2>
              <ul>
                {result.sources.map((source, index) => (
                  <li key={index}>{source}</li>
                ))}
              </ul>
            </div>

            {result.humanReviewRequired && (
              <div className="review-warning">
                ⚠ Human Review Required

                <p>
                  All recommended actions must undergo
                  human review before execution.
                </p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
