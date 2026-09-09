import sys

with open("src/components/Sidebar.tsx", "r") as f:
    lines = f.readlines()

new_section = """          {/* SECTION 1: Page & Layout */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <LayoutTemplate className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                Page & Layout
              </h3>
              <button
                type="button"
                onClick={() => {
                  setDraftSettings(prev => ({
                    ...prev,
                    pageFormat: 'A4',
                    orientation: 'landscape',
                    indexSortOrder: 'alphabetical',
                    showChords: true,
                    smartFit: false,
                    pageMargin: 5
                  }));
                }}
                className="px-2 py-0.5 text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Reset layout to default"
              >
                Defaults
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                <label htmlFor={`pageFormat-${idSuffix}`} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 shrink-0">
                  Paper Format
                </label>
                <select
                  id={`pageFormat-${idSuffix}`}
                  className="w-36 rounded-md border border-black/10 dark:border-zinc-600 shadow-2xs bg-white dark:bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                  value={draftSettings.pageFormat}
                  onChange={(e) => handleSettingChange('pageFormat', e.target.value)}
                >
                  <option value="A4">A4 (210×297)</option>
                  <option value="A5">A5 (148×210)</option>
                  <option value="Letter">US Letter</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                <label htmlFor={`orientation-${idSuffix}`} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 shrink-0">
                  Orientation
                </label>
                <select
                  id={`orientation-${idSuffix}`}
                  className="w-36 rounded-md border border-black/10 dark:border-zinc-600 shadow-2xs bg-white dark:bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                  value={draftSettings.orientation}
                  onChange={(e) => handleSettingChange('orientation', e.target.value)}
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                <label htmlFor={`pageMargin-${idSuffix}`} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 shrink-0">
                  Margins (mm)
                </label>
                <select
                  id={`pageMargin-${idSuffix}`}
                  className="w-36 rounded-md border border-black/10 dark:border-zinc-600 shadow-2xs bg-white dark:bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                  value={draftSettings.pageMargin ?? 5}
                  onChange={(e) => handleSettingChange('pageMargin', parseInt(e.target.value, 10))}
                >
                  <option value="3">3 mm</option>
                  <option value="4">4 mm</option>
                  <option value="5">5 mm</option>
                  <option value="6">6 mm</option>
                  <option value="8">8 mm</option>
                  <option value="10">10 mm</option>
                  <option value="12">12 mm</option>
                  <option value="15">15 mm</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                <label htmlFor={`indexSortOrder-${idSuffix}`} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 shrink-0">
                  ToC Order
                </label>
                <select
                  id={`indexSortOrder-${idSuffix}`}
                  className="w-36 rounded-md border border-black/10 dark:border-zinc-600 shadow-2xs bg-white dark:bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                  value={draftSettings.indexSortOrder}
                  onChange={(e) => handleSettingChange('indexSortOrder', e.target.value)}
                >
                  <option value="alphabetical">Alphabetical</option>
                  <option value="original">As in File</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                <label htmlFor={`showChords-${idSuffix}`} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 shrink-0 cursor-pointer select-none">
                  Display Chords
                </label>
                <input
                  type="checkbox"
                  id={`showChords-${idSuffix}`}
                  checked={draftSettings.showChords}
                  onChange={(e) => handleSettingChange('showChords', e.target.checked)}
                  className="rounded border-black/10 dark:border-zinc-600 shadow-2xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900 dark:focus:ring-zinc-400 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                <label htmlFor={`smartFit-${idSuffix}`} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 shrink-0 cursor-pointer select-none" title="Auto-scales song lyrics and chords to fit comfortably on the page">
                  Smart Auto-scale
                </label>
                <input
                  type="checkbox"
                  id={`smartFit-${idSuffix}`}
                  checked={draftSettings.smartFit}
                  onChange={(e) => handleSettingChange('smartFit', e.target.checked)}
                  className="rounded border-black/10 dark:border-zinc-600 shadow-2xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900 dark:focus:ring-zinc-400 w-4 h-4 cursor-pointer"
                />
              </div>

              {draftSettings.smartFit && (() => {
                const multiplier = typeof draftSettings.maxScaleMultiplier === 'number' ? draftSettings.maxScaleMultiplier : 2.0;
                const baseLyricsPt = draftSettings.lyricsFontSize || 12;
                const maxLyricsPt = Math.round(baseLyricsPt * multiplier * 10) / 10;
                
                const minMult = 1.0;
                const maxMult = 2.5;
                const step = 0.1;
                
                const handleDecrement = () => {
                  const next = Math.max(minMult, Math.round((multiplier - step) * 10) / 10);
                  setDraftSettings((prev) => ({
                    ...prev,
                    maxScaleMultiplier: next,
                    maxAutoFontSize: 0,
                  }));
                };

                const handleIncrement = () => {
                  const next = Math.min(maxMult, Math.round((multiplier + step) * 10) / 10);
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
                        <span className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 min-w-[32px] text-center select-none">
                          {multiplier.toFixed(1)}×
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
                      Allows font sizes to grow up to <span className="font-semibold text-zinc-600 dark:text-zinc-300">{maxLyricsPt}pt</span> to fill empty space.
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
"""

# Replace lines 329 to 514 (0-indexed 328 to 513)
new_lines = lines[:328] + [new_section] + lines[514:]

with open("src/components/Sidebar.tsx", "w") as f:
    f.writelines(new_lines)

