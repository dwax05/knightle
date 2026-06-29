import { useState } from "react";
import { useAuth } from "./auth";
import { IconArrowLeft } from "./icons";

type Status = { type: "error" | "success"; message: string } | null;

const inputClass =
  "w-full px-3 py-2.5 rounded-lg bg-bg text-fg border border-border-app/60 " +
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 " +
  "placeholder:text-muted transition";

function StatusMsg({ s }: { s: Status }) {
  if (!s) return null;
  return (
    <div
      className={`text-sm px-3 py-2 rounded-lg text-center ${
        s.type === "error" ? "bg-error/10 text-error" : "bg-success/10 text-success"
      }`}
    >
      {s.message}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 p-5 rounded-xl bg-surface border border-border-app/40 shadow-lg shadow-black/40">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

export function ProfilePage({ onClose }: { onClose: () => void }) {
  const { user, logout, authedPost, deleteAccount } = useAuth();

  // password reset
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwStatus, setPwStatus] = useState<Status>(null);
  const [pwBusy, setPwBusy] = useState(false);

  // clear game data
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearStatus, setClearStatus] = useState<Status>(null);
  const [clearBusy, setClearBusy] = useState(false);

  // delete account
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<Status>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function handlePasswordReset() {
    setPwStatus(null);
    if (!pwForm.current) return setPwStatus({ type: "error", message: "Current password is required" });
    if (pwForm.next.length < 6) return setPwStatus({ type: "error", message: "New password must be at least 6 characters" });
    if (pwForm.next !== pwForm.confirm) return setPwStatus({ type: "error", message: "Passwords don't match" });

    setPwBusy(true);
    const data = await authedPost("/api/password-reset", {
      currentPassword: pwForm.current,
      newPassword: pwForm.next,
    });
    setPwBusy(false);

    if (data.error) {
      setPwStatus({ type: "error", message: data.error });
    } else {
      setPwStatus({ type: "success", message: "Password updated" });
      setPwForm({ current: "", next: "", confirm: "" });
    }
  }

  async function handleClearData() {
    if (!clearConfirm) return setClearConfirm(true);
    setClearBusy(true);
    const data = await authedPost("/api/clear-game-data", {});
    setClearBusy(false);
    setClearConfirm(false);
    if (data.error) {
      setClearStatus({ type: "error", message: data.error });
    } else {
      setClearStatus({ type: "success", message: "Game data cleared" });
    }
  }

  async function handleDeleteAccount() {
    if (!deleteConfirm) return setDeleteConfirm(true);
    setDeleteStatus(null);
    if (!deletePassword) return setDeleteStatus({ type: "error", message: "Password required to delete account" });
    setDeleteBusy(true);
    const err = await deleteAccount(deletePassword);
    setDeleteBusy(false);
    if (err) setDeleteStatus({ type: "error", message: err });
    // on success, deleteAccount calls logout() which unmounts this view
  }

  return (
    <div className="min-h-screen flex items-start justify-center px-4 pt-20 pb-10 lg:py-10">
      {/* Mobile: fixed top-left back button */}
      <button
        onClick={onClose}
        aria-label="Back"
        className="lg:hidden fixed top-4 left-4 z-10 w-10 h-10 flex items-center justify-center bg-surface border border-border-app/50 rounded-xl hover:bg-bg/70 transition-colors duration-150 shadow-lg shadow-black/40"
      >
        <IconArrowLeft className="w-5 h-5" />
      </button>

      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex items-center gap-3">
          {/* Desktop: inline back button */}
          <button
            onClick={onClose}
            aria-label="Back"
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-muted hover:text-fg hover:bg-surface transition-colors duration-150"
          >
            <IconArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-fg">Profile</h1>
            <p className="text-xs text-muted">{user?.login}</p>
          </div>
        </div>

        <Section title="Change password">
          <input
            className={inputClass}
            type="password"
            placeholder="Current password"
            value={pwForm.current}
            onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
          />
          <input
            className={inputClass}
            type="password"
            placeholder="New password"
            value={pwForm.next}
            onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
          />
          <input
            className={inputClass}
            type="password"
            placeholder="Confirm new password"
            value={pwForm.confirm}
            onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
          />
          <button
            onClick={handlePasswordReset}
            disabled={pwBusy}
            className="w-full py-2 rounded-lg bg-accent text-tiletext font-semibold hover:opacity-90 disabled:opacity-50 transition text-sm"
          >
            {pwBusy ? "Saving..." : "Update password"}
          </button>
          <StatusMsg s={pwStatus} />
        </Section>

        <Section title="Session">
          <button
            onClick={logout}
            className="w-full py-2 rounded-lg bg-surface text-fg font-semibold border border-border-app hover:opacity-80 transition text-sm"
          >
            Log out
          </button>
        </Section>

        <Section title="Game data">
          <p className="text-xs text-muted">Permanently deletes your stats, streaks, and game history.</p>
          {!clearConfirm ? (
            <button
              onClick={handleClearData}
              className="w-full py-2 rounded-lg bg-surface text-fg font-semibold border border-border-app hover:opacity-80 transition text-sm"
            >
              Clear game data
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleClearData}
                disabled={clearBusy}
                className="flex-1 py-2 rounded-lg bg-error text-tiletext font-semibold hover:opacity-90 disabled:opacity-50 transition text-sm"
              >
                {clearBusy ? "Clearing..." : "Yes, clear it"}
              </button>
              <button
                onClick={() => setClearConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-surface text-fg font-semibold border border-border-app hover:opacity-80 transition text-sm"
              >
                Cancel
              </button>
            </div>
          )}
          <StatusMsg s={clearStatus} />
        </Section>

        <Section title="Danger zone">
          <p className="text-xs text-muted">Permanently deletes your account and all data. This cannot be undone.</p>
          {!deleteConfirm ? (
            <button
              onClick={handleDeleteAccount}
              className="w-full py-2 rounded-lg bg-surface text-error font-semibold border border-error/40 hover:bg-error/10 transition text-sm"
            >
              Delete account
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                className={inputClass}
                type="password"
                placeholder="Confirm your password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteBusy}
                  className="flex-1 py-2 rounded-lg bg-error text-tiletext font-semibold hover:opacity-90 disabled:opacity-50 transition text-sm"
                >
                  {deleteBusy ? "Deleting..." : "Delete my account"}
                </button>
                <button
                  onClick={() => { setDeleteConfirm(false); setDeletePassword(""); setDeleteStatus(null); }}
                  className="flex-1 py-2 rounded-lg bg-surface text-fg font-semibold border border-border-app hover:opacity-80 transition text-sm"
                >
                  Cancel
                </button>
              </div>
              <StatusMsg s={deleteStatus} />
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
