/**
 * PharmaOrder Main SPA Application Engine
 * Manages Orders CRUD, Search/Filtering, Metrics (₹ INR), Modals, Inline Status Changing,
 * Enter Key Cell Navigation, Red 5s Ticker Bar, Ready Modal, Staff Tracking, Multi-Item Orders,
 * Date Filtering, Advance Payment Modes (Cash, Online, Card), and Daily Reports
 */
const App = {
  orders: [],
  readyOrdersList: [],
  searchQuery: '',
  statusFilter: 'All',
  selectedDate: '',
  reportStartDate: '',
  reportEndDate: '',
  confirmCallback: null,

  // Ticker state
  tickerIndex: 0,
  tickerTimer: null,

  init() {
    this.bindEvents();
    this.setupModalMath();
    this.setupEnterKeyNavigation();
    this.setupReadyModal();
    this.setupDailyReportModal();

    // Auto-load orders on initial page load if token exists
    if (typeof API !== 'undefined' && API.getToken()) {
      this.loadOrders();
    }
  },

  bindEvents() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const dateFilter = document.getElementById('dateFilter');
    const clearDateBtn = document.getElementById('clearDateBtn');

    if (searchInput) {
      let debounceTimeout;
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        if (clearSearchBtn) {
          if (this.searchQuery) clearSearchBtn.classList.remove('hidden');
          else clearSearchBtn.classList.add('hidden');
        }

        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          this.loadOrders();
        }, 300);
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        this.searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        this.loadOrders();
      });
    }

    if (dateFilter) {
      dateFilter.addEventListener('change', (e) => {
        this.selectedDate = e.target.value;
        if (clearDateBtn) {
          if (this.selectedDate) clearDateBtn.classList.remove('hidden');
          else clearDateBtn.classList.add('hidden');
        }
        this.loadOrders();
      });
    }

    if (clearDateBtn) {
      clearDateBtn.addEventListener('click', () => {
        if (dateFilter) dateFilter.value = '';
        this.selectedDate = '';
        clearDateBtn.classList.add('hidden');
        this.loadOrders();
      });
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.statusFilter = e.target.value;
        this.loadOrders();
      });
    }

    document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
      this.exportCsv();
    });

    document.getElementById('openDailyReportBtn')?.addEventListener('click', () => {
      this.openDailyReportModal();
    });

    document.getElementById('openCreateModalBtn')?.addEventListener('click', () => {
      this.openOrderModal();
    });

    document.getElementById('emptyCreateBtn')?.addEventListener('click', () => {
      this.openOrderModal();
    });

    document.getElementById('closeOrderModalBtn')?.addEventListener('click', () => {
      this.closeOrderModal();
    });

    document.getElementById('cancelOrderModalBtn')?.addEventListener('click', () => {
      this.closeOrderModal();
    });

    document.getElementById('addItemBtn')?.addEventListener('click', () => {
      this.addMedicineItemRow();
    });

    document.getElementById('orderForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    document.getElementById('closeConfirmModalBtn')?.addEventListener('click', () => {
      this.closeConfirmModal();
    });

    document.getElementById('confirmCancelBtn')?.addEventListener('click', () => {
      this.closeConfirmModal();
    });

    document.getElementById('confirmProceedBtn')?.addEventListener('click', () => {
      if (typeof this.confirmCallback === 'function') {
        this.confirmCallback();
      }
      this.closeConfirmModal();
    });

    // Ticker view all button
    document.getElementById('tickerViewBtn')?.addEventListener('click', () => {
      this.openReadyModal();
    });

    // Header ready orders button
    document.getElementById('readyHeaderBtn')?.addEventListener('click', () => {
      this.openReadyModal();
    });

    // Report modal filter events
    document.getElementById('applyReportDateFilterBtn')?.addEventListener('click', () => {
      const s = document.getElementById('reportStartDate').value;
      const e = document.getElementById('reportEndDate').value;
      this.reportStartDate = s;
      this.reportEndDate = e;
      this.fetchAndRenderDailyReport();
    });

    document.getElementById('resetReportDateFilterBtn')?.addEventListener('click', () => {
      document.getElementById('reportStartDate').value = '';
      document.getElementById('reportEndDate').value = '';
      this.reportStartDate = '';
      this.reportEndDate = '';
      this.fetchAndRenderDailyReport();
    });
  },

  setReportDatePreset(preset) {
    const startInput = document.getElementById('reportStartDate');
    const endInput = document.getElementById('reportEndDate');
    const todayStr = new Date().toISOString().slice(0, 10);

    if (preset === 'today') {
      if (startInput) startInput.value = todayStr;
      if (endInput) endInput.value = todayStr;
      this.reportStartDate = todayStr;
      this.reportEndDate = todayStr;
    } else if (preset === 'month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      if (startInput) startInput.value = firstDay;
      if (endInput) endInput.value = todayStr;
      this.reportStartDate = firstDay;
      this.reportEndDate = todayStr;
    } else if (preset === 'all') {
      if (startInput) startInput.value = '';
      if (endInput) endInput.value = '';
      this.reportStartDate = '';
      this.reportEndDate = '';
    }

    this.fetchAndRenderDailyReport();
  },

  addMedicineItemRow(medicineName = '', quantity = '', supplier = '') {
    const container = document.getElementById('itemsContainer');
    if (!container) return;

    const rowId = 'item_row_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const rowCount = container.querySelectorAll('.medicine-item-row').length + 1;

    const row = document.createElement('div');
    row.className = 'medicine-item-row';
    row.id = rowId;

    row.innerHTML = `
      <div class="item-row-header">
        <span><i class="fa-solid fa-pills"></i> Medicine #${rowCount}</span>
        ${rowCount > 1 ? `
          <button type="button" class="remove-item-btn" onclick="App.removeMedicineItemRow('${rowId}')">
            <i class="fa-solid fa-trash-can"></i> Remove
          </button>
        ` : ''}
      </div>

      <div class="form-row">
        <div class="form-group" style="flex:2;">
          <label>Medicine Name <span class="required">*</span></label>
          <input type="text" class="item-medicine" value="${this.escapeHtml(medicineName)}" autocomplete="off" required>
        </div>

        <div class="form-group" style="flex:1;">
          <label>Qty <span class="required">*</span></label>
          <input type="number" class="item-qty" min="1" value="${quantity !== null && quantity !== undefined ? quantity : ''}" autocomplete="off" required>
        </div>
      </div>

      <div class="form-group">
        <label>Wholesale Supplier <span class="required">*</span></label>
        <input type="text" class="item-supplier" list="supplierList" value="${this.escapeHtml(supplier)}" autocomplete="off" placeholder="Select or type supplier..." required>
      </div>
    `;

    container.appendChild(row);

    setTimeout(() => {
      row.querySelector('.item-medicine')?.focus();
    }, 50);
  },

  removeMedicineItemRow(rowId) {
    const row = document.getElementById(rowId);
    const container = document.getElementById('itemsContainer');
    if (row && container && container.querySelectorAll('.medicine-item-row').length > 1) {
      row.remove();
      container.querySelectorAll('.medicine-item-row').forEach((r, idx) => {
        const titleElem = r.querySelector('.item-row-header span');
        if (titleElem) titleElem.innerHTML = `<i class="fa-solid fa-pills"></i> Medicine #${idx + 1}`;
      });
    } else {
      this.showToast('At least one medicine item is required.', 'warning');
    }
  },

  autoSaveToDatalist(listId, val) {
    if (!val || !val.trim()) return;
    const cleanVal = val.trim();
    const datalist = document.getElementById(listId);
    if (!datalist) return;

    const existingOptions = Array.from(datalist.options).map((opt) => opt.value.toLowerCase());
    if (!existingOptions.includes(cleanVal.toLowerCase())) {
      const opt = document.createElement('option');
      opt.value = cleanVal;
      datalist.appendChild(opt);
    }
  },

  setupEnterKeyNavigation() {
    const form = document.getElementById('orderForm');
    if (!form) return;

    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const target = e.target;
        if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.type === 'submit') {
          return;
        }

        e.preventDefault();

        const formElements = Array.from(
          form.querySelectorAll('input:not([type="hidden"]), select')
        ).filter((el) => !el.disabled && el.offsetParent !== null);

        const currentIndex = formElements.indexOf(target);
        if (currentIndex !== -1 && currentIndex < formElements.length - 1) {
          const nextElement = formElements[currentIndex + 1];
          nextElement.focus();
          if (typeof nextElement.select === 'function' && nextElement.tagName === 'INPUT') {
            nextElement.select();
          }
        } else {
          this.handleFormSubmit();
        }
      }
    });
  },

  setupModalMath() {
    const totalPriceInput = document.getElementById('totalPrice');
    const advancePaidInput = document.getElementById('advancePaid');
    const modeSelect = document.getElementById('advancePaymentMode');
    const advancePreviewElem = document.getElementById('advancePreview');
    const remainingPreviewElem = document.getElementById('remainingBalancePreview');

    const updatePreview = () => {
      const total = parseFloat(totalPriceInput.value) || 0;
      const advance = parseFloat(advancePaidInput.value) || 0;
      const mode = modeSelect ? modeSelect.value : 'Cash';
      const remaining = Math.max(0, total - advance);

      if (advancePreviewElem) {
        advancePreviewElem.textContent = `₹${advance.toFixed(2)} (${mode})`;
      }

      if (remainingPreviewElem) {
        remainingPreviewElem.textContent = `₹${remaining.toFixed(2)}`;
        if (remaining > 0) {
          remainingPreviewElem.style.color = 'var(--accent-rose)';
        } else {
          remainingPreviewElem.style.color = 'var(--primary)';
        }
      }
    };

    if (totalPriceInput) totalPriceInput.addEventListener('input', updatePreview);
    if (advancePaidInput) advancePaidInput.addEventListener('input', updatePreview);
    if (modeSelect) modeSelect.addEventListener('change', updatePreview);
  },

  setupReadyModal() {
    document.getElementById('closeReadyModalBtn')?.addEventListener('click', () => {
      this.closeReadyModal();
    });

    document.getElementById('closeReadyModalFooterBtn')?.addEventListener('click', () => {
      this.closeReadyModal();
    });
  },

  setupDailyReportModal() {
    document.getElementById('closeDailyReportModalBtn')?.addEventListener('click', () => {
      this.closeDailyReportModal();
    });

    document.getElementById('closeDailyReportFooterBtn')?.addEventListener('click', () => {
      this.closeDailyReportModal();
    });
  },

  async loadOrders() {
    const loadingElem = document.getElementById('tableLoading');
    const emptyElem = document.getElementById('emptyState');

    if (loadingElem) loadingElem.classList.remove('hidden');
    if (emptyElem) emptyElem.classList.add('hidden');

    try {
      const response = await API.getOrders(this.searchQuery, this.statusFilter, this.selectedDate);
      if (response.success) {
        this.orders = response.orders || [];
        this.updateMetrics(response.summary);
        this.renderOrders();
        this.processReadyOrders();
      }
    } catch (error) {
      this.showToast(error.message || 'Failed to load orders', 'error');
    } finally {
      if (loadingElem) loadingElem.classList.add('hidden');
    }
  },

  updateMetrics(summary) {
    if (!summary) return;

    document.getElementById('metricTotal').textContent = summary.totalOrders || 0;
    document.getElementById('metricPending').textContent = summary.pendingOrders || 0;
    document.getElementById('metricReady').textContent = summary.readyOrders || 0;
    document.getElementById('metricCompleted').textContent = summary.completedOrders || 0;

    const advanceElem = document.getElementById('metricAdvance');
    if (advanceElem) {
      advanceElem.textContent = `₹${(summary.advanceCollected || 0).toFixed(2)}`;
    }

    const breakdownElem = document.getElementById('metricAdvanceBreakdown');
    if (breakdownElem) {
      const c = summary.cashAdvanceTotal || 0;
      const o = summary.onlineAdvanceTotal || 0;
      const cd = summary.cardAdvanceTotal || 0;
      breakdownElem.textContent = `Cash: ₹${c.toFixed(0)} | Online: ₹${o.toFixed(0)} | Card: ₹${cd.toFixed(0)}`;
    }

    const outstandingElem = document.getElementById('metricOutstanding');
    if (outstandingElem) {
      outstandingElem.textContent = `₹${(summary.outstandingPayments || 0).toFixed(2)}`;
    }
  },

  processReadyOrders() {
    this.readyOrdersList = this.orders.filter((o) => o.status === 'Ready for Pickup');

    const tickerBar = document.getElementById('pickupTickerBar');
    const readyHeaderBtn = document.getElementById('readyHeaderBtn');
    const readyHeaderBadge = document.getElementById('readyHeaderBadge');

    if (readyHeaderBadge) readyHeaderBadge.textContent = this.readyOrdersList.length;

    if (this.readyOrdersList.length > 0) {
      if (readyHeaderBtn) readyHeaderBtn.classList.remove('hidden');
      if (tickerBar) tickerBar.classList.remove('hidden');

      this.startTickerRotation();
    } else {
      if (readyHeaderBtn) readyHeaderBtn.classList.add('hidden');
      if (tickerBar) tickerBar.classList.add('hidden');

      if (this.tickerTimer) {
        clearInterval(this.tickerTimer);
        this.tickerTimer = null;
      }
    }
  },

  startTickerRotation() {
    if (this.tickerTimer) {
      clearInterval(this.tickerTimer);
    }

    this.tickerIndex = 0;
    this.renderTickerItem();

    this.tickerTimer = setInterval(() => {
      if (this.readyOrdersList.length === 0) return;

      this.tickerIndex = (this.tickerIndex + 1) % this.readyOrdersList.length;
      
      const tickerText = document.getElementById('tickerText');
      if (tickerText) {
        tickerText.classList.add('fade-out');
        setTimeout(() => {
          this.renderTickerItem();
          tickerText.classList.remove('fade-out');
        }, 300);
      } else {
        this.renderTickerItem();
      }
    }, 5000);
  },

  renderTickerItem() {
    const tickerText = document.getElementById('tickerText');
    if (!tickerText || this.readyOrdersList.length === 0) return;

    const order = this.readyOrdersList[this.tickerIndex];
    const totalCount = this.readyOrdersList.length;
    const currentNum = this.tickerIndex + 1;
    const isCleared = order.isSettled || order.remainingBalance === 0;
    const dueInfo = !isCleared ? ` [Due: ₹${order.remainingBalance.toFixed(2)}]` : ' [Cleared]';

    let itemsStr = '';
    if (Array.isArray(order.items) && order.items.length > 0) {
      itemsStr = order.items.map((i) => `${i.medicineName} (x${i.quantity})`).join(', ');
    } else {
      itemsStr = `${order.medicineName} (x${order.quantity || 1})`;
    }

    tickerText.innerHTML = `Order (${currentNum}/${totalCount}): <strong>${this.escapeHtml(order.customerName)}</strong> — ${this.escapeHtml(itemsStr)} | Phone: <strong>${this.escapeHtml(order.phone)}</strong>${dueInfo}`;
  },

  openDailyReportModal() {
    const modal = document.getElementById('dailyReportModal');
    if (modal) modal.classList.remove('hidden');
    this.fetchAndRenderDailyReport();
  },

  async fetchAndRenderDailyReport() {
    const container = document.getElementById('dailyReportContent');
    if (!container) return;

    container.innerHTML = `
      <div class="table-loading">
        <div class="spinner"></div>
        <span>Generating Daily Sales & Advance Report...</span>
      </div>
    `;

    try {
      const response = await API.getDailyReport(this.reportStartDate, this.reportEndDate);
      if (response.success && Array.isArray(response.reports)) {
        const reports = response.reports;
        if (reports.length === 0) {
          container.innerHTML = `
            <div style="text-align:center; padding:3rem; color:var(--text-muted);">
              <i class="fa-solid fa-calendar-xmark" style="font-size:3rem; margin-bottom:1rem; opacity:0.5;"></i>
              <h3>No Order Activity Found for Selected Dates</h3>
              <p>Try resetting date range to view all daily reports!</p>
            </div>
          `;
          return;
        }

        let totalOrdersRange = 0;
        let totalAdvanceRange = 0;
        let totalCashRange = 0;
        let totalOnlineRange = 0;
        let totalCardRange = 0;
        let totalPriceRange = 0;
        let totalBalanceRange = 0;

        reports.forEach((r) => {
          totalOrdersRange += r.orderCount;
          totalAdvanceRange += r.advanceCollected;
          totalCashRange += r.cashAdvance || 0;
          totalOnlineRange += r.onlineAdvance || 0;
          totalCardRange += r.cardAdvance || 0;
          totalPriceRange += r.totalPrice;
          totalBalanceRange += r.remainingBalance;
        });

        const rowsHtml = reports.map((r) => {
          const formattedDate = new Date(r.date).toLocaleDateString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          return `
            <tr>
              <td><strong style="color:var(--text-primary); font-size:0.95rem;">${formattedDate}</strong> <br><small style="color:var(--text-muted);">${r.date}</small></td>
              <td><span class="balance-badge settled" style="font-size:0.85rem;"><i class="fa-solid fa-box"></i> ${r.orderCount} Orders</span></td>
              <td>
                <strong style="color:var(--accent-blue); font-size:0.95rem;">₹${r.advanceCollected.toFixed(2)}</strong>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.15rem;">
                  💵 Cash: ₹${(r.cashAdvance || 0).toFixed(0)} | 📱 Online: ₹${(r.onlineAdvance || 0).toFixed(0)} | 💳 Card: ₹${(r.cardAdvance || 0).toFixed(0)}
                </div>
              </td>
              <td><strong style="color:var(--text-primary); font-size:1rem;">₹${r.totalPrice.toFixed(2)}</strong></td>
              <td><strong style="color:${r.remainingBalance > 0 ? 'var(--accent-rose)' : 'var(--primary)'}; font-size:1rem;">${r.remainingBalance > 0 ? `₹${r.remainingBalance.toFixed(2)}` : 'Cleared'}</strong></td>
              <td class="text-right">
                <button class="btn btn-secondary btn-sm" onclick="App.filterByReportDate('${r.date}')">
                  <i class="fa-solid fa-filter"></i> View Orders
                </button>
              </td>
            </tr>
          `;
        }).join('');

        container.innerHTML = `
          <!-- Summary Banner for Date Range -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap:0.75rem; margin-bottom:1.25rem;">
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; padding:0.75rem 1rem;">
              <small style="color:var(--text-muted); font-weight:700; text-transform:uppercase; font-size:0.7rem;">Orders Logged</small>
              <div style="font-size:1.4rem; font-weight:800; color:var(--text-primary);">${totalOrdersRange}</div>
            </div>
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; padding:0.75rem 1rem;">
              <small style="color:var(--text-muted); font-weight:700; text-transform:uppercase; font-size:0.7rem;">Total Advance</small>
              <div style="font-size:1.3rem; font-weight:800; color:var(--accent-blue);">₹${totalAdvanceRange.toFixed(2)}</div>
              <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.2rem;">Cash: ₹${totalCashRange.toFixed(0)} | Online: ₹${totalOnlineRange.toFixed(0)} | Card: ₹${totalCardRange.toFixed(0)}</div>
            </div>
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; padding:0.75rem 1rem;">
              <small style="color:var(--text-muted); font-weight:700; text-transform:uppercase; font-size:0.7rem;">Total Sales Value</small>
              <div style="font-size:1.4rem; font-weight:800; color:var(--text-primary);">₹${totalPriceRange.toFixed(2)}</div>
            </div>
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; padding:0.75rem 1rem;">
              <small style="color:var(--text-muted); font-weight:700; text-transform:uppercase; font-size:0.7rem;">Balance Remaining</small>
              <div style="font-size:1.4rem; font-weight:800; color:${totalBalanceRange > 0 ? 'var(--accent-rose)' : 'var(--primary)'};">₹${totalBalanceRange.toFixed(2)}</div>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <span style="font-size:0.85rem; font-weight:700; color:var(--text-secondary);">Daily breakdown records (${reports.length} days):</span>
            <button class="btn btn-primary btn-sm" onclick="App.exportCsvReportRange()">
              <i class="fa-solid fa-file-csv"></i> Download Report CSV
            </button>
          </div>

          <div class="table-responsive">
            <table class="orders-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Orders Took</th>
                  <th>Advance Breakdown (₹)</th>
                  <th>Total Sales Value (₹)</th>
                  <th>Remaining Due (₹)</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        `;
      }
    } catch (err) {
      container.innerHTML = `<div class="auth-error-msg">Failed to load daily report: ${this.escapeHtml(err.message)}</div>`;
    }
  },

  async exportCsvReportRange() {
    try {
      this.showToast('Generating CSV report...', 'info');
      await API.downloadCsv('', this.statusFilter, this.reportStartDate, this.reportEndDate);
      this.showToast('CSV report downloaded successfully.', 'success');
    } catch (err) {
      this.showToast(err.message || 'Failed to download CSV report.', 'error');
    }
  },

  filterByReportDate(dateStr) {
    const dateInput = document.getElementById('dateFilter');
    const clearDateBtn = document.getElementById('clearDateBtn');
    if (dateInput) {
      dateInput.value = dateStr;
      this.selectedDate = dateStr;
      if (clearDateBtn) clearDateBtn.classList.remove('hidden');
      this.closeDailyReportModal();
      this.loadOrders();
      this.showToast(`Filtered dashboard to date: ${dateStr}`, 'info');
    }
  },

  closeDailyReportModal() {
    document.getElementById('dailyReportModal')?.classList.add('hidden');
  },

  openReadyModal() {
    const modal = document.getElementById('readyOrdersModal');
    const container = document.getElementById('readyModalList');

    if (!container) return;

    if (this.readyOrdersList.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:3rem; color:var(--text-muted);">
          <i class="fa-solid fa-circle-check" style="font-size:3rem; margin-bottom:1rem; color:var(--primary)"></i>
          <h3>No Orders Pending Pickup</h3>
          <p>All orders ready for pickup have been collected or marked completed!</p>
        </div>
      `;
    } else {
      container.innerHTML = this.readyOrdersList.map((order) => {
        const isCleared = order.isSettled || order.remainingBalance === 0;
        const remaining = order.remainingBalance || 0;
        const dueBadge = !isCleared && remaining > 0
          ? `<span class="balance-badge has-balance">Payment Due: ₹${remaining.toFixed(2)}</span>`
          : `<span class="balance-badge settled"><i class="fa-solid fa-check"></i> Cleared</span>`;

        let itemsFormatted = '';
        if (Array.isArray(order.items) && order.items.length > 0) {
          itemsFormatted = order.items.map((i) => `<strong>${this.escapeHtml(i.medicineName)}</strong> (x${i.quantity}) [${this.escapeHtml(i.supplier)}]`).join(', ');
        } else {
          itemsFormatted = `<strong>${this.escapeHtml(order.medicineName)}</strong> (x${order.quantity || 1}) [${this.escapeHtml(order.supplier || 'N/A')}]`;
        }

        return `
          <div class="ready-card-item">
            <div class="ready-card-left">
              <h4>${this.escapeHtml(order.customerName)} — <span style="font-size:0.85rem; font-weight:600;">${itemsFormatted}</span></h4>
              <p><i class="fa-solid fa-phone"></i> ${this.escapeHtml(order.phone)} | Staff: <strong>${this.escapeHtml(order.staffMember || 'Admin')}</strong></p>
              <div style="margin-top:0.4rem;">${dueBadge}</div>
            </div>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
              <a href="tel:${this.escapeHtml(order.phone)}" class="btn btn-secondary btn-sm">
                <i class="fa-solid fa-phone"></i> Call
              </a>
              ${!isCleared && remaining > 0 ? `
                <button class="btn btn-secondary btn-sm" onclick="App.promptSettlePayment('${order._id}', '${this.escapeHtml(order.customerName)}', ${remaining}); App.closeReadyModal();">
                  Clear Payment ₹
                </button>
              ` : ''}
              <button class="btn btn-primary btn-sm" onclick="App.promptMarkCompleted('${order._id}', '${this.escapeHtml(order.customerName)}'); App.closeReadyModal();">
                <i class="fa-solid fa-circle-check"></i> Mark Collected
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    if (modal) modal.classList.remove('hidden');
  },

  closeReadyModal() {
    document.getElementById('readyOrdersModal')?.classList.add('hidden');
  },

  renderOrders() {
    const tableBody = document.getElementById('ordersTableBody');
    const mobileCardsGrid = document.getElementById('mobileCardsGrid');
    const emptyState = document.getElementById('emptyState');

    if (this.orders.length === 0) {
      if (tableBody) tableBody.innerHTML = '';
      if (mobileCardsGrid) mobileCardsGrid.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    if (tableBody) {
      tableBody.innerHTML = this.orders.map((order) => this.renderTableRow(order)).join('');
    }

    if (mobileCardsGrid) {
      mobileCardsGrid.innerHTML = this.orders.map((order) => this.renderMobileCard(order)).join('');
    }
  },

  getPaymentModeIcon(mode) {
    if (mode === 'Online') return '📱 Online';
    if (mode === 'Card') return '💳 Card';
    return '💵 Cash';
  },

  renderTableRow(order) {
    const formattedPrice = order.totalPrice ? `₹${Number(order.totalPrice).toFixed(2)}` : '₹0.00';
    const formattedAdvance = order.advancePaid ? `₹${Number(order.advancePaid).toFixed(2)}` : '₹0.00';
    const modeBadge = this.getPaymentModeIcon(order.advancePaymentMode || 'Cash');
    const remaining = order.remainingBalance || 0;
    const formattedBalance = `₹${remaining.toFixed(2)}`;
    const createdDate = new Date(order.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const statusClass = this.getStatusClass(order.status);
    const isCleared = order.isSettled || remaining === 0;

    const balanceBadge = isCleared
      ? `<span class="balance-badge settled"><i class="fa-solid fa-check"></i> Cleared</span>`
      : `<span class="balance-badge has-balance"><i class="fa-solid fa-triangle-exclamation"></i> Due: ${formattedBalance}</span>`;

    let itemsHtml = '';
    if (Array.isArray(order.items) && order.items.length > 0) {
      itemsHtml = order.items.map((i) => `
        <div style="margin-bottom:0.25rem;">
          <span class="medicine-name">${this.escapeHtml(i.medicineName)} <span class="medicine-qty">(x${i.quantity})</span></span>
          <span style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-truck-field"></i> ${this.escapeHtml(i.supplier)}</span>
        </div>
      `).join('');
    } else {
      itemsHtml = `
        <div style="margin-bottom:0.25rem;">
          <span class="medicine-name">${this.escapeHtml(order.medicineName || 'N/A')} <span class="medicine-qty">(x${order.quantity || 1})</span></span>
          <span style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-truck-field"></i> ${this.escapeHtml(order.supplier || 'N/A')}</span>
        </div>
      `;
    }

    const staffBadge = `<div class="staff-badge"><i class="fa-solid fa-user-check"></i> Staff: ${this.escapeHtml(order.staffMember || 'Admin')}</div>`;

    return `
      <tr>
        <td>
          <span class="customer-name">${this.escapeHtml(order.customerName)}</span>
          <span class="customer-phone"><i class="fa-solid fa-phone"></i> ${this.escapeHtml(order.phone)}</span>
          ${staffBadge}
        </td>
        <td>
          ${itemsHtml}
        </td>
        <td>
          <div class="price-tag" style="font-size:0.95rem; font-weight:800;">${formattedPrice}</div>
          <div style="font-size:0.8rem; font-weight:700; color:var(--accent-blue); margin-top:0.15rem;">
            <i class="fa-solid fa-wallet"></i> Advance: ${formattedAdvance} <span style="font-size:0.7rem; padding:0.1rem 0.35rem; background:var(--bg-hover); border-radius:4px; margin-left:0.2rem; color:var(--text-primary); border:1px solid var(--border-color);">${modeBadge}</span>
          </div>
          <div style="margin-top:0.25rem;">${balanceBadge}</div>
        </td>
        <td>
          <select class="status-select-inline ${statusClass}" onchange="App.handleInlineStatusChange('${order._id}', this.value)">
            <option value="Requested" ${order.status === 'Requested' ? 'selected' : ''}>Requested</option>
            <option value="Ordered from Wholesaler" ${order.status === 'Ordered from Wholesaler' ? 'selected' : ''}>Ordered from Wholesaler</option>
            <option value="Received at Store" ${order.status === 'Received at Store' ? 'selected' : ''}>Received at Store</option>
            <option value="Ready for Pickup" ${order.status === 'Ready for Pickup' ? 'selected' : ''}>Ready for Pickup</option>
            <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td>
          <span style="font-size:0.8rem; color:var(--text-muted);">${createdDate}</span>
        </td>
        <td class="text-right">
          <div class="action-buttons">
            ${!isCleared ? `
              <button class="action-btn settle-btn" onclick="App.promptSettlePayment('${order._id}', '${this.escapeHtml(order.customerName)}', ${remaining})" title="Clear Remaining Payment">
                <i class="fa-solid fa-indian-rupee-sign"></i>
              </button>
            ` : ''}

            ${order.status !== 'Completed' ? `
              <button class="action-btn complete-btn" onclick="App.promptMarkCompleted('${order._id}', '${this.escapeHtml(order.customerName)}')" title="Mark as Completed">
                <i class="fa-solid fa-check-double"></i>
              </button>
            ` : ''}

            <button class="action-btn" onclick="App.openOrderModal('${order._id}')" title="Edit Order">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>

            <button class="action-btn delete-btn" onclick="App.promptDeleteOrder('${order._id}', '${this.escapeHtml(order.customerName)}')" title="Delete Order">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  renderMobileCard(order) {
    const formattedPrice = order.totalPrice ? `₹${Number(order.totalPrice).toFixed(2)}` : '₹0.00';
    const formattedAdvance = order.advancePaid ? `₹${Number(order.advancePaid).toFixed(2)}` : '₹0.00';
    const modeBadge = this.getPaymentModeIcon(order.advancePaymentMode || 'Cash');
    const remaining = order.remainingBalance || 0;
    const formattedBalance = `₹${remaining.toFixed(2)}`;
    const statusClass = this.getStatusClass(order.status);
    const isCleared = order.isSettled || remaining === 0;

    let itemsFormatted = '';
    if (Array.isArray(order.items) && order.items.length > 0) {
      itemsFormatted = order.items.map((i) => `<strong>${this.escapeHtml(i.medicineName)}</strong> (x${i.quantity}) [${this.escapeHtml(i.supplier)}]`).join('<br>');
    } else {
      itemsFormatted = `<strong>${this.escapeHtml(order.medicineName || 'N/A')}</strong> (x${order.quantity || 1}) [${this.escapeHtml(order.supplier || 'N/A')}]`;
    }

    return `
      <div class="mobile-order-card">
        <div class="mobile-card-top">
          <div>
            <span class="customer-name">${this.escapeHtml(order.customerName)}</span>
            <span class="customer-phone">${this.escapeHtml(order.phone)}</span>
            <div class="staff-badge"><i class="fa-solid fa-user-check"></i> Staff: ${this.escapeHtml(order.staffMember || 'Admin')}</div>
          </div>
          <select class="status-select-inline ${statusClass}" onchange="App.handleInlineStatusChange('${order._id}', this.value)">
            <option value="Requested" ${order.status === 'Requested' ? 'selected' : ''}>Requested</option>
            <option value="Ordered from Wholesaler" ${order.status === 'Ordered from Wholesaler' ? 'selected' : ''}>Ordered from Wholesaler</option>
            <option value="Received at Store" ${order.status === 'Received at Store' ? 'selected' : ''}>Received at Store</option>
            <option value="Ready for Pickup" ${order.status === 'Ready for Pickup' ? 'selected' : ''}>Ready for Pickup</option>
            <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </div>

        <div class="mobile-card-details">
          <div>
            <strong style="color:var(--text-muted); font-size:0.75rem; display:block;">MEDICINES & SUPPLIERS</strong>
            <span style="font-size:0.8rem;">${itemsFormatted}</span>
          </div>
          <div>
            <strong style="color:var(--text-muted); font-size:0.75rem; display:block;">PRICING (₹)</strong>
            <span style="font-weight:700;">Total: ${formattedPrice}</span>
            <span style="display:block; font-size:0.75rem; font-weight:700; color:var(--accent-blue)">Adv: ${formattedAdvance} (${modeBadge})</span>
            <span style="display:block; font-size:0.75rem; color:${!isCleared ? 'var(--accent-rose)' : 'var(--primary)'}">
              ${!isCleared ? `Due: ${formattedBalance}` : 'Cleared'}
            </span>
          </div>
        </div>

        <div class="mobile-card-actions">
          ${!isCleared ? `
            <button class="btn btn-secondary btn-sm" onclick="App.promptSettlePayment('${order._id}', '${this.escapeHtml(order.customerName)}', ${remaining})">
              Clear Payment
            </button>
          ` : ''}
          ${order.status !== 'Completed' ? `
            <button class="btn btn-primary btn-sm" onclick="App.promptMarkCompleted('${order._id}', '${this.escapeHtml(order.customerName)}')">
              Complete
            </button>
          ` : ''}
          <button class="btn btn-secondary btn-sm" onclick="App.openOrderModal('${order._id}')">
            Edit
          </button>
          <button class="btn btn-danger btn-sm" onclick="App.promptDeleteOrder('${order._id}', '${this.escapeHtml(order.customerName)}')">
            Delete
          </button>
        </div>
      </div>
    `;
  },

  async handleInlineStatusChange(orderId, newStatus) {
    try {
      await API.updateOrder(orderId, { status: newStatus });
      this.showToast(`Order status updated to "${newStatus}"`, 'success');
      this.loadOrders();
    } catch (err) {
      this.showToast(err.message || 'Failed to update order status.', 'error');
      this.loadOrders();
    }
  },

  getStatusClass(status) {
    switch (status) {
      case 'Requested': return 'status-requested';
      case 'Ordered from Wholesaler': return 'status-wholesaler';
      case 'Received at Store': return 'status-store';
      case 'Ready for Pickup': return 'status-pickup';
      case 'Completed': return 'status-completed';
      case 'Cancelled': return 'status-cancelled';
      default: return 'status-requested';
    }
  },

  openOrderModal(orderId = null) {
    const modal = document.getElementById('orderModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('orderForm');
    const itemsContainer = document.getElementById('itemsContainer');

    form.reset();
    document.getElementById('orderId').value = '';
    if (itemsContainer) itemsContainer.innerHTML = '';

    if (orderId) {
      const order = this.orders.find((o) => o._id === orderId);
      if (order) {
        modalTitle.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Order`;
        document.getElementById('orderId').value = order._id;
        document.getElementById('customerName').value = order.customerName || '';
        document.getElementById('phone').value = order.phone || '';
        document.getElementById('staffMember').value = order.staffMember || '';
        document.getElementById('totalPrice').value = order.totalPrice !== undefined && order.totalPrice !== null && order.totalPrice > 0 ? Number(order.totalPrice).toFixed(2) : '';
        document.getElementById('advancePaid').value = order.advancePaid !== undefined && order.advancePaid !== null && order.advancePaid > 0 ? Number(order.advancePaid).toFixed(2) : '';
        document.getElementById('advancePaymentMode').value = order.advancePaymentMode || 'Cash';
        document.getElementById('status').value = order.status || 'Requested';

        if (Array.isArray(order.items) && order.items.length > 0) {
          order.items.forEach((item) => {
            this.addMedicineItemRow(item.medicineName, item.quantity, item.supplier);
          });
        } else {
          this.addMedicineItemRow(order.medicineName, order.quantity, order.supplier);
        }
      }
    } else {
      modalTitle.innerHTML = `<i class="fa-solid fa-prescription"></i> Create New Order`;
      document.getElementById('staffMember').value = '';
      document.getElementById('customerName').value = '';
      document.getElementById('phone').value = '';
      document.getElementById('totalPrice').value = '';
      document.getElementById('advancePaid').value = '';
      document.getElementById('advancePaymentMode').value = 'Cash';
      this.addMedicineItemRow();
    }

    const total = parseFloat(document.getElementById('totalPrice').value) || 0;
    const advance = parseFloat(document.getElementById('advancePaid').value) || 0;
    const mode = document.getElementById('advancePaymentMode')?.value || 'Cash';
    const remaining = Math.max(0, total - advance);

    const advancePreviewElem = document.getElementById('advancePreview');
    const remainingPreviewElem = document.getElementById('remainingBalancePreview');

    if (advancePreviewElem) advancePreviewElem.textContent = `₹${advance.toFixed(2)} (${mode})`;
    if (remainingPreviewElem) remainingPreviewElem.textContent = `₹${remaining.toFixed(2)}`;

    modal.classList.remove('hidden');

    setTimeout(() => {
      const firstMedInput = itemsContainer?.querySelector('.item-medicine');
      if (firstMedInput) {
        firstMedInput.focus();
      } else {
        document.getElementById('customerName')?.focus();
      }
    }, 100);
  },

  closeOrderModal() {
    document.getElementById('orderModal')?.classList.add('hidden');
  },

  async handleFormSubmit() {
    const orderId = document.getElementById('orderId').value;
    const staffMember = document.getElementById('staffMember').value.trim();
    const customerName = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const rawPrice = document.getElementById('totalPrice').value;
    const rawAdvance = document.getElementById('advancePaid').value;
    const advancePaymentMode = document.getElementById('advancePaymentMode').value;
    const status = document.getElementById('status').value;

    const itemRows = Array.from(document.querySelectorAll('#itemsContainer .medicine-item-row'));
    const items = [];

    for (let i = 0; i < itemRows.length; i++) {
      const row = itemRows[i];
      const medInput = row.querySelector('.item-medicine');
      const qtyInput = row.querySelector('.item-qty');
      const supInput = row.querySelector('.item-supplier');

      const med = medInput ? medInput.value.trim() : '';
      const qty = qtyInput ? parseInt(qtyInput.value, 10) : 0;
      const sup = supInput ? supInput.value.trim() : '';

      if (!med) {
        this.showToast(`Medicine Name is required for Medicine #${i + 1}.`, 'error');
        if (medInput) medInput.focus();
        return;
      }

      if (!qty || isNaN(qty) || qty < 1) {
        this.showToast(`Quantity (min 1) is required for Medicine #${i + 1}.`, 'error');
        if (qtyInput) qtyInput.focus();
        return;
      }

      if (!sup) {
        this.showToast(`Wholesale Supplier is required for Medicine #${i + 1}.`, 'error');
        if (supInput) supInput.focus();
        return;
      }

      items.push({ medicineName: med, quantity: qty, supplier: sup });
      this.autoSaveToDatalist('supplierList', sup);
    }

    if (!customerName || !phone) {
      this.showToast('Customer Name and Phone Number are compulsory.', 'error');
      return;
    }

    if (!staffMember) {
      this.showToast('Staff Member placing the order is compulsory.', 'error');
      return;
    }

    this.autoSaveToDatalist('staffList', staffMember);

    const orderData = {
      customerName,
      phone,
      staffMember,
      items,
      totalPrice: rawPrice !== '' ? parseFloat(rawPrice) : 0,
      advancePaid: rawAdvance !== '' ? parseFloat(rawAdvance) : 0,
      advancePaymentMode,
      status,
    };

    const saveBtn = document.getElementById('saveOrderBtn');
    saveBtn.disabled = true;

    try {
      if (orderId) {
        await API.updateOrder(orderId, orderData);
        this.showToast('Order updated successfully.', 'success');
      } else {
        await API.createOrder(orderData);
        this.showToast('New order created successfully.', 'success');
      }

      this.closeOrderModal();
      this.loadOrders();
    } catch (err) {
      this.showToast(err.message || 'Failed to save order.', 'error');
    } finally {
      saveBtn.disabled = false;
    }
  },

  promptSettlePayment(id, customerName, amount) {
    this.openConfirmModal(
      'Clear Remaining Payment',
      `Clear the remaining balance of <strong>₹${amount.toFixed(2)}</strong> for customer <strong>${customerName}</strong>? <br><small style="color:var(--text-muted)">Note: Initial advance paid record will be preserved.</small>`,
      async () => {
        try {
          await API.settleOrder(id);
          this.showToast(`Payment cleared for ${customerName}.`, 'success');
          this.loadOrders();
        } catch (err) {
          this.showToast(err.message || 'Failed to clear payment.', 'error');
        }
      }
    );
  },

  promptMarkCompleted(id, customerName) {
    this.openConfirmModal(
      'Mark Order Completed',
      `Mark order for <strong>${customerName}</strong> as Completed? <br><small style="color:var(--text-muted)">Note: Completed orders will automatically expire and delete 7 days after completion.</small>`,
      async () => {
        try {
          await API.updateOrder(id, { status: 'Completed' });
          this.showToast(`Order marked as Completed. Auto-cleanup set for 7 days.`, 'success');
          this.loadOrders();
        } catch (err) {
          this.showToast(err.message || 'Failed to mark order completed.', 'error');
        }
      }
    );
  },

  promptDeleteOrder(id, customerName) {
    this.openConfirmModal(
      'Delete Order',
      `Are you sure you want to permanently delete the order for <strong>${customerName}</strong>? This action cannot be undone.`,
      async () => {
        try {
          await API.deleteOrder(id);
          this.showToast('Order permanently deleted.', 'info');
          this.loadOrders();
        } catch (err) {
          this.showToast(err.message || 'Failed to delete order.', 'error');
        }
      }
    );
  },

  openConfirmModal(title, message, onProceed) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').innerHTML = message;
    this.confirmCallback = onProceed;
    document.getElementById('confirmModal').classList.remove('hidden');
  },

  closeConfirmModal() {
    document.getElementById('confirmModal').classList.add('hidden');
    this.confirmCallback = null;
  },

  async exportCsv(date = '') {
    try {
      this.showToast('Generating CSV export in ₹...', 'info');
      await API.downloadCsv(date || this.selectedDate, this.statusFilter);
      this.showToast('CSV export downloaded successfully.', 'success');
    } catch (err) {
      this.showToast(err.message || 'Failed to download CSV.', 'error');
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-exclamation';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${iconClass} toast-icon"></i>
      <div class="toast-content">
        <div class="toast-title">${type.toUpperCase()}</div>
        <div class="toast-message">${this.escapeHtml(message)}</div>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
