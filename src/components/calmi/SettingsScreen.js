"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsScreen = SettingsScreen;
var react_1 = require("react");
var framer_motion_1 = require("framer-motion");
var lucide_react_1 = require("lucide-react");
var client_1 = require("@/integrations/supabase/client");
var analytics_1 = require("@/lib/analytics");
function SettingsScreen(_a) {
    var _this = this;
    var _b;
    var userId = _a.userId, userEmail = _a.userEmail, theme = _a.theme, onThemeChange = _a.onThemeChange, onBack = _a.onBack, onSignOut = _a.onSignOut;
    var _c = (0, react_1.useState)(false), analyticsConsent = _c[0], setAnalyticsConsent = _c[1];
    var _d = (0, react_1.useState)(false), consentWithdrawn = _d[0], setConsentWithdrawn = _d[1];
    var _e = (0, react_1.useState)(false), resetConfirm = _e[0], setResetConfirm = _e[1];
    var _f = (0, react_1.useState)(false), deleteConfirm = _f[0], setDeleteConfirm = _f[1];
    var _g = (0, react_1.useState)(0), sessionCount = _g[0], setSessionCount = _g[1];
    var _h = (0, react_1.useState)(0), messageCount = _h[0], setMessageCount = _h[1];
    (0, react_1.useEffect)(function () {
        (0, analytics_1.trackScreenViewed)("settings");
        var fetchUsage = function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, sessions, messages;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            client_1.supabase.from("sessions").select("id", { count: "exact", head: true }).eq("user_id", userId),
                            client_1.supabase.from("messages").select("id", { count: "exact", head: true }).eq("user_id", userId),
                        ])];
                    case 1:
                        _a = _b.sent(), sessions = _a[0], messages = _a[1];
                        setSessionCount(sessions.count || 0);
                        setMessageCount(messages.count || 0);
                        return [2 /*return*/];
                }
            });
        }); };
        fetchUsage();
    }, [userId]);
    var handleResetHistory = function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, client_1.supabase.from("messages").delete().eq("user_id", userId)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, client_1.supabase.from("sessions").delete().eq("user_id", userId)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, client_1.supabase.from("memories").delete().eq("user_id", userId)];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, client_1.supabase.from("notes").delete().eq("user_id", userId)];
                case 4:
                    _a.sent();
                    setResetConfirm(false);
                    setSessionCount(0);
                    setMessageCount(0);
                    return [2 /*return*/];
            }
        });
    }); };
    var handleDeleteAccount = function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, client_1.supabase.from("messages").delete().eq("user_id", userId)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, client_1.supabase.from("sessions").delete().eq("user_id", userId)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, client_1.supabase.from("memories").delete().eq("user_id", userId)];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, client_1.supabase.from("notes").delete().eq("user_id", userId)];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, client_1.supabase.from("feedback").delete().eq("user_id", userId)];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, client_1.supabase.from("profiles").delete().eq("id", userId)];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, client_1.supabase.auth.signOut()];
                case 7:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    var handleWithdrawConsent = function () {
        setConsentWithdrawn(true);
    };
    var toggleTheme = function () {
        onThemeChange(theme === "light" ? "dark" : "light");
    };
    return (<div className="flex min-h-screen flex-col bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
          <lucide_react_1.ArrowLeft className="h-4 w-4"/>
          Back
        </button>

        {/* User info */}
        <framer_motion_1.motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-medium text-primary">{(_b = userEmail[0]) === null || _b === void 0 ? void 0 : _b.toUpperCase()}</span>
            </div>
            <p className="text-sm text-foreground">{userEmail}</p>
          </div>
        </framer_motion_1.motion.div>

        <hr className="border-border-color mb-6"/>

        {/* Privacy settings */}
        <framer_motion_1.motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-8">
          <h2 className="text-base font-semibold text-foreground mb-1">privacy settings</h2>
          <p className="text-sm text-muted-foreground mb-4">manage your tracking preferences</p>
          <div className="rounded-[2rem] bg-white border border-border-color/80 p-4 shadow-soft space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-3xl border border-border-color/80 bg-surface px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">necessary cookies</p>
                <p className="text-xs text-muted-foreground">required for the website to function properly. cannot be disabled.</p>
              </div>
              <div className="flex h-8 w-14 items-center rounded-full bg-gray-200 p-1">
                <span className="ml-auto inline-flex h-6 w-6 rounded-full bg-white shadow-sm transition-transform"/>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-3xl border border-border-color/80 bg-surface px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">analytics cookies</p>
                <p className="text-xs text-muted-foreground">help us understand how visitors interact with our website using posthog analytics.</p>
              </div>
              <button onClick={function () { return setAnalyticsConsent(function (prev) { return !prev; }); }} className={"relative h-8 w-14 rounded-full transition ".concat(analyticsConsent ? "bg-[#277BD9]" : "bg-gray-200")}>
                <span className={"absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ".concat(analyticsConsent ? "translate-x-6" : "translate-x-1")}/>
              </button>
            </div>
          </div>
        </framer_motion_1.motion.div>

        {/* Theme */}
        <framer_motion_1.motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <h2 className="text-base font-semibold text-foreground mb-1">theme</h2>
          <p className="text-sm text-muted-foreground mb-3">switch between light and dark mode across the app</p>
          <button onClick={toggleTheme} className="flex items-center justify-between rounded-[2rem] bg-white px-5 py-4 shadow-soft border border-border-color transition hover:shadow-active">
            <span className="flex items-center gap-3 text-sm font-medium text-foreground">
              {theme === "light" ? <lucide_react_1.Sun className="h-4 w-4 text-foreground"/> : <lucide_react_1.Moon className="h-4 w-4 text-foreground"/>}
              {theme} mode
            </span>
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">toggle</span>
          </button>
        </framer_motion_1.motion.div>

        {/* Usage analytics */}
        <framer_motion_1.motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">usage analytics</h2>
              <p className="text-sm text-muted-foreground">how much you've used calmi</p>
            </div>
            <span className="rounded-full bg-[#F5F3FF] px-3 py-1 text-[11px] font-semibold uppercase text-[#5C35D9]">free</span>
          </div>

          <div className="rounded-[2rem] bg-white border border-border-color/80 p-5 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">text usage</span>
              <span className="text-sm font-semibold text-foreground">22%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden mb-4">
              <div className="h-full w-[22%] rounded-full bg-[#F8B63D]"/>
            </div>
            <p className="text-xs text-muted-foreground">usage is based on recent activity and will reset monthly.</p>
          </div>

          <button className="mt-4 w-full rounded-[2rem] bg-[#F8B63D] px-5 py-3 text-sm font-semibold text-black shadow-soft hover:bg-[#e1a733] transition">
            upgrade
          </button>
        </framer_motion_1.motion.div>

        <hr className="border-border-color mb-6"/>

        {/* Danger zone */}
        <framer_motion_1.motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <h2 className="text-base font-semibold text-foreground mb-1">danger zone</h2>
          <p className="text-sm text-muted-foreground mb-4">be careful with these settings</p>

          <div className="space-y-4">
            <div>
              <button onClick={handleWithdrawConsent} className="w-full rounded-[2rem] border border-border-color px-4 py-3 text-sm font-medium text-foreground hover:bg-surface transition">
                withdraw wellness-data consent
              </button>
              <p className="text-xs text-muted-foreground mt-2">
                {consentWithdrawn
            ? "wellness-data consent has been withdrawn. history is no longer shared with analytics."
            : "consent is currently active and was granted on apr 5, 2026."}
              </p>
            </div>

            {!resetConfirm ? (<div>
                <button onClick={function () { return setResetConfirm(true); }} className="w-full rounded-[2rem] border border-border-color px-4 py-3 text-sm font-medium text-foreground hover:bg-surface transition">
                  reset chat history
                </button>
                <p className="text-xs text-muted-foreground mt-2">
                  this will reset all of your previous conversations and you start from a clean slate. calmi will not remember what you've talked about earlier.
                </p>
              </div>) : (<framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[2rem] bg-surface p-5 shadow-soft">
                <h3 className="text-base font-semibold text-foreground mb-1">reset chat history – be careful!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  if you confirm, your chat history will be reset and calmi won't remember anything you've chatted about.
                </p>
                <div className="flex gap-3 flex-col sm:flex-row">
                  <button onClick={function () { return setResetConfirm(false); }} className="rounded-[2rem] border border-border-color px-4 py-3 text-sm font-medium text-foreground hover:bg-surface transition">
                    cancel
                  </button>
                  <button onClick={handleResetHistory} className="rounded-[2rem] bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground hover:opacity-90 transition">
                    reset chat history
                  </button>
                </div>
              </framer_motion_1.motion.div>)}

            {!deleteConfirm ? (<div>
                <button onClick={function () { return setDeleteConfirm(true); }} className="w-full rounded-[2rem] bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground hover:opacity-90 transition">
                  delete account
                </button>
                <p className="text-xs text-muted-foreground mt-2">
                  this will delete your account and everything related to it. be careful, it cannot be undone.
                </p>
              </div>) : (<framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[2rem] bg-surface p-5 shadow-soft">
                <h3 className="text-base font-semibold text-foreground mb-1">delete account – this is permanent!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  all your data will be permanently deleted. this action cannot be undone.
                </p>
                <div className="flex gap-3 flex-col sm:flex-row">
                  <button onClick={function () { return setDeleteConfirm(false); }} className="rounded-[2rem] border border-border-color px-4 py-3 text-sm font-medium text-foreground hover:bg-surface transition">
                    cancel
                  </button>
                  <button onClick={handleDeleteAccount} className="rounded-[2rem] bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground hover:opacity-90 transition">
                    delete account
                  </button>
                </div>
              </framer_motion_1.motion.div>)}
          </div>
        </framer_motion_1.motion.div>

        <div className="text-center pb-8">
          <button onClick={onSignOut} className="text-xs text-muted-foreground hover:text-foreground transition">
            log out
          </button>
        </div>
      </div>
    </div>);
}
