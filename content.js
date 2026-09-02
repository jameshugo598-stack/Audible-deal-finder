(function () {
    'use strict';

    const CACHE_KEY = 'audible_powerhub_v4_perfect';
    const CACHE_TTL = 24 * 60 * 60 * 1000;
    const CONCURRENCY = 5;
    let activeScanPromise = null;
    let filterActive = false;

    function getCachedPrice(asin) {
        try {
            const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
            const item = cache[asin];
            if (item && item.data && item.data.price >= 10.0 && item.data.price < 2500.0 && (Date.now() - item.time < CACHE_TTL)) {
                return item.data;
            }
        } catch (e) {}
        return null;
    }

    function setCachedPrice(asin, data) {
        try {
            const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
            cache[asin] = { data, time: Date.now() };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch (e) {}
    }

    function getArbitrageThresholds(currency) {
        if (currency === 'R' || currency === 'ZAR') {
            return { cashThreshold: 100.00, creditThreshold: 350.00, cphGreat: 10.00 };
        }
        if (currency === '£') {
            return { cashThreshold: 5.00, creditThreshold: 18.00, cphGreat: 0.40 };
        }
        if (currency === 'AU$') {
            return { cashThreshold: 10.00, creditThreshold: 35.00, cphGreat: 0.70 };
        }
        if (currency === 'CA$') {
            return { cashThreshold: 9.00, creditThreshold: 30.00, cphGreat: 0.60 };
        }
        return { cashThreshold: 7.00, creditThreshold: 25.00, cphGreat: 0.50 };
    }

    function setButtonsDisabled(disabled, statusMsg = '') {
        const btnFilter = document.getElementById('btn-filter-deals');
        const btnExport = document.getElementById('btn-export-md');
        const status = document.getElementById('hub-status');

        if (btnFilter) {
            btnFilter.disabled = disabled;
            btnFilter.style.opacity = disabled ? '0.45' : '1';
            btnFilter.style.cursor = disabled ? 'not-allowed' : 'pointer';
            btnFilter.style.pointerEvents = disabled ? 'none' : 'auto';
        }
        if (btnExport) {
            btnExport.disabled = disabled;
            btnExport.style.opacity = disabled ? '0.45' : '1';
            btnExport.style.cursor = disabled ? 'not-allowed' : 'pointer';
            btnExport.style.pointerEvents = disabled ? 'none' : 'auto';
        }
        if (status && statusMsg) {
            status.innerText = statusMsg;
        }
    }

    function injectUI() {
        if (document.getElementById('audible-hub-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'audible-hub-panel';
        panel.innerHTML = `
            <div style="
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: #18181b;
                color: #f4f4f5;
                padding: 14px 16px;
                border-radius: 10px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                border: 1px solid #27272a;
                width: 210px;
            ">
                <div style="font-weight: 700; font-size: 13px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
                    <span>Audible Hub</span>
                    <span id="hub-status" style="font-size: 10px; background: #27272a; color: #a1a1aa; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Ready</span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button id="btn-filter-deals" style="background: #10b981; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; transition: opacity 0.2s, background 0.2s;">
                        Filter Deals
                    </button>
                    <button id="btn-export-md" style="background: #27272a; color: #e4e4e7; border: 1px solid #3f3f46; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; transition: opacity 0.2s;">
                        Copy Markdown
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        document.getElementById('btn-filter-deals').addEventListener('click', toggleDealFilter);
        document.getElementById('btn-export-md').addEventListener('click', exportMarkdown);

        runScan(true);
    }

    function findFullRow(titleEl) {
        return titleEl.closest('li.productListItem, li.bc-list-item[id], .adbl-library-item, div.adbl-impression-container, #wishlist-content-container li') ||
               titleEl.closest('li') ||
               titleEl.parentElement;
    }

    async function fetchHiddenPrice(asin) {
        const cached = getCachedPrice(asin);
        if (cached) return cached;

        try {
            const res = await fetch(\`/pd/\${asin}\`);
            const html = await res.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            doc.querySelectorAll('[id*="membership"], [class*="membership"], .adbl-membership-plan, #buybox-membership-container').forEach(el => el.remove());

            const buybox = doc.querySelector('#buybox, #adbl-buybox, .adbl-buy-for-cash, .buybox-regular-price') || doc.body;
            let text = buybox.textContent || buybox.innerText;

            text = text.replace(/(?:ZAR|R|[\\$£€])?\\s*1600[.,]\\d{2}/gi, '')
                       .replace(/(?:ZAR|R|[\\$£€])?\\s*119[.,]\\d{2}/gi, '')
                       .replace(/(?:ZAR|R|[\\$£€])?\\s*\\d+(?:\\.\\d{2})?\\s*(?:\\/|\\s*per|\\s*a)?\\s*(?:month|year|annum|yr)/gi, '');

            const sale = text.match(/(?:Sale price|Deal price|Buy now for)\\s*[:]?\\s*(?:ZAR|R|[\\$£€])?\\s*(\\d+(?:[.,]\\d{2}))/i);
            if (sale) {
                const val = parseFloat(sale[1].replace(',', '.'));
                let currency = text.includes('ZAR') || text.includes('R') ? 'R' : text.includes('£') ? '£' : '$';
                const result = { price: val, currency };
                setCachedPrice(asin, result);
                return result;
            }

            const regular = text.match(/(?:Regular price|Audiobook price|Price)\\s*[:]?\\s*(?:ZAR|R|[\\$£€])?\\s*(\\d+(?:[.,]\\d{2}))/i) ||
                            text.match(/(?:ZAR|R)\\s*(\\d+(?:[.,]\\d{2}))/i) ||
                            text.match(/([\\$£€]|AU\\$|CA\\$)\\s*(\\d+(?:[.,]\\d{2}))/i);

            if (regular) {
                const val = parseFloat(regular[1].replace(',', '.'));
                if (val > 10.0 && val < 2500.0) {
                    let currency = text.includes('ZAR') || text.includes('R') ? 'R' : text.includes('£') ? '£' : '$';
                    const result = { price: val, currency };
                    setCachedPrice(asin, result);
                    return result;
                }
            }
        } catch (e) {
            console.error('Fetch error:', e);
        }
        return { price: null, currency: 'R' };
    }

    function extractBooks() {
        const books = [];
        const seenAsins = new Set();

        const titleElements = document.querySelectorAll('h3 a[href*="/pd/"], .bc-heading a[href*="/pd/"], a.bc-link[href*="/pd/"]');

        titleElements.forEach(titleEl => {
            const title = titleEl.innerText.trim();
            if (!title) return;

            const href = titleEl.getAttribute('href') || '';
            const asinMatch = href.match(/\\/pd\\/(?:[^\\/]+\\/)?([A-Z0-9]{10})/i);
            const asin = asinMatch ? asinMatch[1] : null;

            if (!asin || seenAsins.has(asin)) return;
            seenAsins.add(asin);

            const row = findFullRow(titleEl);

            // Clean author extraction (removes leading whitespace and "By:")
            let author = 'Unknown';
            const authorEl = row.querySelector('.authorLabel, [class*="authorLabel"], [class*="author"], a[href*="searchAuthor"]');
            if (authorEl) {
                author = authorEl.innerText
                    .trim()
                    .replace(/^(?:By|Written by)[\\s:]*/i, '')
                    .replace(/\\s+/g, ' ')
                    .trim();
            }

            // Duration extraction
            let hours = 0;
            const runtimeEl = row.querySelector('.runtimeLabel, [class*="runtimeLabel"], [class*="runtime"]');
            const durationText = runtimeEl ? runtimeEl.innerText : row.innerText;
            const hrMatch = durationText.match(/(\\d+)\\s*(?:hr|hour)/i);
            const minMatch = durationText.match(/(\\d+)\\s*(?:min|minute)/i);
            if (hrMatch || minMatch) {
                hours = (hrMatch ? parseInt(hrMatch[1], 10) : 0) + (minMatch ? parseInt(minMatch[1], 10) / 60 : 0);
            }

            const cached = getCachedPrice(asin);
            const price = cached ? cached.price : null;
            const currency = cached ? cached.currency : 'R';

            books.push({
                element: row,
                titleElement: titleEl,
                asin,
                title,
                author,
                price,
                currency,
                hours: hours > 0 ? hours.toFixed(1) : 'N/A',
                costPerHour: (price && hours > 0) ? (price / hours).toFixed(2) : null,
                link: \`\${window.location.origin}/pd/\${asin}\`
            });
        });

        return books;
    }

    async function runScan(updateBadges = true) {
        if (activeScanPromise) return activeScanPromise;

        activeScanPromise = (async () => {
            const books = extractBooks();
            const uncached = books.filter(b => !b.price);

            setButtonsDisabled(true, uncached.length > 0 ? \`Scanning: 0/\${uncached.length}\` : \`\${books.length} Books\`);

            let completed = 0;

            for (let i = 0; i < books.length; i += CONCURRENCY) {
                const chunk = books.slice(i, i + CONCURRENCY);
                await Promise.all(chunk.map(async (b) => {
                    if (!b.price) {
                        const res = await fetchHiddenPrice(b.asin);
                        if (res.price) {
                            b.price = res.price;
                            b.currency = res.currency;
                        }
                        completed++;
                        const status = document.getElementById('hub-status');
                        if (status && uncached.length > 0) {
                            status.innerText = \`Scanning: \${completed}/\${uncached.length}\`;
                        }
                    }

                    if (b.price && parseFloat(b.hours) > 0) {
                        b.costPerHour = (b.price / parseFloat(b.hours)).toFixed(2);
                    }

                    if (updateBadges) {
                        renderBadge(b);
                    }
                }));
            }

            setButtonsDisabled(false, \`\${books.length} Books\`);
            activeScanPromise = null;
            return books;
        })();

        return activeScanPromise;
    }

    function renderBadge(book) {
        const existingTag = book.element.querySelector('.audible-hub-badge');
        if (existingTag) existingTag.remove();

        const badgeContainer = document.createElement('div');
        badgeContainer.className = 'audible-hub-badge';
        badgeContainer.style = 'display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; font-size: 11px; font-weight: 700; align-items: center;';

        const { cashThreshold, creditThreshold, cphGreat } = getArbitrageThresholds(book.currency);

        // Cost per hour badge
        if (book.costPerHour) {
            const isGreatDeal = parseFloat(book.costPerHour) <= cphGreat;
            const cphBadge = document.createElement('span');
            cphBadge.style = \`padding: 2px 6px; border-radius: 4px; background: \${isGreatDeal ? '#059669' : '#374151'}; color: white;\`;
            cphBadge.innerText = \`\${book.currency}\${book.costPerHour}/hr\`;
            badgeContainer.appendChild(cphBadge);
        }

        // Pricing Arbitrage Badges
        if (book.price) {
            const priceBadge = document.createElement('span');

            if (book.price < cashThreshold) {
                // Cheap cash buy (< R100)
                priceBadge.style = 'padding: 2px 6px; border-radius: 4px; background: #dc2626; color: white;';
                priceBadge.innerText = \`BUY CASH (\${book.currency}\${book.price.toFixed(2)})\`;
            } else if (book.price > creditThreshold) {
                // High-value credit buy (> R350)
                priceBadge.style = 'padding: 2px 6px; border-radius: 4px; background: #7c3aed; color: white;';
                priceBadge.innerText = \`USE CREDIT (\${book.currency}\${book.price.toFixed(2)})\`;
            } else {
                // Regular price
                priceBadge.style = 'padding: 2px 6px; border-radius: 4px; background: #4b5563; color: #e5e7eb;';
                priceBadge.innerText = \`Regular: \${book.currency}\${book.price.toFixed(2)}\`;
            }

            badgeContainer.appendChild(priceBadge);
        }

        const targetHeader = book.titleElement.closest('.bc-heading, h3') || book.titleElement.parentElement;
        targetHeader.appendChild(badgeContainer);
    }

    async function toggleDealFilter() {
        const btn = document.getElementById('btn-filter-deals');
        const status = document.getElementById('hub-status');

        const books = await runScan(true);
        filterActive = !filterActive;

        let dealsCount = 0;
        books.forEach(book => {
            const { cashThreshold, creditThreshold } = getArbitrageThresholds(book.currency);
            // An actionable deal is either a cheap cash buy (< R100) or high credit value (> R350)
            const isActionable = book.price && (book.price < cashThreshold || book.price > creditThreshold);

            if (filterActive) {
                if (!isActionable) {
                    book.element.style.setProperty('display', 'none', 'important');
                } else {
                    dealsCount++;
                }
                btn.innerText = 'Show All';
                btn.style.background = '#4b5563';
                if (status) status.innerText = \`\${dealsCount} Deals\`;
            } else {
                book.element.style.removeProperty('display');
                btn.innerText = 'Filter Deals';
                btn.style.background = '#10b981';
                if (status) status.innerText = \`\${books.length} Books\`;
            }
        });
    }

    async function exportMarkdown() {
        const books = await runScan(false);
        if (books.length === 0) {
            alert('No audiobooks detected on this page.');
            return;
        }

        let md = \`# Audible Deals & Wishlist Export\\n\\n\`;
        md += \`*Generated on \${new Date().toLocaleDateString()}*\\n\\n\`;
        md += \`| Title | Author | Price | Duration | Cost/Hr | Action |\\n\`;
        md += \`| :--- | :--- | :---: | :---: | :---: | :---: |\\n\`;

        books.forEach(b => {
            const { cashThreshold, creditThreshold } = getArbitrageThresholds(b.currency);

            let action = 'Regular';
            if (b.price) {
                if (b.price < cashThreshold) action = 'BUY CASH';
                else if (b.price > creditThreshold) action = 'USE CREDIT';
            }

            const priceStr = b.price ? \`\${b.currency}\${b.price.toFixed(2)}\` : 'Credit';
            const cphStr = b.costPerHour ? \`\${b.currency}\${b.costPerHour}/hr\` : 'N/A';
            const durStr = b.hours !== 'N/A' ? \`\${b.hours} hrs\` : 'N/A';

            md += \`| [\${b.title}](\${b.link}) | \${b.author} | \${priceStr} | \${durStr} | \${cphStr} | \${action} |\\n\`;
        });

        navigator.clipboard.writeText(md).then(() => {
            alert(\`Copied \${books.length} audiobooks to clipboard in Markdown format.\`);
        });
    }

    setTimeout(injectUI, 500);
})();
