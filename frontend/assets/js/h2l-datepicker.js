(function() {
    window.H2L = window.H2L || {};

    class TodoistDatepicker {
        constructor(wrapperElement, options = {}) {
            // Wrapper ID yerine doğrudan element alabilir (React ref uyumu için)
            this.wrapper = typeof wrapperElement === 'string' ? document.getElementById(wrapperElement) : wrapperElement;
            if (!this.wrapper) return;

            this.options = options;
            this.onChange = options.onChange || function() {};

            // HTML Yapısını Oluştur
            this.renderBaseHTML();

            // Element Referansları
            this.trigger = this.wrapper.querySelector('.td-trigger-btn');
            this.label = this.wrapper.querySelector('.td-label');
            this.iconHolder = this.wrapper.querySelector('.td-icon-holder');
            
            // State
            this.today = new Date();
            this.today.setHours(0,0,0,0);
            
            this.currentViewDate = new Date(this.today);
            
            // Başlangıç Değerleri (Varsa)
            this.selectedDate = options.defaultDate ? new Date(options.defaultDate) : null;
            this.selectedTime = options.defaultTime || null;
            this.selectedRepeat = options.defaultRepeat || null;

            this.months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
            this.daysShort = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
            this.daysLong = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

            this.activeMenu = null;

            this.init();
        }

        renderBaseHTML() {
            // Wrapper içine gerekli HTML'i basıyoruz
            // React tarafında sadece <div class="h2l-datepicker-wrapper"></div> olacak.
            this.wrapper.innerHTML = `
                <!-- TETİKLEYİCİ -->
                <div class="td-trigger-btn">
                    <span class="td-icon-holder">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/></svg>
                    </span>
                    <span class="td-label">Tarih</span>
                </div>
            `;
        }

        init() {
            this.createPopup();
            this.bindEvents();
            this.updateUI();
        }

        createPopup() {
            this.popup = document.createElement('div');
            this.popup.className = 'td-popup';
            // HTML içeriği demo dosyasındaki ile aynı, sadece SVG'leri inline tutuyoruz
            this.popup.innerHTML = `
                <ul class="td-shortcuts">
                    <li class="td-shortcut-item" data-action="today">
                        <div class="td-sc-left">
                            <div class="td-icon-box color-today" id="icon-today-dynamic"></div>
                            <span>Bugün</span>
                        </div>
                        <span class="td-sc-right">${this.getDayNameShort(this.today)}</span>
                    </li>
                    <li class="td-shortcut-item" data-action="tomorrow">
                        <div class="td-sc-left">
                            <div class="td-icon-box color-tomorrow">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6l5.25 3.15.75-1.23-4-2.37V7z" opacity="0"/><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                            </div>
                            <span>Yarın</span>
                        </div>
                        <span class="td-sc-right">${this.getDayNameShort(this.addDays(this.today, 1))}</span>
                    </li>
                    <li class="td-shortcut-item" data-action="next-week">
                        <div class="td-sc-left">
                            <div class="td-icon-box color-next">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H5V8h14v11z"/><path d="M12.02 17.64l3.96-3.96-1.41-1.42-1.55 1.56V10h-2v3.82l-1.55-1.56-1.42 1.42 3.97 3.96z"/></svg>
                            </div>
                            <span>Gelecek hafta</span>
                        </div>
                        <span class="td-sc-right">${this.formatDateShort(this.getNextDay(1))}</span>
                    </li>
                    <li class="td-shortcut-item" data-action="no-date" id="shortcut-no-date" style="display:none;">
                        <div class="td-sc-left">
                            <div class="td-icon-box color-none">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.59-13L12 10.59 8.41 7 7 8.41 10.59 12 7 15.59 8.41 17 12 13.41 15.59 17 17 15.59 13.41 12 17 8.41z"/></svg>
                            </div>
                            <span>Tarih yok</span>
                        </div>
                    </li>
                </ul>

                <div class="td-calendar">
                    <div class="td-cal-header">
                        <span class="td-month-label" id="cal-title"></span>
                        <div class="td-header-actions">
                            <div class="td-nav-btn" data-nav="-1" title="Önceki Ay"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></div>
                            <div class="td-nav-btn today-reset" title="Bugüne Dön">
                                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5" stroke-width="3" /></svg>
                            </div>
                            <div class="td-nav-btn" data-nav="1" title="Sonraki Ay"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></div>
                        </div>
                    </div>
                    <div class="td-grid">
                        ${this.daysShort.map(d => `<div class="td-day-head">${d}</div>`).join('')}
                    </div>
                    <div class="td-grid" id="cal-body"></div>
                </div>

                <div class="td-footer">
                    <button class="td-footer-btn" id="btn-time">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        <span class="lbl">Zaman</span>
                    </button>
                    <button class="td-footer-btn" id="btn-repeat">
                        <svg viewBox="0 0 24 24"><path d="M17 4v6l-2-2"/><path d="M7 20v-6l2 2"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 8l-2.74-2.74A9.75 9.75 0 0 1 12 3a9 9 0 0 1 9 9"/></svg>
                        <span class="lbl">Tekrar</span>
                    </button>
                </div>
            `;
            
            // Popup'ı wrapper'a değil document.body'ye ekleyip pozisyonlayacağız (Z-index sorunları için)
            // Ancak demo'da wrapper içine eklemiştik. React entegrasyonunda wrapper içine eklemek daha kolay yönetim sağlar.
            // Şimdilik wrapper içine ekliyoruz.
            this.wrapper.appendChild(this.popup);
            
            this.calBody = this.popup.querySelector('#cal-body');
            this.calTitle = this.popup.querySelector('#cal-title');
            this.noDateShortcut = this.popup.querySelector('#shortcut-no-date');
            this.btnTime = this.popup.querySelector('#btn-time');
            this.btnRepeat = this.popup.querySelector('#btn-repeat');

            this.popup.querySelector('#icon-today-dynamic').innerHTML = this.getDynamicCalendarIcon(this.today.getDate());
        }

        bindEvents() {
            this.trigger.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
            this.popup.addEventListener('click', (e) => e.stopPropagation());
            
            // Document click listener'ı dışarıdan yönetmek daha sağlıklı olabilir ama burada basit tutalım
            // React tarafında useEffect içinde cleanup yapılmalı.
            this.outsideClickHandler = (e) => {
                if(this.activeMenu && !this.activeMenu.contains(e.target)) {
                    this.closeMenu();
                }
                if(this.wrapper && !this.wrapper.contains(e.target) && !e.target.closest('.td-floating-menu')) {
                    this.close();
                }
            };
            document.addEventListener('click', this.outsideClickHandler);

            this.popup.querySelectorAll('.td-nav-btn[data-nav]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.currentViewDate.setMonth(this.currentViewDate.getMonth() + parseInt(btn.dataset.nav));
                    this.renderCalendar();
                });
            });

            this.popup.querySelector('.today-reset').addEventListener('click', () => {
                this.currentViewDate = new Date(this.today);
                this.renderCalendar();
            });

            this.popup.querySelectorAll('.td-shortcut-item').forEach(item => {
                item.addEventListener('click', () => this.handleShortcut(item.dataset.action));
            });

            this.btnTime.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openTimeMenu();
            });

            this.btnRepeat.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openRepeatMenu();
            });
        }

        destroy() {
            // React component unmount olduğunda temizlik
            document.removeEventListener('click', this.outsideClickHandler);
            if (this.popup) this.popup.remove();
            if (this.activeMenu) this.activeMenu.remove();
        }

        // ... (Diğer metodlar: toggle, open, close, createMenu, openTimeMenu, openRepeatMenu, vb. demo dosyasındaki ile aynı)
        // ... KODUN GERİ KALANI (renderCalendar, updateUI, getSmartDateLabel, getDynamicCalendarIcon, vb.) DEMO DOSYASINDAN KOPYALANACAK ...
        
        // NOT: updateUI içinde this.onChange çağrılmalı
        updateUI() {
            this.trigger.classList.remove('is-today', 'is-tomorrow', 'is-next-week', 'is-date');

            // ... (Demo'daki updateUI mantığı) ...

            if (!this.selectedDate) {
                this.label.textContent = "Tarih";
                this.iconHolder.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/></svg>`;
            } else {
                // ... (Demo'daki mantık) ...
                const result = this.getSmartDateLabel(this.selectedDate);
                let labelHTML = `<span>${result.text}</span>`;
                if (this.selectedTime) labelHTML += ` <span>${this.selectedTime}</span>`;
                if (this.selectedRepeat) {
                    labelHTML += `<svg class="td-repeat-icon" viewBox="0 0 24 24"><path d="M12 2v20M2 12h20" stroke-width="2" stroke-linecap="round"/></svg>`;
                }
                this.label.innerHTML = labelHTML;
                this.trigger.classList.add(result.class);
                this.iconHolder.innerHTML = result.icon;
            }
            
            if(this.popup.classList.contains('active')) {
                this.renderCalendar();
            }

            // REACT'e VERİ GÖNDERME
            if (this.onChange) {
                let isoDate = null;
                if (this.selectedDate) {
                    const y = this.selectedDate.getFullYear();
                    const m = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
                    const d = String(this.selectedDate.getDate()).padStart(2, '0');
                    isoDate = `${y}-${m}-${d}`;
                }
                this.onChange({
                    date: isoDate,
                    time: this.selectedTime,
                    repeat: this.selectedRepeat
                });
            }
        }

        // ... (Helper fonksiyonlar: getSmartDateLabel, getDynamicCalendarIcon, addDays, getNextDay, isSameDay, getDayNameShort, formatDateShort, getMonday) ...
        // ... KODUN GERİ KALANI DEMO DOSYASINDAN AYNEN ALINACAK ...
        
        // --- EKSİK METODLARI BURAYA EKLEYELİM (Demo'dan) ---
        toggle() { this.popup.classList.contains('active') ? this.close() : this.open(); }
        open() {
            this.popup.classList.add('active');
            this.renderCalendar();
            this.noDateShortcut.style.display = this.selectedDate ? 'flex' : 'none';
        }
        close() {
            this.popup.classList.remove('active');
            this.closeMenu();
        }
        closeMenu() {
            if(this.activeMenu) {
                this.activeMenu.remove();
                this.activeMenu = null;
            }
        }
        createMenu(triggerEl) {
            this.closeMenu();
            const menu = document.createElement('div');
            menu.className = 'td-floating-menu active';
            document.body.appendChild(menu);
            this.activeMenu = menu;
            const rect = triggerEl.getBoundingClientRect();
            menu.style.position = 'absolute';
            menu.style.left = rect.left + 'px';
            menu.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
            return menu;
        }
        openTimeMenu() { /* Demo'daki kod */ }
        openRepeatMenu() { /* Demo'daki kod */ }
        handleShortcut(action) { /* Demo'daki kod */ }
        selectDate(date) { this.selectedDate = date; this.updateUI(); }
        renderCalendar() { /* Demo'daki güncel renderCalendar kodu */ }
        getSmartDateLabel(date) { /* Demo'daki güncel kod */ }
        getDynamicCalendarIcon(dayNum) { /* Demo'daki güncel kod */ }
        addDays(d, n) { const z=new Date(d); z.setDate(z.getDate()+n); return z; }
        getNextDay(dayIdx) { const d=new Date(); d.setDate(d.getDate() + (dayIdx + 7 - d.getDay()) % 7); if(d<=new Date()) d.setDate(d.getDate()+7); return d; }
        isSameDay(a, b) { return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
        getDayNameShort(d) { return this.daysShort[(d.getDay()+6)%7]; }
        formatDateShort(d) { return `${d.getDate()} ${this.months[d.getMonth()].substring(0,3)}`; }
        getMonday(d) { d = new Date(d); var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6 : 1); return new Date(d.setDate(diff)); }
    }

    // Export to global
    window.H2L.TodoistDatepicker = TodoistDatepicker;
})();