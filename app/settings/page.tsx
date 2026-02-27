"use client"
import { useState } from "react"

const roles = ["Admin", "Estimator", "Superintendent", "Viewer"]

export default function SettingsPage() {
  const [company, setCompany] = useState({
    name: "West Crow Contracting",
    address: "Vancouver, BC",
    phone: "",
    email: "dave@westcrow.ca",
  })

  const [members] = useState<any[]>([])
  const [newMember] = useState({ name: "", email: "", role: "Viewer" })
  const [showAddMember] = useState(false)

  const [security, setSecurity] = useState({
    passwordRequirements: true,
    sessionTimeout: 30,
    twoFactor: false,
  })

  const [integrations, setIntegrations] = useState({
    sheetsUrl: process.env.NEXT_PUBLIC_SHEETS_URL || "",
    sheetsKey: "",
    builderTrend: false,
  })

  const [notifications, setNotifications] = useState({
    bidDeadlines: true,
    projectUpdates: true,
    invoiceReminders: false,
  })

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 600, marginBottom: "0.25rem" }}>Settings</h1>
      <p style={{ color: "var(--ink-muted)", fontSize: "0.9rem", marginBottom: "2.5rem" }}>
        Manage your company profile, team, security, and integrations.
      </p>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={sectionHeading}>Company Profile</h2>
        <div style={card}>
          <div style={fieldGrid}>
            <label style={fieldLabel}>
              Company Name
              <input
                style={inputStyle}
                value={company.name}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
              />
            </label>
            <label style={fieldLabel}>
              Email
              <input
                style={inputStyle}
                value={company.email}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
              />
            </label>
            <label style={fieldLabel}>
              Address
              <input
                style={inputStyle}
                value={company.address}
                onChange={(e) => setCompany({ ...company, address: e.target.value })}
              />
            </label>
            <label style={fieldLabel}>
              Phone
              <input
                style={inputStyle}
                value={company.phone}
                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
              />
            </label>
          </div>
          <div style={{ marginTop: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--ink-muted)", display: "block", marginBottom: "0.5rem" }}>
              Company Logo
            </span>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: 8,
              border: "2px dashed var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ink-faint)",
              fontSize: "0.75rem",
              cursor: "pointer",
            }}>
              Upload
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={sectionHeading}>Team &amp; Roles</h2>
        <div style={card}>
          {[
            { name: "Dave Abercrombie", email: "dave@westcrow.ca", role: "Admin / Owner" },
            { name: "JP Dominguez",     email: "juanpadominguez@gmail.com", role: "Estimator" },
            { name: "Ean",              email: "",                           role: "Bid Coordinator" },
          ].map((m, i, arr) => (
            <div key={m.name} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.75rem 0",
              borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
              fontSize: "14px",
            }}>
              <div>
                <p style={{ fontWeight: 500, color: "var(--ink)", marginBottom: "0.1rem" }}>{m.name}</p>
                {m.email && <p style={{ fontSize: "12px", color: "var(--ink-faint)" }}>{m.email}</p>}
              </div>
              <span style={{ fontSize: "12px", color: "var(--ink-muted)", background: "var(--bg-subtle)", padding: "0.25rem 0.6rem", borderRadius: "5px", border: "1px solid var(--border)" }}>
                {m.role}
              </span>
            </div>
          ))}
          <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
            Role-based access control coming in Phase 2.
          </p>
        </div>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={sectionHeading}>Security</h2>
        <div style={infoBanner}>
          Authentication and role enforcement coming soon.
        </div>
        <div style={card}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <ToggleRow
              label="Enforce strong password requirements"
              description="Minimum 8 characters, uppercase, lowercase, number"
              checked={security.passwordRequirements}
              onChange={(v) => setSecurity({ ...security, passwordRequirements: v })}
            />
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>Session timeout</span>
                  <p style={{ fontSize: "0.8rem", color: "var(--ink-muted)", marginTop: 2 }}>
                    Auto-logout after inactivity
                  </p>
                </div>
                <select
                  value={security.sessionTimeout}
                  onChange={(e) => setSecurity({ ...security, sessionTimeout: Number(e.target.value) })}
                  style={{ ...selectStyle, width: 100 }}
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>60 min</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
              <ToggleRow
                label="Two-factor authentication"
                description="Require 2FA for all team members"
                checked={security.twoFactor}
                onChange={(v) => setSecurity({ ...security, twoFactor: v })}
              />
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={sectionHeading}>Integrations</h2>
        <div style={card}>
          <div style={fieldGrid}>
            <label style={fieldLabel}>
              Google Sheets API URL
              <input
                style={inputStyle}
                value={integrations.sheetsUrl}
                onChange={(e) => setIntegrations({ ...integrations, sheetsUrl: e.target.value })}
                placeholder="https://script.google.com/..."
              />
            </label>
            <label style={fieldLabel}>
              API Key
              <input
                style={inputStyle}
                type="password"
                value={integrations.sheetsKey}
                onChange={(e) => setIntegrations({ ...integrations, sheetsKey: e.target.value })}
                placeholder="••••••••"
              />
            </label>
          </div>
          <div style={{ borderTop: "1px solid var(--border)", marginTop: "1.25rem", paddingTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>BuilderTrend</span>
                <p style={{ fontSize: "0.8rem", color: "var(--ink-muted)", marginTop: 2 }}>
                  Connect your BuilderTrend account for project sync
                </p>
              </div>
              <button style={secondaryBtn}>
                Connect
              </button>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={sectionHeading}>Notifications</h2>
        <div style={card}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <ToggleRow
              label="Bid deadline reminders"
              description="Email alerts 3 days before bid deadlines"
              checked={notifications.bidDeadlines}
              onChange={(v) => setNotifications({ ...notifications, bidDeadlines: v })}
            />
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
              <ToggleRow
                label="Project updates"
                description="Daily summary of project activity"
                checked={notifications.projectUpdates}
                onChange={(v) => setNotifications({ ...notifications, projectUpdates: v })}
              />
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
              <ToggleRow
                label="Invoice reminders"
                description="Alerts for overdue or upcoming invoices"
                checked={notifications.invoiceReminders}
                onChange={(v) => setNotifications({ ...notifications, invoiceReminders: v })}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{label}</span>
        <p style={{ fontSize: "0.8rem", color: "var(--ink-muted)", marginTop: 2 }}>{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          border: "none",
          background: checked ? "var(--accent)" : "var(--border)",
          cursor: "pointer",
          position: "relative",
          flexShrink: 0,
          transition: "background 0.15s ease",
        }}
      >
        <span
          style={{
            display: "block",
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 3,
            left: checked ? 23 : 3,
            transition: "left 0.15s ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }}
        />
      </button>
    </div>
  )
}

const sectionHeading: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  color: "var(--accent)",
  marginBottom: "0.75rem",
  letterSpacing: "0.01em",
}

const card: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "1.5rem",
}

const fieldGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "1rem",
}

const fieldLabel: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.3rem",
  fontSize: "0.8rem",
  color: "var(--ink-muted)",
  fontWeight: 500,
}

const inputStyle: React.CSSProperties = {
  padding: "0.5rem 0.65rem",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: "0.875rem",
  color: "var(--ink)",
  background: "var(--bg)",
  outline: "none",
  width: "100%",
}

const selectStyle: React.CSSProperties = {
  padding: "0.4rem 0.5rem",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: "0.85rem",
  color: "var(--ink)",
  background: "var(--bg)",
  outline: "none",
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem 0.6rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--ink-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
}

const tdStyle: React.CSSProperties = {
  padding: "0.6rem",
}

const primaryBtn: React.CSSProperties = {
  padding: "0.45rem 1rem",
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: "0.8rem",
  fontWeight: 600,
  cursor: "pointer",
}

const secondaryBtn: React.CSSProperties = {
  padding: "0.45rem 1rem",
  background: "transparent",
  color: "var(--ink)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: "0.8rem",
  fontWeight: 500,
  cursor: "pointer",
}

const removeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--ink-faint)",
  cursor: "pointer",
  fontSize: "0.8rem",
  padding: "0.2rem 0.4rem",
  borderRadius: 4,
}

const infoBanner: React.CSSProperties = {
  background: "var(--accent-light)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "0.6rem 1rem",
  fontSize: "0.8rem",
  color: "var(--ink-muted)",
  marginBottom: "0.75rem",
}
