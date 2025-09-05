import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import "./App.css";

const API = import.meta.env.VITE_API_URL;;

function App() {
  const [tenants, setTenants] = useState([]);
  const [bills, setBills] = useState([]);
  const [dashboard, setDashboard] = useState([]);
  const [tenantForm, setTenantForm] = useState({
    id: null,
    name: "",
    email: "",
    phone: "",
    room: "",
  });
  const [billForm, setBillForm] = useState({
    id: null,
    tenantId: "",
    type: "Rent",
    amount: "",
    date: "",
    status: "Pending",
  });
  const [searchTenant, setSearchTenant] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  // Fetch Data
  const fetchTenants = async () => {
    let url = `${API}/tenants`;
    if (searchTenant) url += `?search=${searchTenant}`;
    const res = await fetch(url);
    const data = await res.json();
    setTenants(data);
  };

  const fetchBills = async () => {
    let url = `${API}/bills`;
    if (monthFilter) url += `?month=${monthFilter}`;
    const res = await fetch(url);
    const data = await res.json();
    setBills(data);
  };

  const fetchDashboard = async () => {
    const res = await fetch(`${API}/dashboard`);
    const data = await res.json();

    const dashboardData = data.dashboard.map((t) => {
      const tenantBills = bills.filter((b) => b.tenantId._id === t.id);

      const servicePending = {};
      const servicePaid = {};
      const pendingByMonth = {};

      tenantBills.forEach((b) => {
        const month = new Date(b.date).toLocaleString("default", {
          month: "short", // <-- ৩ letter মাস নাম
          year: "numeric",
        });
        if (b.status === "Pending") {
          servicePending[b.type] = (servicePending[b.type] || 0) + b.amount;
          if (!pendingByMonth[month]) pendingByMonth[month] = {};
          pendingByMonth[month][b.type] =
            (pendingByMonth[month][b.type] || 0) + b.amount;
        } else {
          servicePaid[b.type] = (servicePaid[b.type] || 0) + b.amount;
        }
      });

      const totalPending = Object.values(servicePending).reduce(
        (a, b) => a + b,
        0
      );
      const totalPaid = Object.values(servicePaid).reduce((a, b) => a + b, 0);

      return {
        ...t,
        totalPending,
        totalPaid,
        servicePending,
        servicePaid,
        pendingByMonth,
      };
    });
    setDashboard(dashboardData);
  };

  useEffect(() => {
    fetchTenants();
    fetchBills();
    fetchDashboard();
  }, [searchTenant, monthFilter, bills.length]);

  // Tenant Actions
  const saveTenant = async () => {
    if (!tenantForm.name) return alert("Name required");
    if (tenantForm.id) {
      await fetch(`${API}/tenants/${tenantForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tenantForm),
      });
    } else {
      await fetch(`${API}/tenants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tenantForm),
      });
    }
    setTenantForm({ id: null, name: "", email: "", phone: "", room: "" });
    fetchTenants();
    fetchDashboard();
  };
  const editTenant = (t) => setTenantForm(t);
  const deleteTenant = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    await fetch(`${API}/tenants/${id}`, { method: "DELETE" });
    fetchTenants();
    fetchDashboard();
  };

  // Bill Actions
  const saveBill = async () => {
    if (!billForm.tenantId || !billForm.amount || !billForm.date)
      return alert("Fill all fields");
    const payload = {
      tenantId: billForm.tenantId,
      type: billForm.type,
      amount: Number(billForm.amount),
      date: billForm.date,
      status: billForm.status,
    };
    if (billForm.id)
      await fetch(`${API}/bills/${billForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    else
      await fetch(`${API}/bills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    setBillForm({
      id: null,
      tenantId: "",
      type: "Rent",
      amount: "",
      date: "",
      status: "Pending",
    });
    fetchBills();
    fetchDashboard();
  };
  const editBill = (b) =>
    setBillForm({ ...b, tenantId: b.tenantId._id, id: b._id });
  const deleteBill = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    await fetch(`${API}/bills/${id}`, { method: "DELETE" });
    fetchBills();
    fetchDashboard();
  };
  const toggleBillStatus = async (bill) => {
    const newStatus = bill.status === "Paid" ? "Pending" : "Paid";
    await fetch(`${API}/bills/${bill._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...bill, status: newStatus, date: bill.date }),
    });
    fetchBills();
    fetchDashboard();
  };

  // Export Excel
  const exportExcel = () => {
    const wsData = [];
    dashboard.forEach((d) => {
      const row = { Tenant: d.name, Room: d.room };
      Object.keys(d.pendingByMonth).forEach((month) => {
        Object.keys(d.pendingByMonth[month]).forEach((service) => {
          row[`${service} (${month}) Pen`] = d.pendingByMonth[month][service];
        });
      });
      Object.keys(d.servicePaid).forEach((service) => {
        row[`${service} Paid`] = d.servicePaid[service];
      });
      wsData.push(row);
    });
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dashboard");
    XLSX.writeFile(wb, "TenantDashboard.xlsx");
  };

  return (
    <div className="app">
      <h1>Tenant & Billing Management</h1>

      {/* Search & Filter */}
      <div className="section">
        <h2>Search & Filter</h2>
        <input
          placeholder="Search Tenant"
          value={searchTenant}
          onChange={(e) => setSearchTenant(e.target.value)}
        />
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          <option value="">All Months</option>
          {[...Array(12)].map((_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </div>

      {/* Tenant Form */}
      <div className="section">
        <h2>{tenantForm.id ? "Edit Tenant" : "Add Tenant"}</h2>
        <input
          placeholder="Name"
          value={tenantForm.name}
          onChange={(e) =>
            setTenantForm({ ...tenantForm, name: e.target.value })
          }
        />
        <input
          placeholder="Email"
          value={tenantForm.email}
          onChange={(e) =>
            setTenantForm({ ...tenantForm, email: e.target.value })
          }
        />
        <input
          placeholder="Phone"
          value={tenantForm.phone}
          onChange={(e) =>
            setTenantForm({ ...tenantForm, phone: e.target.value })
          }
        />
        <input
          placeholder="Room"
          value={tenantForm.room}
          onChange={(e) =>
            setTenantForm({ ...tenantForm, room: e.target.value })
          }
        />
        <button onClick={saveTenant}>{tenantForm.id ? "Update" : "Add"}</button>
      </div>

      {/* Tenant List */}
      <div className="section">
        <h2>Tenants</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Room</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t._id}>
                <td>{t.name}</td>
                <td>{t.email}</td>
                <td>{t.phone}</td>
                <td>{t.room}</td>
                <td className="actions">
                  <button onClick={() => editTenant(t)}>Edit</button>
                  <button onClick={() => deleteTenant(t._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bill Form */}
      <div className="section">
        <h2>{billForm.id ? "Edit Bill" : "Add Bill"}</h2>
        <select
          value={billForm.tenantId}
          onChange={(e) =>
            setBillForm({ ...billForm, tenantId: e.target.value })
          }
        >
          <option value="">Select Tenant</option>
          {tenants.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name} ({t.room})
            </option>
          ))}
        </select>
        <select
          value={billForm.type}
          onChange={(e) => setBillForm({ ...billForm, type: e.target.value })}
        >
          <option>Rent</option>
          <option>Electricity</option>
          <option>Gas</option>
          <option>Water</option>
          <option>Internet</option>
          <option>Parking</option>
          <option>Security</option>
        </select>
        <input
          type="number"
          placeholder="Amount"
          value={billForm.amount}
          onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
        />
        <input
          type="date"
          value={billForm.date}
          onChange={(e) => setBillForm({ ...billForm, date: e.target.value })}
        />
        <select
          value={billForm.status}
          onChange={(e) => setBillForm({ ...billForm, status: e.target.value })}
        >
          <option>Pending</option>
          <option>Paid</option>
        </select>
        <button onClick={saveBill}>{billForm.id ? "Update" : "Add"}</button>
      </div>

      {/* Bill List */}
      <div className="section">
        <h2>Bills</h2>
        <table>
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => {
              const tenant = b.tenantId || {};
              return (
                <tr key={b._id}>
                  <td>
                    {tenant.name} ({tenant.room})
                  </td>
                  <td>{b.type}</td>
                  <td>{b.amount}</td>
                  <td>{new Date(b.date).toLocaleDateString()}</td>
                  <td className={b.status === "Pending" ? "pending" : ""}>
                    {b.status}
                  </td>
                  <td className="actions">
                    <button onClick={() => editBill(b)}>Edit</button>
                    <button onClick={() => deleteBill(b._id)}>Delete</button>
                    <button onClick={() => toggleBillStatus(b)}>
                      Toggle Status
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Export Excel */}
      <div className="section">
        <button onClick={exportExcel}>Export Dashboard to Excel</button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card scroll-card">
          <h3>Recent Paid</h3>
          {bills
            .filter((b) => b.status === "Paid")
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10)
            .map((b) => (
              <p key={b._id}>
                {b.tenantId?.name || "Unknown"} ({b.type}): {b.amount} on{" "}
                {new Date(b.date).toLocaleDateString()}
              </p>
            ))}
        </div>

        <div className="summary-card scroll-card">
          <h3>Total Paid</h3>
          {(() => {
            // Group paid bills by month and service
            const paidByMonth = {};
            bills
              .filter((b) => b.status === "Paid")
              .forEach((b) => {
                const month = new Date(b.date).toLocaleString("default", {
                  month: "short",
                  year: "numeric",
                });
                paidByMonth[month] = paidByMonth[month] || {};
                paidByMonth[month][b.type] =
                  (paidByMonth[month][b.type] || 0) + b.amount;
              });

            // Render each month and service
            return Object.keys(paidByMonth).map((month) =>
              Object.keys(paidByMonth[month]).map((service) => (
                <p key={month + service}>
                  {service}: {paidByMonth[month][service]}{" "}
                  <span style={{ color: "#888" }}>({month})</span>
                </p>
              ))
            );
          })()}
        </div>

        <div className="summary-card scroll-card">
          <h3>Total Pending</h3>
          {Object.keys(
            dashboard.reduce((acc, d) => {
              Object.keys(d.pendingByMonth).forEach((month) => {
                Object.keys(d.pendingByMonth[month]).forEach((s) => {
                  acc[month] = acc[month] || {};
                  acc[month][s] =
                    (acc[month][s] || 0) + d.pendingByMonth[month][s];
                });
              });
              return acc;
            }, {})
          ).map((month) => {
            const services = Object.keys(
              dashboard.reduce((acc, d) => {
                Object.keys(d.pendingByMonth).forEach((m) => {
                  Object.keys(d.pendingByMonth[m]).forEach((s) => {
                    if (m === month)
                      acc[s] = (acc[s] || 0) + d.pendingByMonth[m][s];
                  });
                });
                return acc;
              }, {})
            );
            return services.map((s) => {
              const total = dashboard.reduce(
                (acc, d) =>
                  acc +
                  ((d.pendingByMonth[month] && d.pendingByMonth[month][s]) ||
                    0),
                0
              );
              return (
                <p key={month + s}>
                  {month} - {s}: {total}
                </p>
              );
            });
          })}
        </div>
      </div>

      {/* Tenant Dashboard */}
      <div className="dashboard-container">
        {dashboard.map((d) => (
          <div key={d.id} className="dashboard-card">
            <h3>
              {d.name} (Room: {d.room})
            </h3>
            <p>Total Paid: {d.totalPaid}</p>
            <p>Total Pending: {d.totalPending}</p>
            {Object.keys(d.servicePending).map((s) => (
              <p key={s}>
                {s} Pending: {d.servicePending[s]}
              </p>
            ))}
            {Object.keys(d.servicePaid).map((s) => (
              <p key={"paid-" + s}>
                {s} Paid: {d.servicePaid[s]}
              </p>
            ))}
            <div className="pending-by-month">
              <h4>Pending by Month:</h4>
              {Object.keys(d.pendingByMonth).map((month) => (
                <div key={month}>
                  <strong>{month}:</strong>
                  {Object.keys(d.pendingByMonth[month]).map((s) => (
                    <span key={s} style={{ marginLeft: "10px" }}>
                      {s}: {d.pendingByMonth[month][s]}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
