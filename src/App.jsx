import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Layout from "./components/Layout";
import { performUpdateCheck } from "./utils/updater";

const Home = lazy(() => import("./pages/home"));
const User = lazy(() => import("./pages/User"));
const Settings = lazy(() => import("./pages/Settings"));
const About = lazy(() => import("./pages/About"));
const Phrases = lazy(() => import("./pages/Phrases"));
const Logs = lazy(() => import("./pages/Logs"));

const pages = {
  home: Home,
  user: User,
  settings: Settings,
  about: About,
  phrases: Phrases,
  logs: Logs
};

const CLOSE_ACTION_STORAGE_KEY = "deeprant.closeAction";
const TRAY_CHECK_UPDATE_EVENT = "app://check-update";

function App() {
  const [activeItem, setActiveItem] = useState("home");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [selectedCloseAction, setSelectedCloseAction] = useState("background");
  const [rememberCloseAction, setRememberCloseAction] = useState(false);
  const allowCloseRef = useRef(false);
  const CurrentPage = pages[activeItem];

  const executeCloseAction = async (action) => {
    if (action === "exit") {
      allowCloseRef.current = true;
      setShowCloseConfirm(false);
      await invoke("exit_app");
      return;
    }

    setShowCloseConfirm(false);
    await getCurrentWindow().hide();
  };

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let unlisten;

    const setupCloseListener = async () => {
      unlisten = await appWindow.onCloseRequested((event) => {
        if (allowCloseRef.current) {
          return;
        }

        event.preventDefault();

        const rememberedAction = window.localStorage.getItem(CLOSE_ACTION_STORAGE_KEY);
        if (rememberedAction === "background" || rememberedAction === "exit") {
          void executeCloseAction(rememberedAction);
          return;
        }

        setSelectedCloseAction("background");
        setRememberCloseAction(false);
        setShowCloseConfirm(true);
      });
    };

    setupCloseListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  useEffect(() => {
    let unlistenTrayEvent;

    const setupTrayListener = async () => {
      unlistenTrayEvent = await listen(TRAY_CHECK_UPDATE_EVENT, async () => {
        setActiveItem("about");

        try {
          await performUpdateCheck();
        } catch (error) {
          console.error("Tray update error:", error);
        }
      });
    };

    setupTrayListener();

    return () => {
      if (unlistenTrayEvent) {
        unlistenTrayEvent();
      }
    };
  }, []);

  useEffect(() => {
    if (!showCloseConfirm) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowCloseConfirm(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCloseConfirm]);

  const handleConfirmClose = async () => {
    if (rememberCloseAction) {
      window.localStorage.setItem(CLOSE_ACTION_STORAGE_KEY, selectedCloseAction);
    } else {
      window.localStorage.removeItem(CLOSE_ACTION_STORAGE_KEY);
    }

    await executeCloseAction(selectedCloseAction);
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <Layout activeItem={activeItem} setActiveItem={setActiveItem}>
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center text-sm text-zinc-500">
              加载中...
            </div>
          }
        >
          <CurrentPage />
        </Suspense>
      </Layout>
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[2px] px-4">
          <div className="w-full max-w-[460px] rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.2)]">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
                <span className="text-lg font-semibold">!</span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[22px] font-semibold text-zinc-900">关闭应用</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  请选择关闭方式。你也可以记住本次选择，下次关闭时将自动执行。
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setSelectedCloseAction("background")}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                  selectedCloseAction === "background"
                    ? "border-zinc-900 bg-zinc-50 shadow-[0_8px_24px_rgba(24,24,27,0.08)]"
                    : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 h-4 w-4 rounded-full border ${
                      selectedCloseAction === "background" ? "border-zinc-900" : "border-zinc-300"
                    }`}
                  >
                    <div
                      className={`m-[3px] h-2 w-2 rounded-full ${
                        selectedCloseAction === "background" ? "bg-zinc-900" : "bg-transparent"
                      }`}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">后台运行（推荐）</div>
                    <div className="mt-1 text-sm text-zinc-500">
                      隐藏主窗口，应用继续驻留托盘，可随时重新打开。
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCloseAction("exit")}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                  selectedCloseAction === "exit"
                    ? "border-zinc-900 bg-zinc-50 shadow-[0_8px_24px_rgba(24,24,27,0.08)]"
                    : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 h-4 w-4 rounded-full border ${
                      selectedCloseAction === "exit" ? "border-zinc-900" : "border-zinc-300"
                    }`}
                  >
                    <div
                      className={`m-[3px] h-2 w-2 rounded-full ${
                        selectedCloseAction === "exit" ? "bg-zinc-900" : "bg-transparent"
                      }`}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">彻底退出</div>
                    <div className="mt-1 text-sm text-zinc-500">
                      结束应用进程并关闭托盘，下次需要重新启动应用。
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <label className="mt-5 flex items-center gap-3 text-sm text-zinc-600 select-none">
              <input
                type="checkbox"
                checked={rememberCloseAction}
                onChange={(event) => setRememberCloseAction(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
              />
              记住我的选择
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCloseConfirm(false)}
                className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
