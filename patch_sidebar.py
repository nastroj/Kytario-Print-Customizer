import sys

with open("src/components/Sidebar.tsx", "r") as f:
    content = f.read()

target = """              {draftSettings.smartFit && (() => {
                const multiplier = typeof draftSettings.maxScaleMultiplier === 'number' ? draftSettings.maxScaleMultiplier : 2.0;
                const baseLyricsPt = draftSettings.lyricsFontSize || 12;
                const maxLyricsPt = Math.round(baseLyricsPt * multiplier * 100) / 100;
                const maxLyricsPx = Math.round(maxLyricsPt * (96 / 72) * 10) / 10; // 1pt = 1.333px
                
                const minMult = 1.0;
                const maxMult = 2.5;
                const step = 0.05;
                
                const handleDecrement = () => {
                  const next = Math.max(minMult, Math.round((multiplier - step) * 100) / 100);
                  setDraftSettings((prev) => ({
                    ...prev,
                    maxScaleMultiplier: next,
                    maxAutoFontSize: 0,
                  }));
                };

                const handleIncrement = () => {
                  const next = Math.min(maxMult, Math.round((multiplier + step) * 100) / 100);
                  setDraftSettings((prev) => ({
                    ...prev,
                    maxScaleMultiplier: next,
                    maxAutoFontSize: 0,
                  }));
                };

                return (
                  <div className="p-2.5 bg-zinc-100/50 dark:bg-zinc-800/30 rounded-lg border border-black/5 dark:border-zinc-700/40 ml-2 mt-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 shrink-0">
                        Max Upscale
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDecrement}
                          disabled={multiplier <= minMult}
                          className="w-5 h-5 flex items-center justify-center bg-white dark:bg-zinc-700 border border-black/10 dark:border-zinc-600 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50 shadow-2xs"
                          title="Decrease"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 min-w-[40px] text-center select-none">
                          {multiplier.toFixed(2)}×
                        </span>
                        <button
                          type="button"
                          onClick={handleIncrement}
                          disabled={multiplier >= maxMult}
                          className="w-5 h-5 flex items-center justify-center bg-white dark:bg-zinc-700 border border-black/10 dark:border-zinc-600 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50 shadow-2xs"
                          title="Increase"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Allows font sizes to grow up to <span className="font-semibold text-zinc-600 dark:text-zinc-300">{maxLyricsPt}pt ({maxLyricsPx}px)</span> to fill empty space.
                    </p>
                  </div>
                );
              })()}"""

replacement = """              {draftSettings.smartFit && (() => {
                const maxFontSizePx = typeof draftSettings.maxFontSizePx === 'number' ? draftSettings.maxFontSizePx : 32;
                
                const minPx = 16;
                const maxPx = 72;
                const step = 1;
                
                const handleDecrement = () => {
                  setDraftSettings((prev) => ({
                    ...prev,
                    maxFontSizePx: Math.max(minPx, maxFontSizePx - step),
                  }));
                };

                const handleIncrement = () => {
                  setDraftSettings((prev) => ({
                    ...prev,
                    maxFontSizePx: Math.min(maxPx, maxFontSizePx + step),
                  }));
                };

                return (
                  <div className="p-2.5 bg-zinc-100/50 dark:bg-zinc-800/30 rounded-lg border border-black/5 dark:border-zinc-700/40 ml-2 mt-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 shrink-0">
                        Max Font Size
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDecrement}
                          disabled={maxFontSizePx <= minPx}
                          className="w-5 h-5 flex items-center justify-center bg-white dark:bg-zinc-700 border border-black/10 dark:border-zinc-600 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50 shadow-2xs"
                          title="Decrease"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 min-w-[40px] text-center select-none">
                          {maxFontSizePx}px
                        </span>
                        <button
                          type="button"
                          onClick={handleIncrement}
                          disabled={maxFontSizePx >= maxPx}
                          className="w-5 h-5 flex items-center justify-center bg-white dark:bg-zinc-700 border border-black/10 dark:border-zinc-600 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50 shadow-2xs"
                          title="Increase"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Allows lyrics to grow up to <span className="font-semibold text-zinc-600 dark:text-zinc-300">{maxFontSizePx}px</span> to fill empty space.
                    </p>
                  </div>
                );
              })()}"""

content = content.replace(target, replacement)

# Check if draftSettings.maxScaleMultiplier is used anywhere else in Sidebar.tsx
content = content.replace("draftSettings.maxScaleMultiplier !== settings.maxScaleMultiplier ||", "draftSettings.maxFontSizePx !== settings.maxFontSizePx ||")
content = content.replace("draftSettings.maxAutoFontSize !== settings.maxAutoFontSize ||", "") # removing this line since it's unused now

with open("src/components/Sidebar.tsx", "w") as f:
    f.write(content)
