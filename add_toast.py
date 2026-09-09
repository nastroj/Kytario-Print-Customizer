import sys

with open("src/App.tsx", "r") as f:
    content = f.read()

# 1. Add toast state and showToast
state_target = """  const [isLoadingJson, setIsLoadingJson] = useState(false);"""
state_replacement = """  const [isLoadingJson, setIsLoadingJson] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);"""

content = content.replace(state_target, state_replacement, 1)

# 2. Add toast in handleApplySettings
apply_target = """      updateTimersRef.current.finishTimer = setTimeout(() => {
        setIsUpdatingLayout(false);
      }, 650);"""

apply_replacement = """      updateTimersRef.current.finishTimer = setTimeout(() => {
        setIsUpdatingLayout(false);
        showToast("Settings successfully applied!");
      }, 650);"""

content = content.replace(apply_target, apply_replacement, 1)

# 3. Add toast in processJsonString
process_target = """        requestAnimationFrame(() => {
          setTimeout(() => {
            setIsLoadingJson(false);
          }, 350);
        });"""

process_replacement = """        requestAnimationFrame(() => {
          setTimeout(() => {
            setIsLoadingJson(false);
            const songCount = songs.length;
            const bookTitle = data.title || fileName || 'Songbook';
            showToast(`Successfully loaded "${bookTitle}" (${songCount} song${songCount === 1 ? '' : 's'})!`);
          }, 350);
        });"""

content = content.replace(process_target, process_replacement, 1)

# 4. Add Toast JSX at the very end of App return block
jsx_target = """        <SongbookPreview 
          data={songbookData} 
          settings={settings}
          isUpdatingLayout={isUpdatingLayout}
          onRegisterPrintTrigger={handleRegisterPrintTrigger}
          onRegisterPrintPreviewTrigger={handleRegisterPrintPreviewTrigger}
          onPrintPreviewStateChange={setIsPrintPreviewActive}
          onDownloadStatusChange={setIsDownloadingPdf}
          isDarkMode={isDarkMode}
          onOpenSettings={() => {
            setIsMobileSidebarOpen(true);
            setIsDesktopSidebarCollapsed(false);
          }}
        />
      </div>
    </div>
  );
}"""

jsx_replacement = """        <SongbookPreview 
          data={songbookData} 
          settings={settings}
          isUpdatingLayout={isUpdatingLayout}
          onRegisterPrintTrigger={handleRegisterPrintTrigger}
          onRegisterPrintPreviewTrigger={handleRegisterPrintPreviewTrigger}
          onPrintPreviewStateChange={setIsPrintPreviewActive}
          onDownloadStatusChange={setIsDownloadingPdf}
          isDarkMode={isDarkMode}
          onOpenSettings={() => {
            setIsMobileSidebarOpen(true);
            setIsDesktopSidebarCollapsed(false);
          }}
        />

        {/* Toast Notification */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-[100] print:hidden animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="flex items-center gap-3 bg-zinc-900 dark:bg-zinc-800 text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 text-xs sm:text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toast.message}</span>
              <button 
                onClick={() => setToast(null)}
                className="ml-2 text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}"""

content = content.replace(jsx_target, jsx_replacement, 1)

with open("src/App.tsx", "w") as f:
    f.write(content)

print("Successfully updated App.tsx with Toast notifications!")
